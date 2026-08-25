import path from "path";

export const MAX_EXPLANATION_FILE_SIZE = 100 * 1024 * 1024;

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const IMAGE_MIMES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
]);

const DOCUMENT_EXTENSIONS = new Set([".pdf", ".ppt", ".pptx", ".doc", ".docx"]);
const DOCUMENT_MIMES = new Set([
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const isGenericBinaryMime = (mimetype = "") =>
    mimetype === "" || mimetype === "application/octet-stream";

export const isAllowedExplanationFile = ({ fieldname = "", originalname = "", mimetype = "" } = {}) => {
    const extension = path.extname(originalname).toLowerCase();

    if (fieldname === "images") {
        return IMAGE_EXTENSIONS.has(extension)
            && (IMAGE_MIMES.has(mimetype) || isGenericBinaryMime(mimetype));
    }

    if (fieldname === "pdf") {
        return DOCUMENT_EXTENSIONS.has(extension)
            && (DOCUMENT_MIMES.has(mimetype) || isGenericBinaryMime(mimetype));
    }

    return false;
};
