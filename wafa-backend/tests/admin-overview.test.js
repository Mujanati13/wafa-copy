import test from 'node:test';
import assert from 'node:assert/strict';
import { getOverviewActivity, getOverviewStats } from '../controllers/adminOverviewController.js';
import User from '../models/userModel.js';
import UserStats from '../models/userStatsModel.js';
import Report from '../models/reportQuestions.js';
import Explanation from '../models/explanationModel.js';
import Transaction from '../models/transactionModel.js';
import Contact from '../models/contactModel.js';

const response = () => ({ code: 200, set() { return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; } });
const models = [User, Report, Explanation, Transaction, Contact];
function mockFeed(t) {
  models.forEach((model, index) => t.mock.method(model, 'find', filter => {
    if (model === User) assert.deepEqual(filter, { isAdmin: { $ne: true } });
    if (model === Transaction) assert.deepEqual(filter.paymentMethod.$in, ['Bank Transfer', 'Contact']);
    return { select() { return this; }, sort() { return this; }, limit(n) { assert.ok(n <= 100); return this; }, populate() { return this; },
      lean: async () => [{ _id: 'same-id', name: 'Student', user: null, userId: { username: 'Student' }, createdAt: new Date(2026, 8, 10 + index), updatedAt: new Date(2030, 1, 1), status: 'pending' }],
    };
  }));
}
test('five sources merge chronologically using creation time, stable namespaced IDs and deleted-user fallback', async t => {
  mockFeed(t);
  const res = response();
  await getOverviewActivity({ query: { limit: 5 } }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.data.map(row => row.type), ['contact', 'payment', 'explanation', 'report', 'user']);
  assert.equal(new Set(res.body.data.map(row => row.id)).size, 5);
  assert.equal(res.body.data[1].user, 'Utilisateur supprimé');
});
test('filter queries only its source and rejects unknown event types', async t => {
  mockFeed(t);
  let res = response();
  await getOverviewActivity({ query: { type: 'report', limit: 1000 } }, res);
  assert.deepEqual(res.body.data.map(row => row.type), ['report']);
  assert.equal(User.find.mock.callCount(), 0);
  res = response();
  await getOverviewActivity({ query: { type: 'invalid' } }, res);
  assert.equal(res.code, 400);
});
test('empty platform has zero conversion and no fabricated activity', async t => {
  t.mock.method(User, 'countDocuments', async () => 0);
  t.mock.method(UserStats, 'aggregate', async () => []);
  const res = response();
  await getOverviewStats({}, res);
  assert.equal(res.body.data.conversionRate, 0);
  assert.equal(res.body.data.verifiedAnswers, 0);
});
test('conversion includes paid plan variants, excludes expired subscriptions and disabled accounts', async t => {
  t.mock.method(User, 'countDocuments', async filter => {
    if (filter.plan) {
      assert.ok(filter.plan.test('Premium Semestre'));
      assert.equal(filter.isAactive, true);
      assert.deepEqual(filter.isBlocked, { $ne: true });
      assert.ok(filter.$or[0].planExpiry.$gt instanceof Date);
      return 3;
    }
    return filter.isAactive ? 8 : 10;
  });
  t.mock.method(UserStats, 'aggregate', async () => [{ total: 42 }]);
  const res = response();
  await getOverviewStats({}, res);
  assert.equal(res.body.data.conversionRate, 30);
  assert.equal(res.body.data.verifiedAnswers, 42);
});
