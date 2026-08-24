import path from "path";

export const MAX_RESUME_FILE_SIZE = 50 * 1024 * 1024;

export const RESUME_FILE_EXTENSIONS = new Set([
    ".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".gif", ".webp",
]);

export const RESUME_FILE_MIMES = new Set([
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const isAllowedResumeFile = ({ originalname = "", mimetype = "" } = {}) => {
    const extension = path.extname(originalname).toLowerCase();
    if (!RESUME_FILE_EXTENSIONS.has(extension)) return false;
    return RESUME_FILE_MIMES.has(mimetype)
        || mimetype === "application/octet-stream"
        || mimetype === "";
};

export const sanitizeResumeFilename = (originalname = "document") => {
    const extension = path.extname(originalname).toLowerCase();
    const baseName = path.basename(originalname, extension)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80) || "document";
    return "resume-" + Date.now() + "-" + Math.round(Math.random() * 1e9) + "-" + baseName + extension;
};
