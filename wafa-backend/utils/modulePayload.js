const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const GRADIENT_DIRECTIONS = new Set(["to-br", "to-tr", "to-bl", "to-tl", "to-r", "to-l", "to-b", "to-t"]);
const DIFFICULTIES = new Set(["QE", "easy", "medium", "hard"]);
const CONTENT_TYPES = new Set(["url", "text"]);
const CATEGORIES = new Set(["Exam par years", "Exam par courses", "Résumé et cours", "QCM banque"]);
const SEMESTERS = new Set(["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", ""]);
const SAFE_COLOR = /^(?:#(?:[0-9a-f]{3}|[0-9a-f]{6})|[a-z]{3,20})$/i;

const TEXT_FIELDS = [
    "imageUrl",
    "infoText",
    "helpContent",
    "helpImage",
    "helpPdf",
    "textContent",
];

export class ModulePayloadError extends Error {
    constructor(field, message) {
        super(message);
        this.name = "ModulePayloadError";
        this.field = field;
        this.statusCode = 422;
    }
}

const parseBoolean = (value) => value === true || value === "true" || value === 1 || value === "1";

const parseColor = (value, field, { allowEmpty = false } = {}) => {
    const color = String(value ?? "").trim();
    if (allowEmpty && color === "") return "";
    if (!SAFE_COLOR.test(color)) {
        throw new ModulePayloadError(field, `${field} doit être une couleur CSS valide.`);
    }
    return color;
};

const parseEnum = (value, field, allowedValues) => {
    const normalized = String(value ?? "").trim();
    if (!allowedValues.has(normalized)) {
        throw new ModulePayloadError(field, `Valeur invalide pour ${field}.`);
    }
    return normalized;
};

const parseCourseNames = (value) => {
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    if (value === undefined || value === null || value === "") return [];

    const rawValue = String(value).trim();
    if (rawValue.startsWith("[")) {
        try {
            const parsed = JSON.parse(rawValue);
            if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
            throw new ModulePayloadError("courseNames", "La liste des cours est invalide.");
        } catch {
            throw new ModulePayloadError("courseNames", "La liste des cours est invalide.");
        }
    }

    return rawValue.split(",").map((item) => item.trim()).filter(Boolean);
};

export const buildModulePayload = (body = {}, { partial = false } = {}) => {
    const payload = {};

    if (hasOwn(body, "name")) {
        const name = String(body.name ?? "").trim();
        if (name.length < 2) throw new ModulePayloadError("name", "Le nom du module est requis.");
        payload.name = name;
    }

    if (hasOwn(body, "semester")) payload.semester = parseEnum(body.semester, "semester", SEMESTERS);
    if (hasOwn(body, "availableInAllSemesters")) payload.availableInAllSemesters = parseBoolean(body.availableInAllSemesters);
    if (hasOwn(body, "color")) payload.color = parseColor(body.color, "color");
    if (hasOwn(body, "gradientColor")) payload.gradientColor = parseColor(body.gradientColor, "gradientColor", { allowEmpty: true });
    if (hasOwn(body, "gradientDirection")) payload.gradientDirection = parseEnum(body.gradientDirection, "gradientDirection", GRADIENT_DIRECTIONS);
    if (hasOwn(body, "difficulty")) payload.difficulty = parseEnum(body.difficulty, "difficulty", DIFFICULTIES);
    if (hasOwn(body, "contentType")) payload.contentType = parseEnum(body.contentType, "contentType", CONTENT_TYPES);
    if (hasOwn(body, "category")) payload.category = parseEnum(body.category, "category", CATEGORIES);
    if (hasOwn(body, "courseNames")) payload.courseNames = parseCourseNames(body.courseNames);

    if (hasOwn(body, "order")) {
        const order = Number(body.order);
        if (!Number.isInteger(order) || order < 0) throw new ModulePayloadError("order", "L'ordre doit être un entier positif.");
        payload.order = order;
    }

    TEXT_FIELDS.forEach((field) => {
        if (hasOwn(body, field)) payload[field] = String(body[field] ?? "");
    });

    if (!partial) {
        if (!payload.name) throw new ModulePayloadError("name", "Le nom du module est requis.");
        payload.availableInAllSemesters ??= false;
        payload.semester ??= "";
        payload.color ??= "#6366f1";
        payload.gradientColor ??= "";
        payload.gradientDirection ??= "to-br";
        payload.difficulty ??= "QE";
        payload.contentType ??= "url";
        if (!payload.availableInAllSemesters && !payload.semester) {
            throw new ModulePayloadError("semester", "Un semestre est requis lorsque le module n'est pas disponible pour tous les semestres.");
        }
    }

    if (payload.availableInAllSemesters === true) payload.semester = "";
    return payload;
};
