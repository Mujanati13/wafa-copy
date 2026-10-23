import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { UserController } from '../controllers/userController.js';
import User from '../models/userModel.js';
import UserStats from '../models/userStatsModel.js';
import Course from '../models/examCourseModel.js';
import AnnualExam from '../models/examParYearModel.js';
import Bank from '../models/qcmBanqueModel.js';

test('compact learner statistics preserve rank and progress while legacy callers retain answers', async t => {
  const examId = new mongoose.Types.ObjectId();
  const answers = new Map([['question', { selectedAnswers: [0], isVerified: false, examId }]]);
  t.mock.method(UserStats, 'findOne', async () => ({ answeredQuestions: answers, moduleProgress: [], totalPoints: 10 }));
  t.mock.method(User, 'aggregate', async () => [{ ahead: [], total: [{ count: 1 }] }]);
  for (const model of [Course, AnnualExam, Bank]) {
    t.mock.method(model, 'find', () => ({ select() { return this; }, populate() { return this; }, lean: async () => [] }));
  }
  const request = async query => {
    const res = { set() { return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await UserController.getMyStats({ user: { _id: new mongoose.Types.ObjectId(), semesters: ['S1'] }, query }, res);
    assert.equal(res.code, 200, JSON.stringify(res.body));
    return res.body.data;
  };
  const legacy = await request({});
  const compact = await request({ summary: 'true' });
  assert.deepEqual(compact.stats, legacy.stats);
  assert.equal(compact.stats.rank, 1);
  assert.ok(legacy.answeredQuestions.question);
  assert.equal(Object.hasOwn(compact, 'answeredQuestions'), false);
});
