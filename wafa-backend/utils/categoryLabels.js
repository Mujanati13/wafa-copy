export const DEFAULT_CATEGORY_LABELS = Object.freeze({
    examByYears: "Exam par years",
    examByCourses: "Exam par courses",
    qcmBank: "QCM banque",
});

const ALLOWED_KEYS = new Set(Object.keys(DEFAULT_CATEGORY_LABELS));

export class CategoryLabelsError extends Error {
    constructor(message) {
        super(message);
        this.name = "CategoryLabelsError";
        this.statusCode = 422;
    }
}

export const validateCategoryLabelPatch = (labels) => {
    if (!labels || typeof labels !== "object" || Array.isArray(labels)) {
        throw new CategoryLabelsError("Les libellés de catégories sont invalides.");
    }

    const entries = Object.entries(labels);
    if (entries.length === 0) {
        throw new CategoryLabelsError("Au moins un libellé de catégorie est requis.");
    }

    return entries.reduce((result, [key, value]) => {
        if (!ALLOWED_KEYS.has(key)) {
            throw new CategoryLabelsError("Type de catégorie inconnu: " + key + ".");
        }

        const label = String(value ?? "").trim();
        if (label.length < 2 || label.length > 60) {
            throw new CategoryLabelsError("Chaque libellé doit contenir entre 2 et 60 caractères.");
        }

        result[key] = label;
        return result;
    }, {});
};
