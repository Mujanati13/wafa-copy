import test from "node:test";
import assert from "node:assert/strict";
import {
    CourseCategoryImportError,
    findOrCreateCourseImportCategories,
} from "../services/courseCategoryImportService.js";

const buildCategoryModel = ({ existing = [], upsert } = {}) => ({
    find: () => ({
        select: () => ({
            lean: async () => existing,
        }),
    }),
    findOneAndUpdate: upsert || (async (filter, update) => ({
        value: { _id: `category-${filter.name}`, ...update.$setOnInsert },
        lastErrorObject: { updatedExisting: false },
    })),
});

test("reuses an existing category with equivalent case and accents", async () => {
    const existing = { _id: "category-1", name: "Biochimie métabolique", moduleId: "module-1" };
    let upsertCalls = 0;
    const categoryModel = buildCategoryModel({
        existing: [existing],
        upsert: async () => {
            upsertCalls += 1;
            return null;
        },
    });

    const result = await findOrCreateCourseImportCategories({
        moduleId: "module-1",
        categoryNames: ["BIOCHIMIE METABOLIQUE"],
        categoryModel,
    });

    assert.equal(result.categoriesByKey.get("biochimie metabolique")._id, "category-1");
    assert.deepEqual(result.createdNames, []);
    assert.equal(upsertCalls, 0);
});

test("creates every missing category once and returns its id", async () => {
    const calls = [];
    const categoryModel = buildCategoryModel({
        upsert: async (filter, update, options) => {
            calls.push({ filter, update, options });
            return {
                value: { _id: `category-${calls.length}`, ...update.$setOnInsert },
                lastErrorObject: { updatedExisting: false },
            };
        },
    });

    const result = await findOrCreateCourseImportCategories({
        moduleId: "module-1",
        categoryNames: ["Rhumatologie", " rhumatologie ", "Neurologie"],
        categoryModel,
    });

    assert.equal(calls.length, 2);
    assert.equal(result.categoriesByKey.get("rhumatologie")._id, "category-1");
    assert.equal(result.categoriesByKey.get("neurologie")._id, "category-2");
    assert.deepEqual(result.createdNames, ["Rhumatologie", "Neurologie"]);
});

test("returns a category-specific error when persistence fails", async () => {
    const categoryModel = buildCategoryModel({
        upsert: async () => {
            const error = new Error("duplicate");
            error.code = 11000;
            throw error;
        },
    });

    await assert.rejects(
        findOrCreateCourseImportCategories({
            moduleId: "module-1",
            categoryNames: ["Cardiologie"],
            categoryModel,
        }),
        (error) => error instanceof CourseCategoryImportError
            && error.categoryName === "Cardiologie"
            && error.cause.code === 11000
    );
});
