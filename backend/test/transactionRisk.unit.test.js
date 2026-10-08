const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeIp,
  extractCustomerIp,
  evaluateTransactionRisk,
  isValidDeviceFingerprint,
  RISK_FLAGS,
} = require('../services/transactionRisk');
const Transaction = require('../models/Transaction');

test('normalizeIp handles IPv6-mapped IPv4', () => {
  assert.equal(normalizeIp('::ffff:192.168.1.20'), '192.168.1.20');
  assert.equal(normalizeIp('::1'), '127.0.0.1');
});

test('extractCustomerIp uses trusted proxy header only when enabled', () => {
  process.env.TRUST_PROXY = 'false';
  process.env.IP_HEADER_NAME = 'X-Forwarded-For';

  const reqNoTrust = {
    headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.2' },
    socket: { remoteAddress: '::ffff:10.1.1.1' },
    ip: '::ffff:10.1.1.1',
  };
  assert.equal(extractCustomerIp(reqNoTrust), '10.1.1.1');

  process.env.TRUST_PROXY = 'true';
  const reqTrusted = {
    headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.2' },
    socket: { remoteAddress: '::ffff:10.1.1.1' },
    ip: '::ffff:10.1.1.1',
  };
  assert.equal(extractCustomerIp(reqTrusted), '203.0.113.9');
});

test('device fingerprint validator enforces format and length', () => {
  assert.equal(isValidDeviceFingerprint('short'), false);
  assert.equal(isValidDeviceFingerprint('valid_fingerprint_token_12345'), true);
  assert.equal(isValidDeviceFingerprint('invalid***fingerprint###'), false);
});

test('first-seen IP for customer triggers manual review', async () => {
  process.env.ENABLE_IP_RISK_RULE = 'true';
  const result = await evaluateTransactionRisk({
    customerId: 'cust-1',
    customerIp: '198.51.100.8',
    deviceFingerprint: 'valid_fingerprint_token_12345',
    hasKnownCustomerIp: async () => false,
  });

  assert.ok(result.riskFlags.includes(RISK_FLAGS.NEW_IP_ADDRESS));
  assert.equal(result.reviewStatus, 'manual_review_required');
  assert.equal(result.reviewReason, 'New IP address detected for customer');
});

test('known IP for customer does not trigger NEW_IP_ADDRESS flag', async () => {
  process.env.ENABLE_IP_RISK_RULE = 'true';
  const result = await evaluateTransactionRisk({
    customerId: 'cust-1',
    customerIp: '198.51.100.8',
    deviceFingerprint: 'valid_fingerprint_token_12345',
    hasKnownCustomerIp: async () => true,
  });

  assert.equal(result.riskFlags.includes(RISK_FLAGS.NEW_IP_ADDRESS), false);
  assert.equal(result.reviewStatus, 'none');
  assert.equal(result.reviewReason, null);
});

test('transactions schema contains required indexes', () => {
  const indexes = Transaction.schema.indexes();

  const hasCustomerCreatedAt = indexes.some(([fields]) => fields.customerId === 1 && fields.createdAt === -1);
  const hasCustomerIp = indexes.some(([fields]) => fields.customerId === 1 && fields.customerIp === 1);
  const hasReviewStatus = indexes.some(([fields]) => fields.reviewStatus === 1 && fields.createdAt === -1);

  assert.equal(hasCustomerCreatedAt, true);
  assert.equal(hasCustomerIp, true);
  assert.equal(hasReviewStatus, true);
});
