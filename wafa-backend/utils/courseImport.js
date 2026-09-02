const HEADER_ALIASES = {
    semester: ["semester", "semestre"],
    module: ["module"],
    category: ["category", "categorie"],
    lessonNumber: [
        "lesson number",
        "lesson no",
        "num lesson",
        "numero de lecon",
        "numero lecon",
        "num lecon",
        "n lecon",
    ],
    lessonName: ["lesson name", "nom de la lecon", "nom lecon", "cours", "nom du cours"],
};

export const MAX_COURSE_IMPORT_ROWS = 2000;

export const normalizeImportText = (value = "") => String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const headerFieldByAlias = new Map(
    Object.entries(HEADER_ALIASES).flatMap(([field, aliases]) => (
        aliases.map(alias => [normalizeImportText(alias), field])
    ))
);

export const resolveCourseImportHeaders = (headers = []) => {
    const resolved = {};
    headers.forEach((header) => {
        const field = headerFieldByAlias.get(normalizeImportText(header));
        if (field && !resolved[field]) resolved[field] = header;
    });
    return resolved;
};

export const normalizeSemester = (value = "") => {
    const normalized = normalizeImportText(value).replace(/\s+/g, "");
    const match = normalized.match(/^(?:s|semestre)?(10|[1-9])$/);
    return match ? `S${match[1]}` : "";
};

export const normalizeLessonNumber = (value = "") => {
    const raw = String(value).trim();
    if (!raw) return "";
    const normalized = raw.replace(/\s+/g, "").toUpperCase();
    if (/^\d+$/.test(normalized)) return `L${Number(normalized)}`;
    if (/^L\d+$/.test(normalized)) return `L${Number(normalized.slice(1))}`;
    return normalized;
};

const getCell = (row, sourceHeader) => sourceHeader ? row[sourceHeader] : "";

export const mapCourseImportRows = (rows = [], headers = []) => {
    const headerMap = resolveCourseImportHeaders(headers);
    const requiredFields = ["semester", "module", "lessonNumber", "lessonName"];
    const missingHeaders = requiredFields.filter(field => !headerMap[field]);

    if (missingHeaders.length > 0) {
        return { headerMap, missingHeaders, records: [] };
    }

    const records = rows.map((row, index) => ({
        rowNumber: index + 2,
        semester: normalizeSemester(getCell(row, headerMap.semester)),
        semesterSource: String(getCell(row, headerMap.semester) ?? "").trim(),
        moduleName: String(getCell(row, headerMap.module) ?? "").trim(),
        category: String(getCell(row, headerMap.category) ?? "").trim(),
        lessonNumber: normalizeLessonNumber(getCell(row, headerMap.lessonNumber)),
        lessonName: String(getCell(row, headerMap.lessonName) ?? "").trim(),
    }));

    return { headerMap, missingHeaders, records };
};

export const validateCourseImportRecord = (record) => {
    const errors = [];
    if (!record.semester) {
        errors.push({ field: "Semestre", reason: `Semestre invalide: ${record.semesterSource || "vide"}` });
    }
    if (!record.moduleName) errors.push({ field: "Module", reason: "Le module est requis" });
    if (!record.lessonNumber) errors.push({ field: "Numéro de leçon", reason: "Le numéro de leçon est requis" });
    if (record.lessonNumber.length > 30) errors.push({ field: "Numéro de leçon", reason: "30 caractères maximum" });
    if (!record.lessonName) errors.push({ field: "Nom de la leçon", reason: "Le nom de la leçon est requis" });
    if (record.lessonName.length > 200) errors.push({ field: "Nom de la leçon", reason: "200 caractères maximum" });
    if (record.category.length > 120) errors.push({ field: "Catégorie", reason: "120 caractères maximum" });
    return errors;
};
