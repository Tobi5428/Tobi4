const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.TRUST_PROXY = 'true';
process.env.IP_HEADER_NAME = 'X-Forwarded-For';
process.env.ENABLE_IP_RISK_RULE = 'true';

const { app } = require('../server');

let server;
let baseUrl;

function makeToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '1h' });
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (!server) return;
  await new Promise((resolve) => server.close(resolve));
});

test('payment initiate persists risk fields and returns manual review for first-seen IP', async () => {
  const userToken = makeToken({ email: 'risk-user-a@example.com', role: 'user' });

  const tx1 = await request('/payment/initiate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
      'X-Forwarded-For': '198.51.100.10',
      'X-Device-Fingerprint': 'integration_fingerprint_token_0001',
    },
    body: JSON.stringify({
      amount: 12000,
      transactionId: 'int-risk-tx-1',
      tx_ref: 'int-risk-tx-1',
      cardFingerprint: 'cfp-integration-1',
      cardBinLast4: '1234',
    }),
  });

  assert.equal(tx1.status, 202);
  assert.equal(tx1.body.reviewStatus, 'manual_review_required');

  const list = await request('/payment/transactions', {
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });

  assert.equal(list.status, 200);
  const saved = (list.body.data || []).find((item) => item.transactionId === 'int-risk-tx-1');
  assert.ok(saved);
  assert.equal(saved.customerId, 'risk-user-a@example.com');
  assert.equal(saved.customerIp, '198.51.100.10');
  assert.equal(saved.deviceFingerprint, 'integration_fingerprint_token_0001');
  assert.equal(saved.reviewStatus, 'manual_review_required');
});

test('known IP for same customer is not flagged by NEW_IP_ADDRESS rule', async () => {
  const userToken = makeToken({ email: 'risk-user-b@example.com', role: 'user' });

  const first = await request('/payment/initiate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
      'X-Forwarded-For': '198.51.100.11',
      'X-Device-Fingerprint': 'integration_fingerprint_token_0002',
    },
    body: JSON.stringify({
      amount: 8000,
      transactionId: 'int-risk-known-1',
      tx_ref: 'int-risk-known-1',
      cardFingerprint: 'cfp-integration-2',
      cardBinLast4: '1235',
    }),
  });

  assert.equal(first.status, 202);

  const second = await request('/payment/initiate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
      'X-Forwarded-For': '198.51.100.11',
      'X-Device-Fingerprint': 'integration_fingerprint_token_0002',
    },
    body: JSON.stringify({
      amount: 8500,
      transactionId: 'int-risk-known-2',
      tx_ref: 'int-risk-known-2',
      cardFingerprint: 'cfp-integration-3',
      cardBinLast4: '1236',
    }),
  });

  assert.notEqual(second.body.reviewStatus, 'manual_review_required');
});

test('admin approve/reject review flow works and stores reviewer metadata', async () => {
  const customerToken = makeToken({ email: 'risk-user-c@example.com', role: 'user' });
  const adminToken = makeToken({ email: 'demo@example.com', role: 'admin' });

  const create = await request('/payment/initiate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${customerToken}`,
      'Content-Type': 'application/json',
      'X-Forwarded-For': '198.51.100.12',
      'X-Device-Fingerprint': 'integration_fingerprint_token_0003',
    },
    body: JSON.stringify({
      amount: 9000,
      transactionId: 'int-review-admin-1',
      tx_ref: 'int-review-admin-1',
      cardFingerprint: 'cfp-integration-4',
      cardBinLast4: '1237',
    }),
  });

  assert.equal(create.status, 202);

  const pending = await request('/payment/reviews/pending', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  assert.equal(pending.status, 200);
  const pendingTx = (pending.body.data || []).find((item) => item.transactionId === 'int-review-admin-1');
  assert.ok(pendingTx);

  const approve = await request('/payment/reviews/int-review-admin-1/approve', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reviewerNote: 'IP verified with customer profile' }),
  });

  assert.equal(approve.status, 200);
  assert.equal(approve.body.data.reviewStatus, 'approved');
  assert.equal(approve.body.data.reviewedBy, 'demo@example.com');
  assert.equal(approve.body.data.reviewerNote, 'IP verified with customer profile');

  const create2 = await request('/payment/initiate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${customerToken}`,
      'Content-Type': 'application/json',
      'X-Forwarded-For': '203.0.113.77',
      'X-Device-Fingerprint': 'integration_fingerprint_token_0004',
    },
    body: JSON.stringify({
      amount: 9100,
      transactionId: 'int-review-admin-2',
      tx_ref: 'int-review-admin-2',
      cardFingerprint: 'cfp-integration-5',
      cardBinLast4: '1238',
    }),
  });

  assert.equal(create2.status, 202);

  const reject = await request('/payment/reviews/int-review-admin-2/reject', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reviewerNote: 'Customer could not verify ownership' }),
  });

  assert.equal(reject.status, 200);
  assert.equal(reject.body.data.reviewStatus, 'rejected');
  assert.equal(reject.body.data.reviewedBy, 'demo@example.com');
  assert.equal(reject.body.data.reviewerNote, 'Customer could not verify ownership');
});
