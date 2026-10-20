import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { questionController } from '../controllers/questionController.js';
import Question from '../models/questionModule.js';
import Course from '../models/examCourseModel.js';
import Playlist from '../models/playlistModel.js';
import UserStats from '../models/userStatsModel.js';
import Module from '../models/moduleModel.js';
import AnnualExam from '../models/examParYearModel.js';
import Bank from '../models/qcmBanqueModel.js';
import Point from '../models/pointModel.js';
import { getMembershipCounts, loadSavedProgress } from '../utils/answerProgress.js';
import { selectQuestionAnswers, countVerifiedQuestions, getCourseQuestionCounts } from '../services/questionProgressService.js';
import { buildCompleteActivitySources, buildProgressStatistics } from '../services/progressStatisticsService.js';

const q = (_id, sessionLabel, examId = 'annual') => ({ _id, examId, sessionLabel, questionNumber: 1,
    options: [{ isCorrect: true }, { isCorrect: false }] });
const questions = [q('normal', 'normale'), q('ratt', 'rattrapage'), q('special', 'session exceptionnelle'),
    q('other-exam', 'normale', 'other')];
const courses = [{ _id: 'course', moduleId: 'module', linkedQuestions: ['normal', 'ratt', 'special'] }];
const query = value => ({ select() { return this; }, sort() { return this; }, lean: async () => value,
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
const matches = (value, filter) => Object.entries(filter).every(([key, expected]) => {
    if (key === '$or') return expected.some(part => matches(value, part));
    const values = Array.isArray(value[key]) ? value[key] : [value[key]];
    if (expected?.$in) return values.some(id => expected.$in.map(String).includes(String(id)));
    return values.some(id => String(id) === String(expected));
});
const response = () => ({ code: 200, headers: {}, set(key, value) { this.headers[key] = value; return this; },
    status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

function setup(t, { catalog = questions, answers = {}, linkedCourses = courses, playlists = [],
    annualExams = [{ _id: 'annual', moduleId: 'module' }, { _id: 'other', moduleId: 'other-module' }], banks = [], beforeSave } = {}) {
    let state = { userId: 'user', answeredQuestions: new Map(Object.entries(answers)), moduleProgress: [], weeklyActivity: [],
        questionsAnswered: 0, totalQuestionsAttempted: 0, correctAnswers: 0, totalCorrectAnswers: 0, totalIncorrectAnswers: 0,
        totalPoints: 0, version: 0 };
    const points = [];
    const snapshot = () => {
        const doc = structuredClone(state);
        doc.increment = () => {};
        doc.save = async () => {
            if (beforeSave) await beforeSave(doc);
            if (doc.version !== state.version) { const error = new Error('conflict'); error.name = 'VersionError'; throw error; }
            const { increment, save, ...data } = doc;
            state = structuredClone({ ...data, version: state.version + 1 });
        };
        return doc;
    };
    t.mock.method(Question, 'findById', id => query(catalog.find(q => q._id === id)));
    t.mock.method(Question, 'find', filter => query(catalog.filter(q => matches(q, filter))));
    t.mock.method(Course, 'findById', id => query(linkedCourses.find(c => c._id === id)));
    t.mock.method(Course, 'find', filter => query(linkedCourses.filter(c => matches(c, filter))));
    t.mock.method(Playlist, 'findOne', filter => query(playlists.find(p => matches(p, filter))));
    t.mock.method(Playlist, 'find', filter => query(playlists.filter(p => matches(p, filter))));
    t.mock.method(Module, 'findById', () => query({ name: 'Module' }));
    t.mock.method(AnnualExam, 'find', filter => query(annualExams.filter(exam => matches(exam, filter))));
    t.mock.method(Bank, 'find', filter => query(banks.filter(bank => matches(bank, filter))));
    t.mock.method(UserStats, 'findOne', () => query(snapshot()));
    t.mock.method(UserStats, 'updateOne', async (filter, update) => {
        const id = Object.keys(update.$set)[0].split('.')[1];
        assert.deepEqual(filter[`answeredQuestions.${id}.isVerified`], { $ne: true });
        if (state.answeredQuestions.get(id)?.isVerified !== true) {
            const fields = Object.fromEntries(Object.entries(update.$set).map(([path, value]) => [path.split('.')[2], value]));
            state.answeredQuestions.set(id, { ...state.answeredQuestions.get(id), ...fields });
        }
    });
    t.mock.method(UserStats, 'findOneAndUpdate', async (_filter, update) => {
        state.totalPoints += update.$inc?.totalPoints || 0;
        return snapshot();
    });
    t.mock.method(Point, 'exists', async filter => points.some(point => matches(point, { questionId: filter.questionId })));
    t.mock.method(Point, 'create', async point => { points.push(point); return point; });
    const invoke = async (method, body = {}, examId = 'course') => {
        const res = response();
        await questionController[method]({ user: { _id: 'user' }, params: { examId }, body }, res);
        return res;
    };
    return { invoke, state: () => state, points };
}

test('the same-number questions in normale, rattrapage and exceptional sessions remain separate', () => {
    const answers = { normal: { examId: 'annual', isVerified: true, isCorrect: true },
        ratt: { examId: 'course', isVerified: true, isCorrect: false },
        special: { examId: 'course', isVerified: false, isCorrect: false } };
    const selected = selectQuestionAnswers(questions.slice(0, 3), questions, answers, 'course');
    assert.equal(countVerifiedQuestions(questions.slice(0, 3), selected), 1);
    const stats = buildProgressStatistics({ modules: [{ _id: 'module' }], courses, questions,
        annualExams: [{ _id: 'annual', moduleId: 'module' }], answeredQuestions: answers });
    assert.equal(stats.summary.answeredQuestions, 2);
    assert.equal(stats.summary.correctAnswers, 1);
    assert.equal(stats.summary.incorrectAnswers, 1);
    assert.equal(stats.summary.answeredByYear, 1);
    assert.equal(stats.summary.answeredByCourse, 1);
});

test('saved answers restore only within their answering context and question membership', async t => {
    const { invoke, state } = setup(t, { answers: {
        normal: { selectedAnswers: [0], examId: 'annual', isVerified: true, isCorrect: true },
        ratt: { selectedAnswers: [1], examId: 'course', isVerified: true, isCorrect: false },
        special: { selectedAnswers: [0], examId: 'annual', isVerified: false },
        'other-exam': { selectedAnswers: [0], examId: 'course', isVerified: true, isCorrect: true },
    } });
    const course = await invoke('getUserAnswers');
    assert.equal(course.code, 200);
    assert.equal(course.headers['Cache-Control'], 'private, no-store');
    assert.deepEqual(Object.keys(course.body.data).sort(), ['ratt']);
    const annual = await invoke('getUserAnswers', {}, 'annual');
    assert.deepEqual(Object.keys(annual.body.data).sort(), ['normal', 'special']);
    assert.deepEqual(await getMembershipCounts(state().answeredQuestions), { annual: 1, course: 1 });
});

test('latest verified imported aliases restore to the visible ID and count once, matching statistics', async t => {
    const catalog = [q('new', 'normale'), q('old', 'normale'), q('ratt', 'rattrapage')];
    const linkedCourses = [{ _id: 'course', moduleId: 'module', linkedQuestions: ['old', 'ratt'] }];
    const answers = { new: { examId: 'course', selectedAnswers: [0], isVerified: true, isCorrect: true, answeredAt: '2026-10-01' },
        old: { examId: 'course', selectedAnswers: [1], isVerified: true, isCorrect: false, answeredAt: '2026-10-02' } };
    const { invoke } = setup(t, { catalog, linkedCourses, answers });
    const res = await invoke('getUserAnswers');
    assert.equal(res.body.data.old.isCorrect, false);
    assert.equal(countVerifiedQuestions(catalog, selectQuestionAnswers(catalog, catalog, answers)), 1);
    assert.deepEqual(await getMembershipCounts(answers), { course: 1 });
    const stats = buildProgressStatistics({ modules: [{ _id: 'module' }], courses: linkedCourses, questions: catalog, answeredQuestions: answers });
    assert.equal(stats.summary.answeredQuestions, 1);
    assert.equal(stats.summary.incorrectAnswers, 1);
    const tied = { old: { isVerified: true, isCorrect: false }, new: { isVerified: true, isCorrect: true } };
    assert.equal(selectQuestionAnswers(catalog, catalog, tied).old.isCorrect, true);
});

test('verification and re-verification save one result, calculate correctness on the server and update counters', async t => {
    const { invoke, state } = setup(t);
    const save = (id, selectedAnswers) => invoke('saveAnswer', { questionId: id, selectedAnswers,
        isVerified: true, isCorrect: false, examId: 'course', moduleId: 'module' });
    assert.equal((await save('normal', [0])).body.data.isCorrect, true);
    assert.equal((await save('normal', [0])).body.data.completedQuestions, 1);
    assert.equal((await save('normal', [1])).body.data.completedQuestions, 1);
    assert.equal(state().questionsAnswered, 1);
    assert.equal(state().totalCorrectAnswers, 0);
    assert.equal(state().totalIncorrectAnswers, 1);
    assert.equal(state().moduleProgress[0].incorrectAnswers, 1);
    assert.equal((await save('ratt', [0])).body.data.completedQuestions, 2);
    assert.equal((await save('special', [0])).body.data.completedQuestions, 3);
    assert.equal(state().questionsAnswered, 3);
});

test('late drafts never downgrade verification; an explicit persisted reset allows a fresh attempt', async t => {
    const { invoke, state } = setup(t);
    const body = { questionId: 'normal', selectedAnswers: [0], isVerified: true, examId: 'course', moduleId: 'module' };
    await invoke('saveAnswer', body);
    await invoke('saveAnswer', { ...body, selectedAnswers: [1], isVerified: false });
    assert.equal(state().answeredQuestions.get('course:normal').isVerified, true);
    assert.deepEqual(state().answeredQuestions.get('course:normal').selectedAnswers, [0]);
    const reset = await invoke('saveAnswer', { ...body, selectedAnswers: [], isVerified: false, reset: true });
    assert.equal(reset.body.data.completedQuestions, 0);
    assert.equal(state().questionsAnswered, 0);
    assert.equal((await invoke('getUserAnswers')).body.data.normal.isVerified, false);
    await invoke('saveAnswer', { ...body, selectedAnswers: [1], isVerified: false });
    await invoke('saveAnswer', { ...body, selectedAnswers: [1] });
    assert.equal(state().questionsAnswered, 1);
    assert.equal(state().totalCorrectAnswers, 0);
    assert.equal(state().totalIncorrectAnswers, 1);
    assert.equal(state().weeklyActivity[0].questionsAttempted, 1);
});

test('simultaneous saves retry version conflicts without losing or double-counting questions', async t => {
    let release;
    let waiting = 0;
    const barrier = new Promise(resolve => { release = resolve; });
    const { invoke, state } = setup(t, { beforeSave: async doc => {
        if (doc.version !== 0) return;
        if (++waiting === 2) release();
        await barrier;
    } });
    const results = await Promise.all(['normal', 'ratt'].map(questionId => invoke('saveAnswer', {
        questionId, selectedAnswers: [0], isVerified: true, examId: 'course', moduleId: 'module',
    })));
    assert.ok(results.every(res => res.code === 200));
    assert.equal(state().answeredQuestions.size, 2);
    assert.equal(state().questionsAnswered, 2);
    assert.equal(state().totalCorrectAnswers, 2);
    assert.equal(state().moduleProgress[0].questionsAttempted, 2);
});

test('resetting a result does not award the same correct-answer point again', async t => {
    const { invoke, points } = setup(t);
    const body = { questionId: 'normal', selectedAnswers: [0], examId: 'course', moduleId: 'module' };
    assert.equal((await invoke('verifyAnswer', body)).body.data.pointsAwarded, 1);
    await invoke('saveAnswer', { ...body, isVerified: true });
    await invoke('saveAnswer', { ...body, selectedAnswers: [], isVerified: false, reset: true });
    assert.equal((await invoke('verifyAnswer', body)).body.data.pointsAwarded, 0);
    assert.equal(points.length, 1);
});

test('invalid selections cannot create progress or spoof a correct result', async t => {
    const { invoke, state } = setup(t);
    for (const selectedAnswers of [[0, 0], [-1], [7], ['0'], []]) {
        assert.equal((await invoke('saveAnswer', { questionId: 'normal', examId: 'course', selectedAnswers, isVerified: true })).code, 400);
    }
    assert.equal(state().answeredQuestions.size, 0);
});

test('course denominators exclude stale links and duplicate imports while including native course questions', async t => {
    const native = { ...q('native', 'normale'), examId: undefined, examCourseId: 'course' };
    const catalog = [...questions, q('normal-duplicate', 'normale'), native];
    const linkedCourses = [{ _id: 'course', linkedQuestions: ['normal', 'normal', 'normal-duplicate', 'deleted', 'ratt'] }];
    setup(t, { catalog, linkedCourses });
    assert.deepEqual(await getCourseQuestionCounts(linkedCourses), { course: 3 });
});

test('QCM, playlists and native courses retain independent results', async t => {
    const bank = { ...q('bank-question', 'rattrapage'), examId: undefined, qcmBanqueId: 'bank' };
    const native = { ...q('native', 'session exceptionnelle'), examId: undefined, examCourseId: 'course' };
    const { invoke, state } = setup(t, { catalog: [questions[0], bank, native], playlists: [
        { _id: 'playlist', userId: 'user', questionIds: ['normal', 'bank-question', 'bank-question'] },
    ], answers: {
        normal: { selectedAnswers: [0], isVerified: true, isCorrect: true, examId: 'playlist' },
        'bank-question': { selectedAnswers: [1], isVerified: true, isCorrect: false, examId: 'bank' },
        native: { selectedAnswers: [0], isVerified: true, isCorrect: true, examId: 'course' },
    } });
    assert.deepEqual(Object.keys((await invoke('getUserAnswers', {}, 'playlist')).body.data).sort(), ['normal']);
    assert.deepEqual(Object.keys((await invoke('getUserAnswers', {}, 'bank')).body.data), ['bank-question']);
    assert.deepEqual(Object.keys((await invoke('getUserAnswers', {}, 'course')).body.data).sort(), ['native']);
    assert.deepEqual(await getMembershipCounts(state().answeredQuestions), { bank: 1, course: 1, playlist: 1 });
});

test('saving an imported alias reconciles old inflated counters from the unique saved results', async t => {
    const { invoke, state } = setup(t, { catalog: [q('new', 'normale'), q('old', 'normale')],
        answers: { new: { isVerified: true, isCorrect: true }, old: { isVerified: true, isCorrect: false } } });
    state().questionsAnswered = 99;
    state().totalCorrectAnswers = 50;
    state().totalIncorrectAnswers = 49;
    const res = await invoke('saveAnswer', { questionId: 'new', selectedAnswers: [1], isVerified: true, examId: 'annual', moduleId: 'module' });
    assert.equal(res.code, 200);
    assert.equal(state().answeredQuestions.size, 1);
    assert.equal(state().questionsAnswered, 1);
    assert.equal(state().totalCorrectAnswers, 0);
    assert.equal(state().totalIncorrectAnswers, 1);
});

test('module counters follow question membership when saved answer metadata is missing or stale', async t => {
    const answers = {
        normal: { selectedAnswers: [0], isVerified: true, isCorrect: true, examId: 'annual' },
        ratt: { selectedAnswers: [1], isVerified: true, isCorrect: false, examId: 'course', moduleId: 'stale-module' },
    };
    setup(t, { answers });
    const progress = await loadSavedProgress(answers);
    assert.deepEqual(progress.byModule, { module: { answered: 2, correct: 1, incorrect: 1 } });
});

test('native course and bank answers update module counters even when answered through a playlist', async t => {
    const native = { ...q('native', 'normale'), examId: undefined, examCourseId: 'native-course' };
    const bank = { ...q('bank-question', 'normale'), examId: undefined, qcmBanqueId: 'bank' };
    const answers = Object.fromEntries(['native', 'bank-question'].map(id => [id, {
        selectedAnswers: [0], isVerified: true, isCorrect: true, examId: 'playlist',
    }]));
    setup(t, { catalog: [native, bank], answers, linkedCourses: [{ _id: 'native-course', moduleId: 'module', linkedQuestions: [] }],
        banks: [{ _id: 'bank', moduleId: 'module' }] });
    assert.deepEqual((await loadSavedProgress(answers)).byModule, { module: { answered: 2, correct: 2, incorrect: 0 } });
});

test('saving progress reconciles missing module metadata and duplicate module rows without losing study time', async t => {
    const { invoke, state } = setup(t, { answers: { normal: {
        selectedAnswers: [0], isVerified: true, isCorrect: true, examId: 'annual',
    } } });
    state().moduleProgress = [
        { moduleId: 'module', questionsAttempted: 9, timeSpent: 10 },
        { moduleId: 'module', questionsAttempted: 9, timeSpent: 20 },
    ];
    const result = await invoke('saveAnswer', { questionId: 'ratt', selectedAnswers: [1], isVerified: true, examId: 'playlist' });
    assert.equal(result.code, 200);
    assert.equal(state().moduleProgress.length, 1);
    assert.equal(state().moduleProgress[0].questionsAttempted, 2);
    assert.equal(state().moduleProgress[0].correctAnswers, 1);
    assert.equal(state().moduleProgress[0].incorrectAnswers, 1);
    assert.equal(state().moduleProgress[0].timeSpent, 30);
});

test('real Mongoose saves preserve retry history and enforce the document version guard', async t => {
    const oldId = new mongoose.Types.ObjectId().toHexString();
    const newId = `${new mongoose.Types.ObjectId().toHexString()}:${new mongoose.Types.ObjectId().toHexString()}`;
    const doc = UserStats.hydrate({ _id: new mongoose.Types.ObjectId(), userId: new mongoose.Types.ObjectId(), __v: 3,
        answeredQuestions: { [oldId]: { selectedAnswers: [0], isVerified: true, isCorrect: true } } });
    let matched = 1;
    let write;
    t.mock.method(UserStats.collection, 'updateOne', async (filter, update) => {
        write = { filter, update };
        return { matchedCount: matched, modifiedCount: matched };
    });
    doc.answeredQuestions.delete(oldId);
    doc.answeredQuestions.set(newId, { selectedAnswers: [], isVerified: false, hasBeenVerified: true, isCorrect: false });
    doc.increment();
    await doc.save();
    assert.equal(write.filter.__v, 3);
    assert.equal(write.update.$inc.__v, 1);
    assert.ok(Object.hasOwn(write.update.$unset, `answeredQuestions.${oldId}`));
    assert.equal(write.update.$set[`answeredQuestions.${newId}`].hasBeenVerified, true);
    assert.equal(write.update.$set[`answeredQuestions.${newId}`].isVerified, false);
    matched = 0;
    doc.answeredQuestions.get(newId).isVerified = true;
    doc.increment();
    await assert.rejects(doc.save(), { name: 'VersionError' });
});

for (const question of questions.slice(0, 3)) {
    for (const first of ['annual', 'course']) {
        test(`${question.sessionLabel}: ${first} and the other mode save, reload and reset independently`, async t => {
            const { invoke, state } = setup(t);
            const second = first === 'annual' ? 'course' : 'annual';
            const body = { questionId: question._id, selectedAnswers: [0], isVerified: true };
            await invoke('saveAnswer', { ...body, examId: first });
            assert.deepEqual((await invoke('getUserAnswers', {}, second)).body.data, {});
            assert.deepEqual(await getMembershipCounts(state().answeredQuestions), { [first]: 1 });
            // Different results for the same question must both survive reloads.
            await invoke('saveAnswer', { ...body, examId: second, selectedAnswers: [1] });
            await invoke('saveAnswer', { ...body, examId: second, selectedAnswers: [1] });
            assert.equal(state().answeredQuestions.size, 2);
            assert.equal((await invoke('getUserAnswers', {}, first)).body.data[question._id].isCorrect, true);
            assert.equal((await invoke('getUserAnswers', {}, second)).body.data[question._id].isCorrect, false);
            assert.deepEqual(await getMembershipCounts(state().answeredQuestions), { annual: 1, course: 1 });
            const stats = buildProgressStatistics({ modules: [{ _id: 'module' }], courses, questions,
                annualExams: [{ _id: 'annual' }], answeredQuestions: state().answeredQuestions });
            assert.equal(stats.modules[0].courses[0].answeredQuestions, 1);
            assert.equal(stats.modules[0].courses[0].correctAnswers, first === 'course' ? 1 : 0);
            assert.equal(stats.summary.answeredQuestions, 2);
            assert.equal(state().questionsAnswered, 2);
            assert.equal(state().totalCorrectAnswers, 1);
            assert.equal(state().totalIncorrectAnswers, 1);
            assert.equal(stats.summary.answeredByYear, 1);
            assert.equal(stats.summary.answeredByCourse, 1);
            await invoke('saveAnswer', { ...body, examId: second, selectedAnswers: [], isVerified: false, reset: true });
            assert.deepEqual(await getMembershipCounts(state().answeredQuestions), { [first]: 1 });
            assert.equal((await invoke('getUserAnswers', {}, first)).body.data[question._id].isVerified, true);
            assert.equal((await invoke('getUserAnswers', {}, second)).body.data[question._id].isVerified, false);
        });
    }
}

test('legacy yearly results and imported aliases are preserved when the course saves or resets', async t => {
    const { invoke, state } = setup(t, { catalog: [q('normal', 'normale'), q('old', 'normale')],
        answers: { old: { examId: 'annual', selectedAnswers: [0], isVerified: true, isCorrect: true } } });
    const body = { questionId: 'normal', examId: 'course', selectedAnswers: [1], isVerified: true };
    await invoke('saveAnswer', body);
    assert.equal(state().answeredQuestions.get('old').isCorrect, true);
    await invoke('saveAnswer', { ...body, selectedAnswers: [], isVerified: false, reset: true });
    assert.equal((await invoke('getUserAnswers', {}, 'annual')).body.data.normal.isCorrect, true);
    assert.deepEqual(await getMembershipCounts(state().answeredQuestions), { annual: 1 });
});

test('simultaneous saves of the same question in different contexts retain both results', async t => {
    let release;
    let waiting = 0;
    const barrier = new Promise(resolve => { release = resolve; });
    const { invoke, state } = setup(t, { beforeSave: async doc => {
        if (doc.version !== 0) return;
        if (++waiting === 2) release();
        await barrier;
    } });
    await Promise.all(['annual', 'course'].map((examId, index) => invoke('saveAnswer', {
        questionId: 'normal', selectedAnswers: [index], isVerified: true, examId,
    })));
    assert.equal(state().answeredQuestions.size, 2);
    assert.equal((await invoke('getUserAnswers', {}, 'annual')).body.data.normal.isCorrect, true);
    assert.equal((await invoke('getUserAnswers', {}, 'course')).body.data.normal.isCorrect, false);
    assert.deepEqual(await getMembershipCounts(state().answeredQuestions), { annual: 1, course: 1 });
});

test('the same correct question in year and two courses contributes three independent completions', async t => {
    const catalog = [q('normal', 'normale'), q('duplicate', 'normale')];
    const linkedCourses = ['course', 'second-course'].map(_id => ({ _id, moduleId: 'module', linkedQuestions: ['normal', 'duplicate'] }));
    const annualExams = [{ _id: 'annual', moduleId: 'module' }];
    const { invoke, state } = setup(t, { catalog, linkedCourses, annualExams });
    for (const [index, examId] of ['annual', 'course', 'second-course'].entries()) {
        const body = { questionId: 'normal', examId, selectedAnswers: [0], isVerified: true };
        await invoke('saveAnswer', body);
        await invoke('saveAnswer', { ...body, questionId: 'duplicate' });
        assert.equal(state().questionsAnswered, index + 1);
        assert.equal(state().totalCorrectAnswers, index + 1);
        assert.equal(state().moduleProgress[0].questionsAttempted, index + 1);
        const stats = buildProgressStatistics({ modules: [{ _id: 'module' }], annualExams, questions: catalog,
            courses: buildCompleteActivitySources({ courses: linkedCourses, annualExams, questions: catalog }),
            answeredQuestions: state().answeredQuestions });
        assert.equal(stats.summary.answeredQuestions, index + 1);
        assert.equal(stats.summary.correctAnswers, index + 1);
        assert.equal(stats.summary.totalQuestionOccurrences, 3);
        assert.equal(stats.summary.completionPercentage, Math.round((index + 1) / 3 * 100));
    }
    await invoke('saveAnswer', { questionId: 'normal', examId: 'course', selectedAnswers: [], isVerified: false, reset: true });
    assert.equal(state().questionsAnswered, 2);
    assert.equal(state().totalCorrectAnswers, 2);
    assert.deepEqual(await getMembershipCounts(state().answeredQuestions), { annual: 1, 'second-course': 1 });
});
