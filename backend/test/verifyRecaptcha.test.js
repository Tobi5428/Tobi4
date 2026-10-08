const test = require('node:test');
const assert = require('node:assert/strict');
const { getMinimumScore, verifyRecaptchaToken } = require('../middleware/verifyRecaptcha');

function createFetch(result) {
  return async (url, options) => {
    assert.equal(url, 'https://www.google.com/recaptcha/api/siteverify');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['Content-Type'], 'application/x-www-form-urlencoded');
    const parameters = new URLSearchParams(options.body);
    assert.equal(parameters.get('secret'), 'server-secret');
    assert.equal(parameters.get('response'), 'test-token');
    return { ok: true, json: async () => result };
  };
}

test('uses the default score threshold and validates configured thresholds', () => {
  assert.equal(getMinimumScore(undefined), 0.5);
  assert.equal(getMinimumScore('0.7'), 0.7);
  assert.equal(getMinimumScore('1.1'), 0.5);
});

test('accepts a successful signup token at or above the threshold', async () => {
  const result = await verifyRecaptchaToken('test-token', {
    secretKey: 'server-secret',
    minimumScore: 0.5,
    fetchImpl: createFetch({ success: true, action: 'signup', score: 0.5 }),
  });
  assert.deepEqual(result, { ok: true, score: 0.5, minimumScore: 0.5 });
});

test('rejects missing token, failed verification, wrong action and low score', async () => {
  const options = { secretKey: 'server-secret', minimumScore: 0.5 };
  assert.equal((await verifyRecaptchaToken('', options)).reason, 'missing_token');
  assert.equal((await verifyRecaptchaToken('test-token', {
    ...options,
    fetchImpl: createFetch({ success: false, 'error-codes': ['invalid-input-response'] }),
  })).reason, 'verification_failed');
  assert.equal((await verifyRecaptchaToken('test-token', {
    ...options,
    fetchImpl: createFetch({ success: true, action: 'login', score: 0.9 }),
  })).reason, 'action_mismatch');
  assert.equal((await verifyRecaptchaToken('test-token', {
    ...options,
    fetchImpl: createFetch({ success: true, action: 'signup', score: 0.49 }),
  })).reason, 'score_too_low');
});

test('does not verify tokens without the backend secret', async () => {
  const result = await verifyRecaptchaToken('test-token', { secretKey: '' });
  assert.equal(result.reason, 'not_configured');
});
