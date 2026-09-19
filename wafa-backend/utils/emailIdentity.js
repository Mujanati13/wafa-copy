const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();

// Existing databases may contain legacy mixed-case values. This lookup keeps
// registration unique while those records are reviewed and consolidated.
export const buildCaseInsensitiveEmailLookup = (email) => ({
  email: {
    $regex: `^${escapeRegex(normalizeEmail(email))}$`,
    $options: "i",
  },
});
