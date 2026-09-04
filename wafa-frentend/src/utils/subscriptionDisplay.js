const LEGACY_ANNUAL_WORDING = /\b(?:annuel(?:le)?|annual)\b/gi;

export const displaySubscriptionPlanName = (planName, fallback = "Plan gratuit") => {
  const value = String(planName || "").trim();
  if (!value) return fallback;

  return value.replace(LEGACY_ANNUAL_WORDING, (word) => (
    word === word.toLocaleUpperCase() ? "SEMESTRE" : "Semestre"
  ));
};

export const displaySubscriptionPeriod = (period, language = "fr") => {
  const value = String(period || "").trim().toLocaleLowerCase();
  if (!value || value === "gratuit") return "";

  return language === "en" ? "semester" : "semestre";
};

export const displaySubscriptionCopy = (copy, language = "fr") => {
  const value = String(copy || "");
  if (!value) return value;

  if (language === "en") {
    return value
      .replace(/\b12\s+months?\b/gi, "6 months")
      .replace(/\b(?:the\s+)?(?:whole\s+)?academic year\b/gi, "one semester")
      .replace(/\ball semesters(?:\s*\([^)]*\))?/gi, "all modules in the selected semester")
      .replace(/\bannual(?:ly)?\b/gi, "per semester");
  }

  return value
    .replace(/\b12\s+mois\b/gi, "6 mois")
    .replace(/\b(?:toute\s+votre\s+)?ann[ée]e universitaire\b/gi, "un semestre complet")
    .replace(/\btous les semestres(?:\s*\([^)]*\))?/gi, "tous les modules du semestre choisi")
    .replace(/\bannuel(?:le)?ment\b/gi, "par semestre")
    .replace(/\bannuel(?:le)?\b/gi, "par semestre");
};

export const editableSubscriptionPeriod = (period) => (
  String(period || "").trim().toLocaleLowerCase() === "gratuit"
    ? "Gratuit"
    : "Semestre"
);

export const editableUserPlan = (planName) => {
  const value = String(planName || "Free").toLocaleLowerCase();
  if (value.includes("premium pro")) return "Premium Pro";
  if (value.includes("premium")) return "Premium";
  return "Free";
};

export const isPremiumPlan = (planName) => editableUserPlan(planName) !== "Free";

export const isPremiumProPlan = (planName) => editableUserPlan(planName) === "Premium Pro";
