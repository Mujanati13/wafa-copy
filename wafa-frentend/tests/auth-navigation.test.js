import test from 'node:test';
import assert from 'node:assert/strict';
import { exitExam, getLoginDestination } from '../src/utils/authNavigation.js';

test('exit returns to the route that opened the exam without changing authentication', () => {
  const history = ['/dashboard/modules/anatomie', '/exam/123'];
  const token = 'existing-session';
  const storage = new Map([['token', token], ['user', '{"name":"Student"}']]);
  exitExam((delta) => {
    assert.equal(delta, -1);
    history.pop();
  });
  assert.deepEqual(history, ['/dashboard/modules/anatomie']);
  assert.equal(storage.get('token'), token);
});

test('fresh student login cannot restore an exam destination', () => {
  for (const from of ['/exam/123', '/exam/123?type=course', '/exam/123?type=qcm', '/login']) {
    assert.equal(getLoginDestination({ isAdmin: false }, from), '/dashboard/home');
  }
  assert.equal(getLoginDestination({ isAdmin: true }), '/admin/analytics');
});
