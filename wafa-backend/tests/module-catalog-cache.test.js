import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { moduleController, invalidateModuleListCache } from '../controllers/moduleController.js';
import Module from '../models/moduleModel.js';
import Exam from '../models/examParYearModel.js';
import Course from '../models/examCourseModel.js';
import Bank from '../models/qcmBanqueModel.js';
import Question from '../models/questionModule.js';

const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const query = value => ({ select() { return this; }, sort() { return this; }, lean: async () => value });
const response = () => ({ set() { return this; }, status() { return this; }, json(body) { this.body = body; return this; } });

test('an in-flight catalog read cannot repopulate the cache after a content update', async t => {
  invalidateModuleListCache();
  t.after(invalidateModuleListCache);
  const moduleId = new mongoose.Types.ObjectId(), examId = new mongoose.Types.ObjectId();
  let name = 'Old', reads = 0, counts = 0;
  const started = deferred(), pending = deferred();
  t.mock.method(Module, 'find', () => { reads++; return query([{ _id: moduleId, name }]); });
  t.mock.method(Exam, 'find', () => query([{ _id: examId, moduleId }]));
  t.mock.method(Course, 'find', () => query([]));
  t.mock.method(Bank, 'find', () => query([]));
  t.mock.method(Question, 'aggregate', () => {
    if (++counts === 1) { started.resolve(); return pending.promise; }
    return Promise.resolve([{ _id: moduleId, count: 2 }]);
  });
  const old = response();
  const work = moduleController.getAll({ query: {} }, old);
  await started.promise;
  name = 'Updated';
  invalidateModuleListCache();
  pending.resolve([{ _id: moduleId, count: 1 }]);
  await work;
  assert.equal(old.body.data[0].name, 'Old');
  const current = response();
  await moduleController.getAll({ query: {} }, current);
  assert.equal(current.body.data[0].name, 'Updated');
  assert.equal(current.body.data[0].totalQuestions, 2);
  assert.equal(reads, 2);
});
