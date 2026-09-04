export const VALID_SUBSCRIPTION_SEMESTERS = [
  "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10",
];

export const isPaidSemesterPlan = (plan) => Number(plan?.price) > 0;

export const getBillingConfig = (plan) => {
  if (!isPaidSemesterPlan(plan)) {
    throw new Error("Seuls les abonnements payants par semestre sont disponibles.");
  }

  const isPremiumPro = String(plan?.name || "").toLowerCase().includes("premium pro");
  return {
    duration: "6months",
    semesterCount: 1,
    transactionPlan: isPremiumPro ? "Premium Pro" : "Premium",
  };
};

export const validatePlanSemesters = (semesters, semesterCount = 1) => {
  const selected = [...new Set(Array.isArray(semesters) ? semesters : [])];
  if (
    selected.length !== semesterCount ||
    selected.some((semester) => !VALID_SUBSCRIPTION_SEMESTERS.includes(semester))
  ) {
    throw new Error(`This plan requires exactly ${semesterCount} valid semester${semesterCount > 1 ? "s" : ""}.`);
  }

  return selected.sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
};
