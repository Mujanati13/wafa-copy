import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { courseCategoryController } from "../controllers/courseCategoryController.js";
import CourseCategory from "../models/courseCategoryModel.js";
import ExamCourse from "../models/examCourseModel.js";
import Module from "../models/moduleModel.js";
import {
    getCourseCategoryRelationKey,
    getCourseCategoryUsageFilter,
} from "../utils/courseCategoryRelations.js";

const createResponse = () => ({
    statusCode: 200,
    payload: null,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(payload) {
        this.payload = payload;
        return this;
    },
});

test("builds stable explicit and legacy relationship keys", () => {
    const categoryId = new mongoose.Types.ObjectId();
    const moduleId = new mongoose.Types.ObjectId();
    const keys = getCourseCategoryRelationKey({
        _id: categoryId,
        moduleId: { _id: moduleId },
        name: "Cardiologie",
    });

    assert.deepEqual(keys, {
        explicit: `id:${categoryId}`,
        legacy: `legacy:${moduleId}:Cardiologie`,
    });
});

test("usage filter prefers explicit IDs and supports unassigned legacy courses", () => {
    const categoryId = new mongoose.Types.ObjectId();
    const moduleId = new mongoose.Types.ObjectId();
    assert.deepEqual(getCourseCategoryUsageFilter({
        _id: categoryId,
        moduleId,
        name: "Neurologie",
    }), {
        $or: [
            { courseCategoryId: categoryId },
            {
                courseCategoryId: null,
                moduleId,
                category: "Neurologie",
            },
        ],
    });
});

test("deletes an orphan category and detaches stale explicit IDs", { concurrency: false }, async () => {
    const category = {
        _id: new mongoose.Types.ObjectId(),
        moduleId: new mongoose.Types.ObjectId(),
        name: "Ancienne catégorie",
    };
    const originals = {
        findById: CourseCategory.findById,
        findByIdAndDelete: CourseCategory.findByIdAndDelete,
        moduleExists: Module.exists,
        courseCount: ExamCourse.countDocuments,
        courseUpdate: ExamCourse.updateMany,
    };
    let detachedFilter;
    let deletedId;

    try {
        CourseCategory.findById = async () => category;
        CourseCategory.findByIdAndDelete = async (id) => { deletedId = id; };
        Module.exists = async () => null;
        ExamCourse.countDocuments = async () => {
            throw new Error("Orphan courses must not block category cleanup");
        };
        ExamCourse.updateMany = async (filter) => { detachedFilter = filter; };

        const res = createResponse();
        await courseCategoryController.delete({ params: { id: category._id.toString() } }, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.payload.message, "Catégorie orpheline supprimée avec succès");
        assert.deepEqual(detachedFilter, { courseCategoryId: category._id });
        assert.equal(deletedId, category._id.toString());
    } finally {
        CourseCategory.findById = originals.findById;
        CourseCategory.findByIdAndDelete = originals.findByIdAndDelete;
        Module.exists = originals.moduleExists;
        ExamCourse.countDocuments = originals.courseCount;
        ExamCourse.updateMany = originals.courseUpdate;
    }
});

test("still blocks deletion when a live module category has a real course", { concurrency: false }, async () => {
    const category = {
        _id: new mongoose.Types.ObjectId(),
        moduleId: new mongoose.Types.ObjectId(),
        name: "Cardiologie",
    };
    const originals = {
        findById: CourseCategory.findById,
        findByIdAndDelete: CourseCategory.findByIdAndDelete,
        moduleExists: Module.exists,
        courseCount: ExamCourse.countDocuments,
    };
    let deleted = false;

    try {
        CourseCategory.findById = async () => category;
        CourseCategory.findByIdAndDelete = async () => { deleted = true; };
        Module.exists = async () => ({ _id: category.moduleId });
        ExamCourse.countDocuments = async () => 1;

        const res = createResponse();
        await courseCategoryController.delete({ params: { id: category._id.toString() } }, res);

        assert.equal(res.statusCode, 400);
        assert.match(res.payload.message, /1 cours utilisent cette catégorie/);
        assert.equal(deleted, false);
    } finally {
        CourseCategory.findById = originals.findById;
        CourseCategory.findByIdAndDelete = originals.findByIdAndDelete;
        Module.exists = originals.moduleExists;
        ExamCourse.countDocuments = originals.courseCount;
    }
});
