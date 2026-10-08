import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import bcrypt from 'bcrypt';
import { classifyFirebaseAdminError } from '../utils/firebaseError.js';
import { normalizeSemesterAccess } from '../utils/semesterAccess.js';
import { normalizeUserPlan } from '../utils/planAccess.js';
import { getAcademicYearFromSemesters } from '../utils/academicYear.js';

async function createUser({ firebaseError = null, initialized = true, existingUser = null, body = {} } = {}) {
  let savedUser;
  const context = vm.createContext({ console: { log() {}, error() {} }, Date });
  const synthetic = exports => new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
  }, { context });
  const source = await readFile(new URL('../controllers/userController.js', import.meta.url), 'utf8');
  const deps = {};
  for (const match of source.matchAll(/import\s*{([^}]+)}\s*from\s*"([^"]+)"/g)) {
    deps[match[2]] = synthetic(Object.fromEntries(match[1].split(',').map(value => [value.trim(), () => {}])));
  }
  for (const match of source.matchAll(/import\s+(\w+)\s+from\s*"([^"]+)"/g)) deps[match[2]] = synthetic({ default: {} });
  deps['../models/userModel.js'] = synthetic({ default: {
    findOne: async () => existingUser,
    create: async data => { savedUser = data; return { _id: 'new-user', ...data }; },
  } });
  deps['../config/firebase.js'] = synthetic({ default: { apps: initialized ? [{}] : [], auth: () => ({
    createUser: async () => { if (firebaseError) throw firebaseError; return { uid: 'firebase-user' }; },
  }) } });
  deps.bcrypt = synthetic({ default: bcrypt });
  deps['../handlers/asyncHandler.js'] = synthetic({ default: fn => fn });
  deps['../utils/firebaseError.js'] = synthetic({ classifyFirebaseAdminError });
  deps['../utils/semesterAccess.js'] = synthetic({ normalizeSemesterAccess });
  deps['../utils/academicYear.js'] = synthetic({ getAcademicYearFromSemesters, withAcademicYear: value => value });
  deps['../utils/planAccess.js'] = synthetic({ normalizeUserPlan, applyAdminPlanTransition() {}, SUPPORTED_USER_PLANS: [] });
  const controller = new vm.SourceTextModule(source, { context });
  await controller.link(name => { assert.ok(deps[name], name); return deps[name]; });
  await controller.evaluate();
  const res = { status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; } };
  await controller.namespace.UserController.createAdminUser({ body: {
    firstName: 'Test', lastName: 'Learner', email: 'learner@example.com', password: 'Secure-password-123',
    plan: 'Premium', semesters: ['S3'], isPaid: true, ...body,
  } }, res);
  return { res, savedUser };
}

for (const firebaseError of [
  Object.assign(new Error('invalid_grant: Invalid JWT Signature.'), { code: 'app/invalid-credential' }),
  new Error('Token used too early because of clock skew'),
]) {
  test('admin account receives working local credentials after ' + classifyFirebaseAdminError(firebaseError).type + ' failure', async () => {
    const { res, savedUser } = await createUser({ firebaseError });
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.firebaseWarning);
    assert.equal(res.body.data.user.firebaseCreated, false);
    assert.equal(res.body.data.user.loginMethod, 'email_password');
    assert.ok(await bcrypt.compare('Secure-password-123', savedUser.password));
    assert.equal(savedUser.firebaseUid, undefined);
    assert.deepEqual(savedUser.semesters, ['S3']);
    assert.equal(savedUser.plan, 'Premium');
    assert.equal(savedUser.emailVerified, true);
    assert.ok(savedUser.planExpiry);
    assert.equal(res.body.data.user.password, undefined);
  });
}

test('unconfigured Firebase still permits an admin-created local account', async () => {
  const { res, savedUser } = await createUser({ initialized: false });
  assert.equal(res.statusCode, 201);
  assert.ok(await bcrypt.compare('Secure-password-123', savedUser.password));
});

test('successful Firebase creation keeps the Firebase UID and local login', async () => {
  const { res, savedUser } = await createUser();
  assert.equal(res.statusCode, 201);
  assert.equal(savedUser.firebaseUid, 'firebase-user');
  assert.equal(res.body.data.user.firebaseCreated, true);
  assert.equal(res.body.firebaseWarning, undefined);
  assert.ok(await bcrypt.compare('Secure-password-123', savedUser.password));
});

test('invalid Firebase input still rejects account creation', async () => {
  const { res, savedUser } = await createUser({ firebaseError: Object.assign(new Error('Password is invalid'), { code: 'auth/invalid-password' }) });
  assert.equal(res.statusCode, 503);
  assert.equal(savedUser, undefined);
});

test('duplicate accounts are rejected before attempting Firebase creation', async () => {
  const { res, savedUser } = await createUser({ existingUser: { _id: 'existing' } });
  assert.equal(res.statusCode, 400);
  assert.equal(savedUser, undefined);
});

for (const body of [{ password: 'short' }, { email: 'invalid-email' }]) {
  test('local fallback validates credentials: ' + Object.keys(body)[0], async () => {
    const { res, savedUser } = await createUser({ initialized: false, body });
    assert.equal(res.statusCode, 400);
    assert.equal(savedUser, undefined);
  });
}
