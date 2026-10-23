import test from 'node:test';
import assert from 'node:assert/strict';
import { cachedLearnerRead, clearLearnerCache, invalidateLearnerReads } from '../services/learnerCache.js';

const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
const account = (id, plan = 'Free') => values.set('userProfile', JSON.stringify({ _id: id, plan, semesters: ['S1'] }));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test('sidebar and dashboard share one request, including simultaneous forced retries', async () => {
  clearLearnerCache(); account('one');
  const gate = deferred(); let calls = 0;
  const read = () => { calls++; return gate.promise; };
  const first = cachedLearnerRead('modules', read);
  const second = cachedLearnerRead('modules', read, { forceRefresh: true });
  assert.equal(first, second);
  gate.resolve(['module']);
  await first;
  assert.deepEqual(await cachedLearnerRead('modules', read), ['module']);
  assert.equal(calls, 1);
});

test('account changes, access changes and logout prevent late responses repopulating caches', async () => {
  clearLearnerCache(); account('one');
  const gate = deferred();
  const old = cachedLearnerRead('modules', () => gate.promise);
  account('two');
  assert.equal(await cachedLearnerRead('modules', () => 'two'), 'two');
  gate.resolve('one'); await old;
  account('one', 'Premium');
  assert.equal(await cachedLearnerRead('modules', () => 'paid'), 'paid');
  clearLearnerCache(); account('one');
  assert.equal(await cachedLearnerRead('modules', () => 'new-session'), 'new-session');
});

test('failed reads can retry; progress invalidation keeps the unchanged catalog', async () => {
  clearLearnerCache(); account('one');
  await assert.rejects(cachedLearnerRead('stats:S1', () => Promise.reject(new Error('offline'))));
  assert.equal(await cachedLearnerRead('stats:S1', () => 10), 10);
  await cachedLearnerRead('modules', () => 'catalog');
  invalidateLearnerReads(key => key.startsWith('stats:'));
  assert.equal(await cachedLearnerRead('stats:S1', () => 20), 20);
  assert.equal(await cachedLearnerRead('modules', () => 'unexpected'), 'catalog');
});

test('invalidated in-flight reads cannot replace fresh results', async () => {
  clearLearnerCache(); account('one');
  const gate = deferred();
  const old = cachedLearnerRead('stats:S1', () => gate.promise);
  invalidateLearnerReads(() => true);
  assert.equal(await cachedLearnerRead('stats:S1', () => 'fresh'), 'fresh');
  gate.resolve('stale'); await old;
  assert.equal(await cachedLearnerRead('stats:S1', () => 'unexpected'), 'fresh');
});
