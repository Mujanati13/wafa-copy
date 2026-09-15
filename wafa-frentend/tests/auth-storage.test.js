import test from 'node:test';
import assert from 'node:assert/strict';
import { clearStoredAuthToken, getStoredAuthToken, storeAuthToken } from '../src/utils/authStorage.js';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};

test('remembered sessions persist in local storage while ordinary sessions end with the tab', () => {
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;
  globalThis.localStorage = createStorage();
  globalThis.sessionStorage = createStorage();

  try {
    storeAuthToken('tab-token', false);
    assert.equal(globalThis.localStorage.getItem('token'), null);
    assert.equal(globalThis.sessionStorage.getItem('token'), 'tab-token');
    assert.equal(getStoredAuthToken(), 'tab-token');

    storeAuthToken('remembered-token', true);
    assert.equal(globalThis.localStorage.getItem('token'), 'remembered-token');
    assert.equal(globalThis.sessionStorage.getItem('token'), null);

    clearStoredAuthToken();
    assert.equal(getStoredAuthToken(), null);
  } finally {
    globalThis.localStorage = originalLocalStorage;
    globalThis.sessionStorage = originalSessionStorage;
  }
});
