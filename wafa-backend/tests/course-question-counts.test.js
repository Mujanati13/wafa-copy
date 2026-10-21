import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Question from '../models/questionModule.js';
import { getCourseQuestionCounts } from '../services/questionProgressService.js';

const mockQuestions = (t, questions, capture = () => {}) => t.mock.method(Question, 'find', filter => {
    capture(filter);
    return { select() { return this; }, lean: async () => questions };
});

test('course counts preserve shared, native and deduplicated questions without stale links', async t => {
    const first = new mongoose.Types.ObjectId();
    const second = new mongoose.Types.ObjectId();
    const empty = new mongoose.Types.ObjectId();
    const courses = [
        { _id: first, linkedQuestions: ['annual', 'annual', 'alias', 'ratt', 'native', 'deleted'] },
        { _id: second, linkedQuestions: ['alias', 'native'] },
        { _id: empty, linkedQuestions: ['deleted'] },
    ];
    let query;
    mockQuestions(t, [
        { _id: 'annual', examId: 'exam', sessionLabel: ' normale ', questionNumber: 1 },
        { _id: 'alias', examId: 'exam', sessionLabel: 'normale', questionNumber: 1 },
        { _id: 'ratt', examId: 'exam', sessionLabel: 'rattrapage', questionNumber: 1 },
        { _id: 'native', examCourseId: first, questionNumber: 1 },
        { _id: 'second-native', examCourseId: second, questionNumber: 1 },
    ], filter => { query = filter; });

    assert.deepEqual(await getCourseQuestionCounts(courses), {
        [String(first)]: 3, [String(second)]: 3, [String(empty)]: 0,
    });
    assert.deepEqual(query.$or[0]._id.$in.sort(), ['alias', 'annual', 'deleted', 'native', 'ratt']);
});

test('course counting reads each question once as the number of courses grows', async t => {
    let idReads = 0;
    const courses = Array.from({ length: 120 }, (_, index) => ({ _id: `course-${index}`, linkedQuestions: [] }));
    const questions = courses.flatMap(course => Array.from({ length: 20 }, (_, index) => {
        const id = `${course._id}-q${index}`;
        course.linkedQuestions.push(id);
        return {
            get _id() { idReads += 1; return id; },
            examCourseId: course._id,
            questionNumber: index,
        };
    }));
    mockQuestions(t, questions);
    const counts = await getCourseQuestionCounts(courses);

    assert.equal(Object.keys(counts).length, courses.length);
    assert.ok(Object.values(counts).every(count => count === 20));
    assert.ok(idReads <= questions.length * 2, `Read question IDs ${idReads} times for ${questions.length} questions`);
});

test('large course counts let other event-loop work run before completing', async t => {
    const linkedQuestions = Array.from({ length: 5000 }, (_, index) => `question-${index}`);
    mockQuestions(t, linkedQuestions.map(_id => ({ _id, examId: 'exam' })));
    let otherWorkRan = false;
    setImmediate(() => { otherWorkRan = true; });

    assert.deepEqual(await getCourseQuestionCounts([{ _id: 'course', linkedQuestions }]), { course: 5000 });
    assert.equal(otherWorkRan, true);
});

test('empty course lists do not query the database', async t => {
    const find = mockQuestions(t, []);
    assert.deepEqual(await getCourseQuestionCounts([]), {});
    assert.equal(find.mock.callCount(), 0);
});
