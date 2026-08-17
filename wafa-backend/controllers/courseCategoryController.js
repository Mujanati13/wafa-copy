import asyncHandler from "../handlers/asyncHandler.js";
import CourseCategory from "../models/courseCategoryModel.js";
import ExamCourse from "../models/examCourseModel.js";

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

        // Count all categories in one grouped query instead of one query per row.
        const moduleIds = [...new Map(
            categories
                .map(category => category.moduleId?._id)
                .filter(Boolean)
                .map(id => [id.toString(), id])
        ).values()];
        const categoryNames = [...new Set(categories.map(category => category.name))];
        const groupedCounts = moduleIds.length > 0 && categoryNames.length > 0
            ? await ExamCourse.aggregate([
                {
                    $match: {
                        moduleId: { $in: moduleIds },
                        category: { $in: categoryNames }
                    }
                },
                {
                    $group: {
                        _id: { moduleId: "$moduleId", category: "$category" },
                        count: { $sum: 1 }
                    }
                }
            ])
            : [];
        const countByCategory = new Map(
            groupedCounts.map(item => [
                `${item._id.moduleId.toString()}:${item._id.category}`,
                item.count
            ])
        );

        const categoriesWithCounts = categories.map(category => ({
            ...category,
            examCourseCount: countByCategory.get(
                `${category.moduleId?._id?.toString()}:${category.name}`
            ) || 0
        }));

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

        // Check if there are exam courses using this category
        const courseCount = await ExamCourse.countDocuments({
            category: category.name,
            moduleId: category.moduleId
        });

        if (courseCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Impossible de supprimer: ${courseCount} cours utilisent cette catégorie`
            });
        }

        await CourseCategory.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Catégorie supprimée avec succès"
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
