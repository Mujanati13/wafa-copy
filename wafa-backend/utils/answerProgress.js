import UserStats from "../models/userStatsModel.js";
import Question from "../models/questionModule.js";
import Course from "../models/examCourseModel.js";
import Playlist from "../models/playlistModel.js";
import AnnualExam from "../models/examParYearModel.js";
import Bank from "../models/qcmBanqueModel.js";
import { buildCompleteActivitySources, buildProgressStatistics } from "../services/progressStatisticsService.js";
import { questionLogicalKey } from "./questionIdentity.js";
import { answerQuestionId, answerContextId } from "./answerIdentity.js";
import { loadQuestionAliases, questionIdentityFields, selectQuestionAnswers } from "../services/questionProgressService.js";

// Completion belongs to the saved context, even when catalogs share questions.
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

    return getMembershipCounts(userStats?.answeredQuestions);
};

export const getMembershipCounts = async (answers) => (await loadSavedProgress(answers)).countsByExam;

export const loadSavedProgress = async (answers) => {
    const entries = answers instanceof Map ? [...answers] : Object.entries(answers || {});
    const ids = entries.filter(([, answer]) => answer?.isVerified === true).map(([id]) => answerQuestionId(id));
    if (!ids.length) return { countsByExam: {}, answered: 0, correct: 0, incorrect: 0, byModule: {} };

    const savedQuestions = await Question.find({ _id: { $in: ids } }).select(questionIdentityFields).lean();
    const questions = await loadQuestionAliases(savedQuestions);
    const questionIds = questions.map(q => q._id);
    const idOf = value => String(value?._id || value || "");
    const sourceIds = field => [...new Set(questions.map(q => idOf(q[field])).filter(Boolean))];
    const annualIds = sourceIds('examId');
    const bankIds = sourceIds('qcmBanqueId');
    const [courses, playlists, annualExams, banks] = await Promise.all([
        Course.find({ $or: [{ linkedQuestions: { $in: questionIds } }, { _id: { $in: sourceIds('examCourseId') } }] })
            .select("linkedQuestions moduleId name category status").lean(),
        Playlist.find({ questionIds: { $in: questionIds } }).select("questionIds").lean(),
        annualIds.length ? AnnualExam.find({ _id: { $in: annualIds } }).select("moduleId").lean() : [],
        bankIds.length ? Bank.find({ _id: { $in: bankIds } }).select("moduleId").lean() : [],
    ]);
    const keysById = new Map(questions.map(q => [String(q._id), questionLogicalKey(q)]));
    const questionById = new Map(questions.map(q => [String(q._id), q]));
    const completed = new Set(entries.flatMap(([key, answer]) => {
        const question = questionById.get(answerQuestionId(key));
        return question && answer?.isVerified === true
            ? [`${answerContextId(key, answer, question)}:${questionLogicalKey(question)}`] : [];
    }));
    const byContext = new Map();
    const add = (context, key) => {
        if (!context || !completed.has(`${context}:${key}`)) return;
        const id = String(context);
        if (!byContext.has(id)) byContext.set(id, new Set());
        byContext.get(id).add(key);
    };
    for (const q of questions) {
        for (const context of [q.examId, q.qcmBanqueId, q.examCourseId]) add(context, questionLogicalKey(q));
    }
    for (const course of courses) {
        for (const id of course.linkedQuestions || []) add(course._id, keysById.get(String(id)));
    }
    for (const playlist of playlists) {
        for (const id of playlist.questionIds || []) add(playlist._id, keysById.get(String(id)));
    }
    const uniqueAnswers = new Map();
    const contexts = new Set(entries.map(([key, answer]) =>
        answerContextId(key, answer, questionById.get(answerQuestionId(key)))));
    for (const context of contexts) {
        const results = selectQuestionAnswers(questions, questions, answers, context);
        for (const q of questions) {
            const answer = results[String(q._id)];
            if (answer?.isVerified === true) uniqueAnswers.set(`${context}:${questionLogicalKey(q)}`, answer);
        }
    }
    const verified = [...uniqueAnswers.values()];
    const correct = verified.filter(answer => answer.isCorrect === true).length;
    // Stored moduleId is historical answering metadata and can be missing in
    // playlists or legacy answers. Reuse the course statistics calculation so
    // both views follow actual catalog membership, including shared questions.
    const activeCourses = courses.filter(course => course.status !== 'archived');
    const modules = [...new Set([...annualExams, ...banks, ...activeCourses]
        .map(source => idOf(source.moduleId)).filter(Boolean))].map(_id => ({ _id }));
    const moduleProgress = buildProgressStatistics({ modules, annualExams, questions, answeredQuestions: answers,
        courses: buildCompleteActivitySources({ courses: activeCourses, annualExams, qcmBanks: banks, questions }),
    });
    const byModule = Object.fromEntries(moduleProgress.modules.map(module => [module.moduleId, {
        answered: module.answeredQuestions, correct: module.correctAnswers, incorrect: module.incorrectAnswers,
    }]));
    return { countsByExam: Object.fromEntries([...byContext].map(([id, keys]) => [id, keys.size])),
        answered: verified.length, correct, incorrect: verified.length - correct, byModule };
};
