import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import express from 'express';
import { once } from 'node:events';
import Question from '../models/questionModule.js';
import ExamParYear from '../models/examParYearModel.js';
import ExamCourse from '../models/examCourseModel.js';
import QCMBanque from '../models/qcmBanqueModel.js';
import asyncHandler from '../handlers/asyncHandler.js';
import { isAdmin } from '../middleware/authMiddleware.js';
import { getQuestionReferences } from '../services/questionReferenceService.js';

const questionId = '111111111111111111111111';
const examId = '222222222222222222222222';
const courseId = '333333333333333333333333';
const otherCourseId = '444444444444444444444444';
const query = value => ({ select() { return this; }, sort() { return this; }, lean: async () => value });

const mockCatalog = (t, { question = { _id: questionId, examId }, yearlyExam = null, courses = [], bank = null } = {}) => {
  t.mock.method(Question, 'findById', () => query(question));
  t.mock.method(ExamParYear, 'findById', () => query(yearlyExam));
  t.mock.method(QCMBanque, 'findById', () => query(bank));
  return t.mock.method(ExamCourse, 'find', filter => query(courses.filter(course => filter.$or.some(condition =>
    condition.linkedQuestions ? (course.linkedQuestions || []).includes(String(condition.linkedQuestions))
      : condition._id.$in.map(String).includes(course._id))).map(({ _id, name }) => ({ _id, name }))));
};

test('references include the yearly exam and all linked courses in one course query', async t => {
  const find = mockCatalog(t, { yearlyExam: { _id: examId, name: '2026 normal', year: 2026 }, courses: [
    { _id: courseId, name: 'le coeur', linkedQuestions: [questionId] },
    { _id: otherCourseId, name: 'les poumons', linkedQuestions: [questionId] },
    { _id: 'unrelated', name: 'Unrelated topic', linkedQuestions: ['different-question'] },
  ] });
  const result = await getQuestionReferences(questionId);
  assert.equal(result.yearlyExam.name, '2026 normal');
  assert.deepEqual(result.courses.map(course => course.name), ['le coeur', 'les poumons']);
  assert.equal(find.mock.callCount(), 1);
});

for (const legacy of [false, true]) {
  test('native course references work without a yearly exam (legacy examId: ' + legacy + ')', async t => {
    mockCatalog(t, { question: { _id: questionId, [legacy ? 'examId' : 'examCourseId']: courseId }, courses: [
      { _id: courseId, name: 'le coeur', linkedQuestions: [questionId] },
      { _id: otherCourseId, name: 'les poumons', linkedQuestions: [questionId] },
    ] });
    const result = await getQuestionReferences(questionId);
    assert.equal(result.yearlyExam, null);
    assert.equal(result.courses.length, 2, 'a course linked both directly and by question ID appears once');
    assert.equal(result.courses[0].name, 'le coeur');
  });
}

test('a direct course is included even when it has no linkedQuestions entry', async t => {
  mockCatalog(t, { question: { _id: questionId, examCourseId: courseId }, courses: [{ _id: courseId, name: 'le coeur' }] });
  assert.deepEqual((await getQuestionReferences(questionId)).courses, [{ _id: courseId, name: 'le coeur' }]);
});

test('unmapped yearly questions return an empty course list', async t => {
  mockCatalog(t, { yearlyExam: { _id: examId, name: '2026 normal' } });
  const result = await getQuestionReferences(questionId);
  assert.equal(result.yearlyExam.name, '2026 normal');
  assert.deepEqual(result.courses, []);
});

test('bank questions preserve their bank reference', async t => {
  mockCatalog(t, { question: { _id: questionId, qcmBanqueId: examId }, bank: { _id: examId, name: 'QCM Banque' } });
  const result = await getQuestionReferences(questionId);
  assert.equal(result.yearlyExam, null);
  assert.equal(result.qcmBanque.name, 'QCM Banque');
});

test('missing questions return null without querying courses', async t => {
  const find = mockCatalog(t, { question: null });
  assert.equal(await getQuestionReferences(questionId), null);
  assert.equal(find.mock.callCount(), 0);
});

test('the reference endpoint validates IDs, handles missing questions, and requires admin access', async t => {
  const context = vm.createContext({ console });
  const synthetic = exports => new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
  }, { context });
  const source = await readFile(new URL('../controllers/questionController.js', import.meta.url), 'utf8');
  const deps = {};
  for (const match of source.matchAll(/import\s*{([^}]+)}\s*from\s*"([^"]+)"/g)) {
    deps[match[2]] = synthetic(Object.fromEntries(match[1].split(',').map(value => [value.trim(), () => {}])));
  }
  for (const match of source.matchAll(/import\s+(\w+)\s+from\s*"([^"]+)"/g)) deps[match[2]] = synthetic({ default: {} });
  deps['../handlers/asyncHandler.js'] = synthetic({ default: asyncHandler });
  deps['../services/questionReferenceService.js'] = synthetic({ getQuestionReferences: async id =>
    id === questionId ? { yearlyExam: { name: '2026 normal' }, courses: [{ name: 'le coeur' }] } : null });
  const controller = new vm.SourceTextModule(source, { context });
  await controller.link(name => deps[name]);
  await controller.evaluate();
  const route = new vm.SourceTextModule(await readFile(new URL('../routes/questionRoute.js', import.meta.url), 'utf8'), { context });
  const noop = (req, res, next) => next();
  const routeDeps = {
    express: synthetic({ default: express }),
    '../controllers/questionController.js': synthetic({ questionController: controller.namespace.questionController }),
    '../middleware/validateSchema.js': synthetic({ default: () => noop }),
    '../validators/QuestionSchema.js': synthetic({ default: {} }),
    '../middleware/authMiddleware.js': synthetic({ isAdmin, hasExamAccess: noop, isAuthenticated: (req, res, next) => {
      if (!req.headers.authorization) return res.status(401).end();
      req.user = { isAdmin: req.headers.authorization === 'Bearer admin' };
      next();
    } }),
    '../middleware/uploadMiddleware.js': synthetic({ uploadQuestionImages: noop, uploadExcelFile: noop }),
  };
  await route.link(name => routeDeps[name]);
  await route.evaluate();
  const app = express();
  app.use('/questions', route.namespace.default);
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  await once(server, 'listening');
  const request = (id, authorization = 'Bearer admin') => fetch(`http://127.0.0.1:${server.address().port}/questions/references/${id}`,
    { headers: authorization ? { authorization } : {} });
  const success = await request(questionId);
  assert.equal(success.status, 200);
  assert.equal((await success.json()).data.courses[0].name, 'le coeur');
  assert.equal((await request('invalid')).status, 400);
  assert.equal((await request(otherCourseId)).status, 404);
  assert.equal((await request(questionId, 'Bearer learner')).status, 403);
  assert.equal((await request(questionId, null)).status, 401);
});
