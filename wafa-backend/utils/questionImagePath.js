import { fileURLToPath } from "node:url";

// Keep Multer's destination tied to the directory Express exposes in app.js.
// process.cwd() is intentionally avoided because it changes with the command
// used to start the backend (repository root, backend folder, PM2, etc.).
export const QUESTION_IMAGES_DIRECTORY = fileURLToPath(
    new URL("../uploads/questions/", import.meta.url)
);

export const normalizeQuestionImagePath = (value) => {
    const rawValue = String(value || "").trim();
    if (!rawValue) return "";

    const normalized = rawValue.replace(/\\/g, "/");
    const lowerPath = normalized.toLowerCase();
    const uploadIndex = lowerPath.indexOf("/uploads/");
    if (uploadIndex >= 0) return normalized.slice(uploadIndex);
    if (lowerPath.startsWith("uploads/")) return `/${normalized}`;

    if (/^https?:\/\//i.test(normalized) || /^(?:data|blob):/i.test(normalized)) {
        return normalized;
    }

    const cleanPath = normalized.replace(/^\/+/, "");
    return cleanPath.toLowerCase().startsWith("questions/")
        ? `/uploads/${cleanPath}`
        : `/uploads/questions/${cleanPath}`;
};

export const normalizeQuestionImages = (images) => Array.isArray(images)
    ? images.map(normalizeQuestionImagePath).filter(Boolean)
    : [];
