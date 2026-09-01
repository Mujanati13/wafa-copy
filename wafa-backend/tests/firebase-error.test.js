import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyFirebaseAdminError } from '../utils/firebaseError.js';

test('classifies an invalid JWT signature as a credential failure', () => {
  const result = classifyFirebaseAdminError(new Error('invalid_grant: Invalid JWT Signature.'));
  assert.equal(result.type, 'credentials');
});

test('classifies explicit clock-skew messages as a clock failure', () => {
  const result = classifyFirebaseAdminError(new Error('Token used too early because of clock skew'));
  assert.equal(result.type, 'clock');
});

test('returns a safe generic configuration failure for unknown errors', () => {
  const result = classifyFirebaseAdminError(new Error('unexpected upstream response'));
  assert.equal(result.type, 'configuration');
  assert.doesNotMatch(result.detail, /unexpected upstream response/);
});

