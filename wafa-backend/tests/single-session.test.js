import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import express from 'express';
import session from 'express-session';
import { Passport } from 'passport';
import { once } from 'node:events';
import { identifyAuthDevice, AUTH_DEVICE_COOKIE } from '../middleware/authDeviceMiddleware.js';
import { configureTrustProxy, getSessionCookieOptions } from '../config/session.js';

process.env.JWT_SECRET = 'session-regression-test-secret';

const identify = (req) => {
  const cookies = [];
  identifyAuthDevice(req, { cookie: (name, value, options) => cookies.push({ name, value, options }) }, () => {});
  return cookies;
};

async function loadLogoutHandler(service) {
  const context = vm.createContext({ console });
  const synthetic = exports => new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
  }, { context });
  const source = await readFile(new URL('../controllers/auth.js', import.meta.url), 'utf8');
  const deps = {};
  for (const match of source.matchAll(/import\s*{([^}]+)}\s*from\s*"([^"]+)"/g)) {
    deps[match[2]] = synthetic(Object.fromEntries(match[1].split(',').map(value => [value.trim(), () => {}])));
  }
  for (const match of source.matchAll(/import\s+(\w+)\s+from\s*"([^"]+)"/g)) deps[match[2]] = synthetic({ default: {} });
  deps['../services/singleSessionService.js'] = synthetic({ ...service });
  deps['../config/session.js'] = synthetic({ getSessionCookieOptions });
  const controller = new vm.SourceTextModule(source, { context });
  await controller.link(name => deps[name]);
  await controller.evaluate();
  return controller.namespace.AuthController.logout;
}

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

test('signed device cookie recovers the same phone after local storage changes and login cookie is lost', async () => {
  const { service, request } = await setup();
  const first = request();
  const [deviceCookie] = identify(first);
  const firstId = await service.establishSingleSession(first, { _id: 'user' });
  const returning = request('regenerated_local_storage_id');
  returning.headers.cookie = `${deviceCookie.name}=${deviceCookie.value}`;
  assert.equal(identify(returning).length, 0);
  const secondId = await service.establishSingleSession(returning, { _id: 'user' });
  assert.notEqual(secondId, firstId);
  assert.equal(returning.authClientId, 'phone_device_123');
});

test('OAuth without a device header can return using the device cookie after losing its login session', async () => {
  const { service, request } = await setup();
  const first = request(null);
  const [cookie] = identify(first);
  await service.establishSingleSession(first, { _id: 'user' });
  const returning = request(null);
  returning.headers.cookie = `${cookie.name}=${cookie.value}`;
  identify(returning);
  await service.establishSingleSession(returning, { _id: 'user' });
});

test('tampered, expired, and login-token cookies cannot recover another device lease', async () => {
  const { service, request } = await setup();
  await service.establishSingleSession(request(), { _id: 'user' });
  const wrongSecret = jwt.sign({ clientId: 'phone_device_123' }, 'wrong-secret', { audience: 'auth-device', issuer: 'yourqcm' });
  const expired = jwt.sign({ clientId: 'phone_device_123' }, process.env.JWT_SECRET, { audience: 'auth-device', issuer: 'yourqcm', expiresIn: -1 });
  const accessToken = jwt.sign({ clientId: 'phone_device_123' }, process.env.JWT_SECRET);
  for (const value of [wrongSecret, expired, accessToken, '%invalid-encoding']) {
    const other = request('other_device_456');
    other.headers.cookie = `${AUTH_DEVICE_COOKIE}=${value}`;
    identify(other);
    assert.equal(other.authClientId, 'other_device_456');
    await assert.rejects(service.establishSingleSession(other, { _id: 'user' }), { code: 'ACCOUNT_ALREADY_ACTIVE' });
  }
});

test('real Passport login sends a secure session cookie through the HTTPS proxy and logout expires the domain cookie', async (t) => {
  const previous = { secure: process.env.COOKIE_SECURE, domain: process.env.COOKIE_DOMAIN };
  process.env.COOKIE_SECURE = 'true';
  process.env.COOKIE_DOMAIN = '.yourqcm.online';
  t.after(() => {
    for (const [key, value] of [['COOKIE_SECURE', previous.secure], ['COOKIE_DOMAIN', previous.domain]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  const { service } = await setup();
  const app = express();
  configureTrustProxy(app, 'false');
  const passport = new Passport();
  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser((id, done) => done(null, { _id: id }));
  app.use(session({ secret: 'test-session-secret', resave: false, saveUninitialized: false, cookie: getSessionCookieOptions() }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(identifyAuthDevice);
  app.post('/login', async (req, res) => {
    await service.establishSingleSession(req, { _id: 'user' });
    res.json({ id: req.session.singleSessionId });
  });
  app.post('/logout', await loadLogoutHandler(service));
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  const headers = { 'X-Forwarded-Proto': 'https', 'X-Auth-Client-Id': 'phone_device_123' };
  const beforeFix = await fetch(`${url}/login`, { method: 'POST', headers });
  assert.equal(beforeFix.status, 200);
  assert.ok(!beforeFix.headers.getSetCookie().some(cookie => cookie.startsWith('connect.sid=')), 'untrusted proxy drops the secure session cookie');
  configureTrustProxy(app, '1');
  const login = await fetch(`${url}/login`, { method: 'POST', headers });
  assert.equal(login.status, 200);
  const cookies = login.headers.getSetCookie();
  assert.ok(cookies.some(cookie => cookie.startsWith('connect.sid=')), 'secure Passport cookie must survive TLS termination');
  assert.ok(cookies.some(cookie => cookie.startsWith(`${AUTH_DEVICE_COOKIE}=`)));
  for (const cookie of cookies) assert.match(cookie, /Domain=\.yourqcm\.online; Path=\/; .*HttpOnly; Secure; SameSite=None/);
  const logout = await fetch(`${url}/logout`, { method: 'POST', headers: {
    ...headers, Cookie: cookies.map(cookie => cookie.split(';')[0]).join('; '),
  } });
  assert.equal(logout.status, 200);
  assert.ok(logout.headers.getSetCookie().some(cookie => cookie.startsWith('connect.sid=; Domain=.yourqcm.online; Path=/; Expires=Thu, 01 Jan 1970')));
  assert.ok(!logout.headers.getSetCookie().some(cookie => cookie.startsWith(`${AUTH_DEVICE_COOKIE}=`)), 'logout preserves the browser identity cookie');
  const returning = await fetch(`${url}/login`, { method: 'POST', headers: {
    'X-Forwarded-Proto': 'https', Cookie: cookies.find(cookie => cookie.startsWith(`${AUTH_DEVICE_COOKIE}=`)).split(';')[0],
  } });
  assert.equal(returning.status, 200);
});
