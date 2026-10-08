const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

process.env.FLW_SECRET_KEY = 'test-only-flw-secret';
process.env.FLW_WEBHOOK_SECRET_HASH = 'test-only-webhook-hash';
process.env.ENABLE_IP_RISK_RULE = 'false';
mongoose.set('bufferCommands', false);

const originalFetch = global.fetch;
const providerCalls = [];
const providerTransactions = new Map();
let checkoutShouldFail = false;

global.fetch = async (input, options = {}) => {
  const url = String(input);
  if (!url.startsWith('https://api.flutterwave.com/v3/')) {
    return originalFetch(input, options);
  }

  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body) : null;
  providerCalls.push({ url, method, headers: options.headers, body });

  if (url.endsWith('/payments') && method === 'POST') {
    if (checkoutShouldFail) {
      return new Response(JSON.stringify({ status: 'error' }), { status: 401 });
    }
    return new Response(
      JSON.stringify({
        status: 'success',
        data: { link: 'https://checkout.flutterwave.com/v3/hosted/pay/test-link' },
      }),
      { status: 200 }
    );
  }

  const providerId = url.match(/\/transactions\/(\d+)\/verify$/)?.[1];
  const transaction = [...providerTransactions.values()].find(
    (item) => String(item.id) === providerId
  );
  if (!transaction) {
    return new Response(JSON.stringify({ status: 'error' }), { status: 404 });
  }
  return new Response(JSON.stringify({ status: 'success', data: transaction }), { status: 200 });
};

const { app } = require('../server');

let server;
let baseUrl;
const customerEmail = 'flutterwave-integration@example.com';
const token = jwt.sign({ email: customerEmail, role: 'user' }, process.env.JWT_SECRET || 'dev_secret');

async function request(path, options = {}) {
  const response = await originalFetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function initiatePayment(reference, idempotencyKey = reference) {
  return request('/payment/initiate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      'X-Device-Fingerprint': `flw-integration-${reference}`,
    },
    body: JSON.stringify({
      amount: 1200,
      email: customerEmail,
      firstName: 'Test',
      lastName: 'Customer',
      phone: '08000000000',
      currency: 'NGN',
    }),
  });
}

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

test.after(async () => {
  global.fetch = originalFetch;
  if (server) await new Promise((resolve) => server.close(resolve));
});

test('creates hosted checkout and only settles after server-side verification', async () => {
  const result = await initiatePayment('flw-checkout-one');

  assert.equal(result.status, 200);
  assert.equal(result.body.data.link, 'https://checkout.flutterwave.com/v3/hosted/pay/test-link');
  assert.equal(result.body.data.status, 'pending');
  const checkoutCall = providerCalls.find((call) => call.url.endsWith('/payments'));
  assert.equal(checkoutCall.body.email, customerEmail);
  assert.equal(checkoutCall.body.amount, 1200);
  assert.equal(checkoutCall.body.currency, 'NGN');
  assert.equal(checkoutCall.headers.Authorization.startsWith('Bearer '), true);

  const pending = await request('/payment/transactions', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const saved = pending.body.data.find((item) => item.transactionId === result.body.data.reference);
  assert.equal(saved.status, 'pending');

  providerTransactions.set(result.body.data.reference, {
    id: 9001,
    tx_ref: result.body.data.reference,
    amount: 1200,
    currency: 'NGN',
    status: 'successful',
    flw_ref: 'verified-reference-9001',
  });
  const verified = await request('/payment/verify', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: result.body.data.reference,
      providerTransactionId: '9001',
    }),
  });
  assert.equal(verified.status, 200);
  assert.equal(verified.body.success, true);
  assert.equal(verified.body.data.status, 'successful');
});

test('rejects a mismatched provider amount without settling the transaction', async () => {
  const initiated = await initiatePayment('flw-checkout-mismatch');
  providerTransactions.set(initiated.body.data.reference, {
    id: 9002,
    tx_ref: initiated.body.data.reference,
    amount: 1201,
    currency: 'NGN',
    status: 'successful',
  });

  const response = await request('/payment/verify', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: initiated.body.data.reference,
      providerTransactionId: '9002',
    }),
  });
  assert.equal(response.status, 409);
  assert.equal(response.body.code, 'PAYMENT_DETAILS_MISMATCH');
});

test('verifies webhook signature and processes valid webhook delivery idempotently', async () => {
  const initiated = await initiatePayment('flw-webhook-one');
  providerTransactions.set(initiated.body.data.reference, {
    id: 9003,
    tx_ref: initiated.body.data.reference,
    amount: 1200,
    currency: 'NGN',
    status: 'successful',
    flw_ref: 'verified-reference-9003',
  });
  const payload = {
    event: 'charge.completed',
    data: { id: 9003, tx_ref: initiated.body.data.reference },
  };

  const rejected = await request('/payment/webhook/flutterwave', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'verif-hash': 'wrong-hash' },
    body: JSON.stringify(payload),
  });
  assert.equal(rejected.status, 401);

  const accepted = await request('/payment/webhook/flutterwave', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'verif-hash': process.env.FLW_WEBHOOK_SECRET_HASH },
    body: JSON.stringify(payload),
  });
  assert.equal(accepted.status, 200);

  const duplicate = await request('/payment/webhook/flutterwave', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'verif-hash': process.env.FLW_WEBHOOK_SECRET_HASH },
    body: JSON.stringify(payload),
  });
  assert.equal(duplicate.status, 200);

  const transactions = await request('/payment/transactions', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const saved = transactions.body.data.find(
    (item) => item.transactionId === initiated.body.data.reference
  );
  assert.equal(saved.status, 'successful');
});

test('provider checkout failure leaves the local transaction pending', async () => {
  checkoutShouldFail = true;
  const result = await initiatePayment('flw-checkout-failure');
  checkoutShouldFail = false;

  assert.equal(result.status, 502);
  const checkoutCall = providerCalls.filter((call) => call.url.endsWith('/payments')).at(-1);
  const transactions = await request('/payment/transactions', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const saved = transactions.body.data.find(
    (item) => item.transactionId === checkoutCall.body.tx_ref
  );
  assert.equal(saved.status, 'pending');
});
