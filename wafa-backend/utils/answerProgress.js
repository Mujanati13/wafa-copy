import UserStats from "../models/userStatsModel.js";

export const buildAnsweredCountByExam = (answeredQuestions) => {
    const entries = answeredQuestions instanceof Map
        ? Array.from(answeredQuestions.values())
        : Object.values(answeredQuestions || {});

    return entries.reduce((counts, answer) => {
        const examId = answer?.examId?.toString?.();
        if (!examId || answer?.isVerified !== true) return counts;

        counts[examId] = (counts[examId] || 0) + 1;
        return counts;
    }, {});
};

export const getAnsweredCountByExam = async (userId) => {
    if (!userId) return {};

    const userStats = await UserStats.findOne({ userId })
        .select("answeredQuestions")
        .lean();

    return buildAnsweredCountByExam(userStats?.answeredQuestions);
};
