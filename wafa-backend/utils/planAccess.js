export const SUPPORTED_USER_PLANS = ["Free", "Premium", "Premium Pro"];

export const normalizeUserPlan = (plan) => {
    const value = String(plan || "Free").trim();
    const normalized = value.toLowerCase();
    if (normalized.includes("premium pro")) return "Premium Pro";
    if (normalized.includes("premium")) return "Premium";
    return "Free";
};

export const applyAdminPlanTransition = (currentPlan, requestedUpdates = {}) => {
    const updates = { ...requestedUpdates };
    const normalizedCurrentPlan = normalizeUserPlan(currentPlan);
    const normalizedRequestedPlan = Object.prototype.hasOwnProperty.call(updates, "plan")
        ? normalizeUserPlan(updates.plan)
        : normalizedCurrentPlan;
    const downgradedToFree = normalizedCurrentPlan !== "Free"
        && normalizedRequestedPlan === "Free";

    if (downgradedToFree) {
        Object.assign(updates, {
            planExpiry: null,
            paymentDate: null,
            approvalDate: null,
            paymentMode: null,
            semesters: [],
            currentYear: "",
            freeModules: [],
            freeModule: null,
            freeExam: null,
            hasUsedFreeSemester: false,
            freeSemesterSelectedAt: null,
        });
    }

    return { updates, downgradedToFree };
};

export const userHasPremiumAccess = (user, now = new Date()) => {
    if (user?.isAdmin) return true;
    if (!user || !["Premium", "Premium Pro"].includes(normalizeUserPlan(user.plan))) return false;
    return !user.planExpiry || new Date(user.planExpiry) > now;
};
