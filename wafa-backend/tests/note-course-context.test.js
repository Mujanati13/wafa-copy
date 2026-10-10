import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import asyncHandler from '../handlers/asyncHandler.js';
import Note from '../models/noteModel.js';

const courseId = '111111111111111111111111';
const questionId = '222222222222222222222222';
const moduleId = '333333333333333333333333';
const otherCourseId = '444444444444444444444444';

async function setup({ native = false, linked = true, missing = false, notes = [] } = {}) {
  const populations = [];
  const course = { _id: courseId, moduleId, linkedQuestions: linked ? [questionId] : [] };
  const query = value => ({
    populate(...args) { populations.push(args); return this; }, sort() { return this; },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
  });
  const matches = (note, filter) => Object.entries(filter).every(([key, value]) =>
    value === null ? note[key] == null : String(note[key]) === String(value));
  const context = vm.createContext({ console });
  const synthetic = exports => new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
  }, { context });
  const deps = {
    '../models/noteModel.js': synthetic({ default: {
      async create(data) { const note = { _id: `note${notes.length}`, ...data, async save() {} }; notes.push(note); return note; },
      find(filter) { return query(notes.filter(note => matches(note, filter))); },
      findOne(filter) { return query(notes.find(note => matches(note, filter))); },
    } }),
    '../handlers/asyncHandler.js': synthetic({ default: asyncHandler }),
    './notificationController.js': synthetic({ NotificationController: { async createNotification() {} } }),
    '../models/examCourseModel.js': synthetic({ default: { findById: () => ({ select: async () => missing ? null : course }) } }),
    '../models/questionModule.js': synthetic({ default: { findById: () => ({ select: async () => ({ _id: questionId, examCourseId: native ? courseId : null }) }) } }),
  };
  const controller = new vm.SourceTextModule(await readFile(new URL('../controllers/noteController.js', import.meta.url), 'utf8'), { context });
  await controller.link(name => deps[name]);
  await controller.evaluate();
  const invoke = async (method, { body = {}, params = {}, query = {}, userId = 'user' } = {}) => {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; } };
    await controller.namespace.noteController[method]({ user: { _id: userId }, body, params, query }, res);
    return res;
  };
  return { invoke, notes, populations };
}

const draft = { title: 'Heart', content: 'My note', questionId, examCourseId: courseId };

test('course notes persist their origin for both linked yearly and native course questions', async () => {
  for (const native of [false, true]) {
    const { invoke, notes } = await setup({ native, linked: !native });
    const res = await invoke('create', { body: { ...draft, moduleId: 'untrusted-module' } });
    assert.equal(res.statusCode, 201);
    assert.equal(notes[0].examCourseId, courseId);
    assert.equal(notes[0].moduleId, moduleId);
    assert.equal(notes[0].questionId, questionId);
    assert.equal(notes[0].userId, 'user');
  }
});

test('yearly exams and standalone notes remain valid without a course reference', async () => {
  const { invoke, notes } = await setup();
  for (const body of [{ title: 'Yearly', content: 'Note', questionId, moduleId }, { title: 'Free', content: 'Note' }]) {
    assert.equal((await invoke('create', { body })).statusCode, 201);
  }
  assert.equal(notes[0].examCourseId, null);
  assert.equal(notes[1].examCourseId, null);
});

test('invalid, missing, or unrelated course references are rejected before saving', async () => {
  for (const [options, body, status] of [
    [{}, { ...draft, examCourseId: 'bad-id' }, 400],
    [{}, { ...draft, questionId: null }, 400],
    [{ missing: true }, draft, 404],
    [{ linked: false }, draft, 400],
  ]) {
    const { invoke, notes } = await setup(options);
    assert.equal((await invoke('create', { body })).statusCode, status);
    assert.equal(notes.length, 0);
  }
});

test('question notes stay separate across courses and yearly mode, including legacy records', async () => {
  const { invoke } = await setup({ notes: [
    { _id: 'yearly', userId: 'user', questionId },
    { _id: 'course', userId: 'user', questionId, examCourseId: courseId },
    { _id: 'other-course', userId: 'user', questionId, examCourseId: otherCourseId },
    { _id: 'another-user', userId: 'other', questionId, examCourseId: courseId },
  ] });
  for (const [scope, id] of [['null', 'yearly'], [courseId, 'course'], [otherCourseId, 'other-course']]) {
    const res = await invoke('getAll', { query: { questionId, examCourseId: scope } });
    assert.deepEqual(res.body.data.map(note => note._id), [id]);
  }
  assert.equal((await invoke('getAll')).body.data.length, 3);
  assert.equal((await invoke('getAll', { query: { examCourseId: 'invalid' } })).statusCode, 400);
});

test('all note detail endpoints populate course, module, yearly source, and question images', async () => {
  for (const method of ['getAll', 'getById', 'getByModule', 'getByQuestion']) {
    const { invoke, populations } = await setup({ notes: [{ _id: 'note', userId: 'user', moduleId }] });
    const res = await invoke(method, { params: { id: 'note', moduleId } });
    assert.equal(res.statusCode, 200);
    const course = populations.find(([value]) => value.path === 'examCourseId')[0];
    assert.equal(course.select, 'name moduleId');
    assert.equal(course.populate.path, 'moduleId');
    const question = populations.find(([value]) => value.path === 'questionId')[0];
    assert.ok(question.select.split(' ').includes('images'));
    assert.ok(question.populate.some(value => value.path === 'examId'));
    assert.ok(question.populate.some(value => value.path === 'examCourseId'));
  }
});

test('editing content preserves course origin and cannot edit another user note', async () => {
  const { invoke, notes } = await setup();
  await invoke('create', { body: draft });
  const id = notes[0]._id;
  assert.equal((await invoke('update', { params: { id }, body: { content: 'Updated' } })).statusCode, 200);
  assert.equal(notes[0].examCourseId, courseId);
  assert.equal(notes[0].content, 'Updated');
  assert.equal((await invoke('update', { userId: 'other', params: { id }, body: { content: 'Wrong' } })).statusCode, 404);
  assert.equal(notes[0].content, 'Updated');
});

test('the note schema stores an optional ExamCourse reference', () => {
  const path = Note.schema.path('examCourseId');
  assert.equal(path.options.ref, 'ExamCourse');
  assert.equal(path.options.default, null);
});
