const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "backend"]);

const configuredApiUrl = () => import.meta.env?.VITE_API_URL || "/api/v1";

export const getPublicApiOrigin = ({
  apiUrl = configuredApiUrl(),
  browserOrigin = typeof window !== "undefined" ? window.location.origin : "",
} = {}) => {
  const value = String(apiUrl || "").trim();
  if (!value || value.startsWith("/")) return "";

  try {
    const api = new URL(value);
    const browser = browserOrigin ? new URL(browserOrigin) : null;
    const apiIsInternal = LOOPBACK_HOSTS.has(api.hostname.toLowerCase());
    const browserIsExternal = browser && !LOOPBACK_HOSTS.has(browser.hostname.toLowerCase());

    // Never send a deployed visitor's browser to localhost or a Docker hostname.
    if (apiIsInternal && browserIsExternal) return "";
    return api.origin;
  } catch {
    return "";
  }
};

export const resolveMediaUrl = (value, {
  folder = "",
  apiUrl,
  browserOrigin,
} = {}) => {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";
  if (/^(?:data|blob):/i.test(rawValue)) return rawValue;

  const normalized = rawValue.replace(/\\/g, "/");
  const origin = getPublicApiOrigin({ apiUrl, browserOrigin });

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const absoluteUrl = new URL(normalized);
      const uploadIndex = absoluteUrl.pathname.toLowerCase().indexOf("/uploads/");
      if (uploadIndex >= 0 && LOOPBACK_HOSTS.has(absoluteUrl.hostname.toLowerCase())) {
        return `${origin}${absoluteUrl.pathname.slice(uploadIndex)}${absoluteUrl.search}${absoluteUrl.hash}`;
      }
    } catch {
      return normalized;
    }
    return normalized;
  }

  const lowerPath = normalized.toLowerCase();
  const uploadIndex = lowerPath.indexOf("/uploads/");
  let publicPath;

  if (uploadIndex >= 0) {
    publicPath = normalized.slice(uploadIndex);
  } else if (lowerPath.startsWith("uploads/")) {
    publicPath = `/${normalized}`;
  } else {
    const cleanFolder = String(folder || "").replace(/^\/+|\/+$/g, "");
    const cleanPath = normalized.replace(/^\/+/, "");
    publicPath = cleanFolder && cleanPath.toLowerCase().startsWith(`${cleanFolder.toLowerCase()}/`)
      ? `/uploads/${cleanPath}`
      : `/uploads/${cleanFolder ? `${cleanFolder}/` : ""}${cleanPath}`;
  }

  return `${origin}${publicPath}`;
};

export const resolveQuestionImageUrl = (value, options) => resolveMediaUrl(value, {
  ...options,
  folder: "questions",
});
