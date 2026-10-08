const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');

process.env.RECAPTCHA_SECRET_KEY = 'test-only-recaptcha-secret';
process.env.RECAPTCHA_MIN_SCORE = '0.5';

const sentEmails = [];
require('../mailer').sendMail = async (message) => {
  sentEmails.push(message);
};

const app = express();
app.use(express.json());
app.use('/auth', require('../routes/auth'));

function postJson(port, path, payload) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: '127.0.0.1',
        port,
        path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Connection: 'close' },
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(body) }));
      }
    );
    request.on('error', reject);
    request.end(JSON.stringify(payload));
  });
}

test('signup requires successful Google reCAPTCHA while accepting valid signup tokens', async (t) => {
  const originalFetch = global.fetch;
  let googleResult = { success: true, action: 'signup', score: 0.9 };
  let googleCalls = 0;
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://www.google.com/recaptcha/api/siteverify');
    const form = new URLSearchParams(options.body);
    assert.equal(form.get('secret'), 'test-only-recaptcha-secret');
    assert.ok(form.get('response'));
    googleCalls += 1;
    return { ok: true, json: async () => googleResult };
  };

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => {
    global.fetch = originalFetch;
    server.closeAllConnections();
    server.close();
  });
  const { port } = server.address();
  const userData = {
    firstName: 'Test',
    lastName: 'User',
    email: `recaptcha-${Date.now()}@example.test`,
    password: 'safe-test-password',
    recaptchaToken: 'valid-test-token',
  };

  const accepted = await postJson(port, '/auth/register', userData);
  assert.equal(accepted.status, 201);
  assert.equal(googleCalls, 1);

  const login = await postJson(port, '/auth/login', {
    email: userData.email,
    password: userData.password,
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.verificationRequired, true);
  assert.equal(googleCalls, 1, 'login must not require or execute signup reCAPTCHA');

  const otp = sentEmails.at(-1).text.match(/\b\d{6}\b/)?.[0];
  assert.ok(otp);
  const verified = await postJson(port, '/auth/verify-login-otp', {
    challengeId: login.body.challengeId,
    otp,
  });
  assert.equal(verified.status, 200);
  assert.ok(verified.body.token);

  googleResult = { success: true, action: 'signup', score: 0.49 };
  const rejected = await postJson(port, '/auth/register', {
    ...userData,
    email: `low-score-${Date.now()}@example.test`,
  });
  assert.equal(rejected.status, 403);
  assert.match(rejected.body.message, /reCAPTCHA/i);
});
