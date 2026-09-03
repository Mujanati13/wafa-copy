import CourseCategory from "../models/courseCategoryModel.js";
import { normalizeImportText } from "../utils/courseImport.js";

export class CourseCategoryImportError extends Error {
    constructor(categoryName, message, cause) {
        super(message, { cause });
        this.name = "CourseCategoryImportError";
        this.categoryName = categoryName;
    }
}

export const findOrCreateCourseImportCategories = async ({
    moduleId,
    categoryNames,
    categoryModel = CourseCategory,
}) => {
    const uniqueNames = new Map();
    categoryNames.forEach((name) => {
        const trimmedName = String(name || "").trim();
        const key = normalizeImportText(trimmedName);
        if (key && !uniqueNames.has(key)) uniqueNames.set(key, trimmedName);
    });

    if (uniqueNames.size === 0) {
        return { categoriesByKey: new Map(), createdNames: [] };
    }

    const existingCategories = await categoryModel.find({ moduleId })
        .select("_id name moduleId status")
        .lean();
    const categoriesByKey = new Map(
        existingCategories.map((category) => [normalizeImportText(category.name), category])
    );
    const createdNames = [];

    for (const [key, name] of uniqueNames) {
        if (categoriesByKey.has(key)) continue;

        try {
            const result = await categoryModel.findOneAndUpdate(
                { moduleId, name },
                {
                    $setOnInsert: {
                        moduleId,
                        name,
                        imageUrl: "",
                        description: "",
                        color: "#3b82f6",
                        status: "active",
                    },
                },
                {
                    upsert: true,
                    new: true,
                    runValidators: true,
                    setDefaultsOnInsert: true,
                    includeResultMetadata: true,
                }
            );
            const category = result?.value;
            if (!category?._id) {
                throw new Error("La catégorie créée n'a pas pu être relue.");
            }
            categoriesByKey.set(key, category);
            if (!result.lastErrorObject?.updatedExisting) createdNames.push(category.name);
        } catch (error) {
            const duplicateHint = error?.code === 11000
                ? "Une catégorie portant ce nom existe déjà avec une configuration incompatible."
                : "La catégorie n'a pas pu être enregistrée dans la base de données.";
            throw new CourseCategoryImportError(name, duplicateHint, error);
        }
    }

    return { categoriesByKey, createdNames };
};
