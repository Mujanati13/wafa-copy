export const SUPPORTED_USER_PLANS = ["Free", "Premium", "Premium Annuel"];

export const applyAdminPlanTransition = (currentPlan, requestedUpdates = {}) => {
    const updates = { ...requestedUpdates };
    const downgradedToFree = currentPlan !== "Free" && updates.plan === "Free";

    if (downgradedToFree) {
        Object.assign(updates, {
            planExpiry: null,
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
    if (!user || !["Premium", "Premium Annuel"].includes(user.plan)) return false;
    return !user.planExpiry || new Date(user.planExpiry) > now;
};
