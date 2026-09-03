import dotenv from "dotenv";
import mongoose from "mongoose";
import CourseCategory from "../models/courseCategoryModel.js";

dotenv.config();

const indexMatches = (index, expectedKeys) => {
    const entries = Object.entries(index.key || {});
    return entries.length === expectedKeys.length
        && expectedKeys.every(([field, direction], position) => (
            entries[position]?.[0] === field && entries[position]?.[1] === direction
        ));
};

const migrateCourseCategoryIndex = async () => {
    if (!process.env.MONGO_URL) {
        throw new Error("MONGO_URL is required to migrate course category indexes.");
    }

    await mongoose.connect(process.env.MONGO_URL, { autoIndex: false });
    try {
        const duplicate = await CourseCategory.aggregate([
            { $group: { _id: { moduleId: "$moduleId", name: "$name" }, count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } },
            { $limit: 1 },
        ]);
        if (duplicate.length > 0) {
            throw new Error(
                `Duplicate category data must be resolved first: module ${duplicate[0]._id.moduleId}, category "${duplicate[0]._id.name}".`
            );
        }

        const indexes = await CourseCategory.collection.indexes();
        const globalNameIndex = indexes.find(index => index.unique && indexMatches(index, [["name", 1]]));
        const moduleNameIndex = indexes.find(index => indexMatches(index, [["moduleId", 1], ["name", 1]]));

        if (globalNameIndex) {
            await CourseCategory.collection.dropIndex(globalNameIndex.name);
            console.log(`Dropped obsolete global category index: ${globalNameIndex.name}`);
        }
        if (moduleNameIndex && !moduleNameIndex.unique) {
            await CourseCategory.collection.dropIndex(moduleNameIndex.name);
            console.log(`Dropped obsolete non-unique category index: ${moduleNameIndex.name}`);
        }

        await CourseCategory.collection.createIndex(
            { moduleId: 1, name: 1 },
            { unique: true, name: "moduleId_1_name_1" }
        );
        console.log("Course categories are now unique per module.");
    } finally {
        await mongoose.disconnect();
    }
};

migrateCourseCategoryIndex().catch((error) => {
    console.error("Course category index migration failed:", error.message);
    process.exitCode = 1;
});
