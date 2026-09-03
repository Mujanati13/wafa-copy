import asyncHandler from "../handlers/asyncHandler.js";
import CourseCategory from "../models/courseCategoryModel.js";
import ExamCourse from "../models/examCourseModel.js";
import Module from "../models/moduleModel.js";
import {
    getCourseCategoryRelationKey,
    getCourseCategoryUsageFilter,
} from "../utils/courseCategoryRelations.js";

export const courseCategoryController = {
    // Create a new category (without creating exam courses)
    create: asyncHandler(async (req, res) => {
        const { name, moduleId, imageUrl, description, color } = req.body;

        if (!name || !moduleId) {
            return res.status(400).json({
                success: false,
                message: "Le nom et le module sont requis"
            });
        }

        // Check if category with same name exists for this module
        const existing = await CourseCategory.exists({ name, moduleId });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Une catégorie avec ce nom existe déjà pour ce module"
            });
        }

        const newCategory = await CourseCategory.create({
            name,
            moduleId,
            imageUrl: imageUrl || "",
            description: description || "",
            color: color || "#3b82f6"
        });

        await newCategory.populate("moduleId", "name semester");

        res.status(201).json({
            success: true,
            data: newCategory,
            message: "Catégorie créée avec succès"
        });
    }),

    // Get all categories with optional filters
    getAll: asyncHandler(async (req, res) => {
        const { moduleId, status, search } = req.query;

        const filter = {};
        if (moduleId) filter.moduleId = moduleId;
        if (status) filter.status = status;
        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }

        const categories = await CourseCategory.find(filter)
            .populate("moduleId", "name semester")
            .sort({ createdAt: -1 })
            .lean();

        // Count explicit category IDs and legacy name/module relationships in one
        // query. Categories whose module was deleted are intentionally considered
        // orphaned and show zero usable courses.
        const categoryIds = categories.map(category => category._id);
        const moduleIds = [...new Map(
            categories
                .map(category => category.moduleId?._id)
                .filter(Boolean)
                .map(id => [id.toString(), id])
        ).values()];
        const categoryNames = [...new Set(categories.map(category => category.name))];
        const groupedCounts = categoryIds.length > 0
            ? await ExamCourse.aggregate([
                {
                    $match: {
                        $or: [
                            { courseCategoryId: { $in: categoryIds } },
                            {
                                courseCategoryId: null,
                                moduleId: { $in: moduleIds },
                                category: { $in: categoryNames },
                            },
                        ],
                    }
                },
                {
                    $project: {
                        relationKey: {
                            $cond: [
                                { $ne: [{ $ifNull: ["$courseCategoryId", null] }, null] },
                                { $concat: ["id:", { $toString: "$courseCategoryId" }] },
                                {
                                    $concat: [
                                        "legacy:",
                                        { $toString: "$moduleId" },
                                        ":",
                                        "$category",
                                    ],
                                },
                            ],
                        },
                    },
                },
                {
                    $group: {
                        _id: "$relationKey",
                        count: { $sum: 1 }
                    }
                }
            ])
            : [];
        const countByCategory = new Map(
            groupedCounts.map(item => [
                item._id,
                item.count
            ])
        );

        const categoriesWithCounts = categories.map((category) => {
            const moduleExists = Boolean(category.moduleId?._id);
            const keys = getCourseCategoryRelationKey(category);
            return {
                ...category,
                isOrphaned: !moduleExists,
                examCourseCount: moduleExists
                    ? (countByCategory.get(keys.explicit) || 0) + (countByCategory.get(keys.legacy) || 0)
                    : 0,
            };
        });

        res.status(200).json({
            success: true,
            data: categoriesWithCounts
        });
    }),

    // Get category by ID
    getById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const category = await CourseCategory.findById(id)
            .populate("moduleId", "name semester")
            .lean();

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Catégorie non trouvée"
            });
        }

        // Get exam courses in this category
        const examCourses = await ExamCourse.find({
            category: category.name,
            moduleId: category.moduleId._id
        }).select("name status totalQuestions").lean();

        res.status(200).json({
            success: true,
            data: {
                ...category,
                examCourses
            }
        });
    }),

    // Get categories by module
    getByModuleId: asyncHandler(async (req, res) => {
        const { moduleId } = req.params;

        const categories = await CourseCategory.find({ moduleId })
            .populate("moduleId", "name semester")
            .sort({ name: 1 })
            .lean();

        res.status(200).json({
            success: true,
            data: categories
        });
    }),

    // Update category
    update: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { name, moduleId, imageUrl, description, color, status } = req.body;

        const category = await CourseCategory.findById(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Catégorie non trouvée"
            });
        }

        // If name is changing, check for duplicates
        if (name && name !== category.name) {
            const existing = await CourseCategory.findOne({ 
                name, 
                moduleId: moduleId || category.moduleId,
                _id: { $ne: id }
            });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: "Une catégorie avec ce nom existe déjà pour ce module"
                });
            }

            // Update the category name in all related exam courses
            await ExamCourse.updateMany(
                { category: category.name, moduleId: category.moduleId },
                { category: name }
            );
        }

        const updated = await CourseCategory.findByIdAndUpdate(
            id,
            { name, moduleId, imageUrl, description, color, status },
            { new: true, runValidators: true }
        ).populate("moduleId", "name semester");

        res.status(200).json({
            success: true,
            data: updated,
            message: "Catégorie mise à jour avec succès"
        });
    }),

    // Delete category
    delete: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const category = await CourseCategory.findById(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Catégorie non trouvée"
            });
        }

        const moduleExists = category.moduleId
            ? Boolean(await Module.exists({ _id: category.moduleId }))
            : false;
        const courseCount = moduleExists
            ? await ExamCourse.countDocuments(getCourseCategoryUsageFilter(category))
            : 0;

        if (courseCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Impossible de supprimer: ${courseCount} cours utilisent cette catégorie`
            });
        }

        if (!moduleExists) {
            await ExamCourse.updateMany(
                { courseCategoryId: category._id },
                { $unset: { courseCategoryId: 1 } }
            );
        }
        await CourseCategory.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: moduleExists
                ? "Catégorie supprimée avec succès"
                : "Catégorie orpheline supprimée avec succès"
        });
    }),

    // Get distinct category names for a module (for dropdowns)
    getCategoryNames: asyncHandler(async (req, res) => {
        const { moduleId } = req.params;

        const categories = await CourseCategory.distinct("name", { moduleId, status: "active" });
        categories.sort((left, right) => left.localeCompare(right));

        res.status(200).json({
            success: true,
            data: categories
        });
    })
};
