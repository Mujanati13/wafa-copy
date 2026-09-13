import test from 'node:test';
import assert from 'node:assert/strict';
import { exitExam, getLoginDestination } from '../src/utils/authNavigation.js';

test('exit replaces the exam with dashboard even when login is the preceding history entry', () => {
  const history = ['/login', '/exam/123'];
  const token = 'existing-session';
  const storage = new Map([['token', token], ['user', '{"name":"Student"}']]);
  exitExam((path, options) => {
    assert.equal(options.replace, true);
    history[history.length - 1] = path;
  });
  assert.deepEqual(history, ['/login', '/dashboard/home']);
  assert.equal(storage.get('token'), token);
});

test('fresh student login cannot restore an exam destination', () => {
  for (const from of ['/exam/123', '/exam/123?type=course', '/exam/123?type=qcm', '/login']) {
    assert.equal(getLoginDestination({ isAdmin: false }, from), '/dashboard/home');
  }
  assert.equal(getLoginDestination({ isAdmin: true }), '/admin/analytics');
});
