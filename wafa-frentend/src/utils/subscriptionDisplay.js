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

// Correct legacy plan features at display time, including saved API content.
export const displaySubscriptionFeature = (feature, language = "fr") => {
  const value = displaySubscriptionCopy(feature, language).trim();
  if (!value || language === "en") return value;

  const key = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr").replace(/\s+/g, " ");

  if (/^acces a tou[st] les modules$/.test(key)) {
    return "Accès à tous les modules";
  }
  if (/^questions trie(?:e?s)? par categories?\s*\(sous[ -]modules\),?\s*par lecons$/.test(key)) {
    return "Questions triées par catégories (sous-modules), par leçons";
  }
  if (/^statistiques de chaque module et lecon$/.test(key)) {
    return "Statistiques de chaque module et leçon";
  }
  if (/^explications? des etudiants$/.test(key)) {
    return "Explications des étudiants";
  }
  if (/^tp\s*\/\s*td$/.test(key)) return "TP/TD";

  return value.charAt(0).toLocaleUpperCase("fr") + value.slice(1);
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
