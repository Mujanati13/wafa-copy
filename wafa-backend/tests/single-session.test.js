import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import crypto from 'node:crypto';

async function setup() {
  const users = new Map([['user', { _id: 'user' }], ['other', { _id: 'other' }]]);
  const matches = (user, filter) => Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some(condition => matches(user, condition));
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('$exists' in value) return (user[key] !== undefined) === value.$exists;
      if ('$lte' in value) return user[key] && user[key] <= value.$lte;
    }
    return value === null ? user[key] == null : String(user[key]) === String(value);
  });
  const User = {
    async findOneAndUpdate(filter, update) {
      const user = users.get(String(filter._id));
      if (!user || !matches(user, filter)) return null;
      Object.assign(user, update.$set);
      return user;
    },
    async updateOne(filter, update) {
      const user = users.get(String(filter._id));
      if (!user || !matches(user, filter)) return { modifiedCount: 0 };
      for (const key of Object.keys(update.$unset)) delete user[key];
      return { modifiedCount: 1 };
    },
    findById(id) { return { select() { return this; }, async lean() { return users.get(String(id)); } }; },
  };
  const context = vm.createContext({ process: { env: {} }, Date, console });
  const synthetic = value => new vm.SyntheticModule(['default'], function () { this.setExport('default', value); }, { context });
  const service = new vm.SourceTextModule(await readFile(new URL('../services/singleSessionService.js', import.meta.url), 'utf8'), { context });
  await service.link(name => synthetic(name === 'crypto' ? crypto : name === 'jsonwebtoken' ? { sign: () => 'token' } : User));
  await service.evaluate();
  const request = (clientId = 'phone_device_123') => ({
    headers: clientId ? { 'x-auth-client-id': clientId } : {}, session: {},
    login(user, callback) {
      this.session = { passport: { user: user._id }, save(callback) { callback(); } };
      callback();
    },
  });
  return { service: service.namespace, users, request };
}

test('login persists lease fields after Passport regenerates the session', async () => {
  const { service, request } = await setup();
  const req = request();
  const id = await service.establishSingleSession(req, { _id: 'user' });
  assert.equal(req.session.singleSessionId, id);
  assert.equal(req.session.singleSessionUserId, 'user');
  assert.equal(req.session.passport.user, 'user');
});

test('logout clears every lease field and the same phone can immediately log back in', async () => {
  const { service, users, request } = await setup();
  const req = request();
  const id = await service.establishSingleSession(req, { _id: 'user' });
  await service.releaseSingleSession('user', id);
  assert.ok(!Object.keys(users.get('user')).some(key => key.startsWith('activeSession')));
  const returningId = await service.establishSingleSession(request(), { _id: 'user' });
  assert.ok(returningId);
});

test('same browser recovers an interrupted logout through its stable device ID', async () => {
  const { service, request } = await setup();
  const firstId = await service.establishSingleSession(request(), { _id: 'user' });
  const secondId = await service.establishSingleSession(request(), { _id: 'user' });
  assert.notEqual(secondId, firstId);
});

test('cookie-only login can return using its persisted lease when logout was interrupted', async () => {
  const { service, request } = await setup();
  const req = request(null);
  const firstId = await service.establishSingleSession(req, { _id: 'user' });
  const secondId = await service.establishSingleSession(req, { _id: 'user' });
  assert.equal(secondId, firstId);
});

test('a different device remains blocked while the existing session is active', async () => {
  const { service, request } = await setup();
  await service.establishSingleSession(request(), { _id: 'user' });
  await assert.rejects(service.establishSingleSession(request('other_device_456'), { _id: 'user' }), { code: 'ACCOUNT_ALREADY_ACTIVE' });
});

test('delayed logout cannot remove a newer session on the same phone', async () => {
  const { service, users, request } = await setup();
  const firstId = await service.establishSingleSession(request(), { _id: 'user' });
  const secondId = await service.establishSingleSession(request(), { _id: 'user' });
  await service.releaseSingleSession('user', firstId);
  assert.equal(users.get('user').activeSessionId, secondId);
});

test('failed session persistence releases the claimed lease so login can be retried', async () => {
  const { service, users, request } = await setup();
  const req = request();
  req.login = function (user, callback) {
    this.session = { save(callback) { callback(new Error('session store unavailable')); } };
    callback();
  };
  await assert.rejects(service.establishSingleSession(req, { _id: 'user' }), /session store unavailable/);
  assert.equal(users.get('user').activeSessionId, undefined);
  await service.establishSingleSession(request(), { _id: 'user' });
});
