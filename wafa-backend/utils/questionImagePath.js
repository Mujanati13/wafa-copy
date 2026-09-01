export const normalizeQuestionImagePath = (value) => {
    const rawValue = String(value || "").trim();
    if (!rawValue) return "";

    const normalized = rawValue.replace(/\\/g, "/");
    if (/^https?:\/\//i.test(normalized) || /^(?:data|blob):/i.test(normalized)) {
        return normalized;
    }

    const lowerPath = normalized.toLowerCase();
    const uploadIndex = lowerPath.indexOf("/uploads/");
    if (uploadIndex >= 0) return normalized.slice(uploadIndex);
    if (lowerPath.startsWith("uploads/")) return `/${normalized}`;

    const cleanPath = normalized.replace(/^\/+/, "");
    return cleanPath.toLowerCase().startsWith("questions/")
        ? `/uploads/${cleanPath}`
        : `/uploads/questions/${cleanPath}`;
};

export const normalizeQuestionImages = (images) => Array.isArray(images)
    ? images.map(normalizeQuestionImagePath).filter(Boolean)
    : [];
