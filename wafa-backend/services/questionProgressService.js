import Question from "../models/questionModule.js";
import Course from "../models/examCourseModel.js";
import Playlist from "../models/playlistModel.js";
import { questionLogicalKey } from "../utils/questionIdentity.js";
import { answerQuestionId, answerContextId } from "../utils/answerIdentity.js";

const idOf = value => String(value?._id || value || "");
export const questionIdentityFields = "_id examId qcmBanqueId examCourseId sessionLabel questionNumber";
const entriesOf = answers => answers instanceof Map ? [...answers] : Object.entries(answers || {});

// An answer belongs only to the context in which it was saved. Legacy entries
// use their saved examId, or their original source when that metadata is absent.
export const selectQuestionAnswers = (visibleQuestions, allQuestions, answers, examId) => {
    const byId = new Map(allQuestions.map(q => [idOf(q), q]));
    const canonical = new Map();
    for (const q of allQuestions) {
        const key = questionLogicalKey(q);
        if (!canonical.has(key)) canonical.set(key, idOf(q));
    }
    const latest = new Map();
    for (const [storageKey, raw] of entriesOf(answers)) {
        const questionId = answerQuestionId(storageKey);
        const question = byId.get(String(questionId));
        const answer = raw?.toObject?.() || raw;
        if (!question || !answer) continue;
        if (examId !== undefined && answerContextId(storageKey, answer, question) !== idOf(examId)) continue;
        const key = questionLogicalKey(question);
        const previous = latest.get(key)?.answer;
        const time = value => new Date(value?.answeredAt || 0).getTime() || 0;
        if (!previous || (answer.isVerified === true && previous.isVerified !== true)
            || (answer.isVerified === previous.isVerified && (time(answer) > time(previous)
                || (time(answer) === time(previous) && String(questionId) === canonical.get(key))))) {
            latest.set(key, { answer, questionId });
        }
    }
    return Object.fromEntries(visibleQuestions.flatMap(q => {
        const answer = latest.get(questionLogicalKey(q))?.answer;
        return answer ? [[idOf(q), answer]] : [];
    }));
};

export const loadQuestionAliases = async questions => {
    const filters = [];
    for (const field of ["examId", "qcmBanqueId", "examCourseId"]) {
        const ids = [...new Set(questions.map(q => idOf(q[field])).filter(Boolean))];
        if (ids.length) filters.push({ [field]: { $in: ids } });
    }
    if (!filters.length) return questions;
    const aliases = await Question.find({ $or: filters })
        .select(questionIdentityFields).sort({ createdAt: -1, _id: -1 }).lean();
    return [...new Map([...aliases, ...questions].map(q => [idOf(q), q])).values()];
};

export const loadContextQuestions = async (examId, userId) => {
    const [course, playlist] = await Promise.all([
        Course.findById(examId).select("linkedQuestions").lean(),
        Playlist.findOne({ _id: examId, $or: [{ userId }, { isPublic: true }] }).select("questionIds").lean(),
    ]);
    const linkedIds = [...(course?.linkedQuestions || []), ...(playlist?.questionIds || [])];
    return Question.find({ $or: [
        { examId }, { qcmBanqueId: examId }, { examCourseId: examId },
        ...(linkedIds.length ? [{ _id: { $in: linkedIds } }] : []),
    ] }).select(questionIdentityFields).sort({ createdAt: -1, _id: -1 }).lean();
};

export const getContextAnswers = async (examId, userId, answers) => {
    const questions = await loadContextQuestions(examId, userId);
    return selectQuestionAnswers(questions, await loadQuestionAliases(questions), answers, examId);
};

export const countVerifiedQuestions = (questions, answers) => {
    const verified = new Set();
    for (const q of questions) {
        if (answers[idOf(q)]?.isVerified === true) verified.add(questionLogicalKey(q));
    }
    return verified.size;
};

export const getCourseQuestionCounts = async courses => {
    if (!courses.length) return {};
    const keysByCourse = new Map();
    const coursesByQuestion = new Map();
    const linkedIds = new Map();
    let work = 0;

    // Index memberships once instead of scanning the entire question catalog
    // for every course. Large catalogs must also let other requests run.
    for (const course of courses) {
        const courseId = idOf(course);
        keysByCourse.set(courseId, new Set());
        for (const linkedId of course.linkedQuestions || []) {
            const questionId = idOf(linkedId);
            linkedIds.set(questionId, linkedId);
            if (!coursesByQuestion.has(questionId)) coursesByQuestion.set(questionId, new Set());
            coursesByQuestion.get(questionId).add(courseId);
            if (++work % 2048 === 0) await new Promise(resolve => setImmediate(resolve));
        }
    }

    const questions = await Question.find({ $or: [
        { _id: { $in: [...linkedIds.values()] } },
        { examCourseId: { $in: courses.map(course => course._id) } },
    ] }).select(questionIdentityFields).lean();

    for (const question of questions) {
        const key = questionLogicalKey(question);
        keysByCourse.get(idOf(question.examCourseId))?.add(key);
        for (const courseId of coursesByQuestion.get(idOf(question)) || []) {
            keysByCourse.get(courseId).add(key);
            if (++work % 2048 === 0) await new Promise(resolve => setImmediate(resolve));
        }
        if (++work % 2048 === 0) await new Promise(resolve => setImmediate(resolve));
    }
    return Object.fromEntries([...keysByCourse].map(([courseId, keys]) => [courseId, keys.size]));
};
