export const getCourseCategoryRelationKey = (category) => {
    const categoryId = category?._id?.toString?.() || String(category?._id || "");
    const moduleId = category?.moduleId?._id?.toString?.()
        || category?.moduleId?.toString?.()
        || String(category?.moduleId || "");
    return {
        explicit: `id:${categoryId}`,
        legacy: `legacy:${moduleId}:${category?.name || ""}`,
    };
};

export const getCourseCategoryUsageFilter = (category) => ({
    $or: [
        { courseCategoryId: category._id },
        {
            courseCategoryId: null,
            moduleId: category.moduleId,
            category: category.name,
        },
    ],
});
