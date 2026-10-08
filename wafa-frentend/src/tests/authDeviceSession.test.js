import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function setup({ failLogout = false } = {}) {
  const storage = () => {
    const values = new Map();
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)),
      removeItem: key => values.delete(key), key: index => [...values.keys()][index], get length() { return values.size; } };
  };
  const localStorage = storage(), sessionStorage = storage();
  const calls = [];
  const context = vm.createContext({ localStorage, sessionStorage, console: { error() {} },
    window: { dispatchEvent() {} }, Event: class {}, setTimeout: callback => callback(),
    crypto: { randomUUID: () => 'phone_browser_123' } });
  const synthetic = exports => new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
  }, { context });
  const authStorage = new vm.SourceTextModule(await readFile(new URL('../utils/authStorage.js', import.meta.url), 'utf8'), { context });
  const firebase = synthetic({ GoogleAuthProvider: class { setCustomParameters() {} }, signOut: async () => {},
    signInWithPopup: async () => ({ user: { getIdToken: async () => 'firebase-token' } }),
    sendEmailVerification() {}, sendPasswordResetEmail() {}, confirmPasswordReset() {}, verifyPasswordResetCode() {} });
  const axios = synthetic({ default: { post: async (url, body, options) => {
    calls.push({ url, body, options });
    if (failLogout && url.endsWith('/logout')) throw new Error('network unavailable');
    return { data: { token: 'jwt-token', user: { _id: 'user' } } };
  } } });
  const deps = { 'firebase/auth': firebase, '@/config/firebase': synthetic({ auth: {} }), axios,
    '@/services/userService': synthetic({ userService: { clearProfileCache() {} } }),
    '@/services/dashboardService': synthetic({ dashboardService: { clearCache() {} } }),
    '@/utils/authStorage': authStorage };
  const service = new vm.SourceTextModule(await readFile(new URL('../services/authService.js', import.meta.url), 'utf8'),
    { context, initializeImportMeta: meta => { meta.env = { VITE_API_URL: '/api/v1' }; } });
  await service.link(specifier => deps[specifier]);
  await service.evaluate();
  return { service: service.namespace, calls, localStorage, sessionStorage };
}

for (const failLogout of [false, true]) {
  test('logout preserves device identity for a returning phone (network failure: ' + failLogout + ')', async () => {
    const { service, calls, localStorage, sessionStorage } = await setup({ failLogout });
    await service.loginWithEmail('user@example.com', 'password', { rememberMe: false });
    const firstDevice = calls[0].options.headers['X-Auth-Client-Id'];
    await service.signOut();
    const logout = calls.find(call => call.url.endsWith('/logout'));
    assert.equal(logout.options.headers.Authorization, 'Bearer jwt-token');
    assert.equal(logout.options.headers['X-Auth-Client-Id'], firstDevice);
    assert.equal(localStorage.getItem('authClientId'), firstDevice);
    assert.equal(localStorage.getItem('token'), null);
    assert.equal(sessionStorage.getItem('token'), null);
    await service.loginWithEmail('user@example.com', 'password');
    assert.equal(calls.at(-1).options.headers['X-Auth-Client-Id'], firstDevice);
  });
}
