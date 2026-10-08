const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REASON_CODES,
  evaluateDepositRisk,
  recordRiskEvaluation,
  markEventOutcome,
  findRiskEventByIdempotencyKey,
  withUserLock,
  __testing,
} = require('../services/riskEngine');

async function seedEvent({ userId, amount, cardFingerprint, idempotencyKey, outcome = 'attempted' }) {
  const evaluation = {
    triggeredRules: [],
    riskScore: 0,
    decision: 'ALLOW',
    reasonCodes: [],
    blockedUntil: null,
  };

  const event = await recordRiskEvaluation(
    {
      userId,
      depositId: `seed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      idempotencyKey,
      amount,
      currency: 'NGN',
      ip: '127.0.0.1',
      deviceId: 'seed-device',
      cardFingerprint,
      cardBinLast4: '1111',
      metadata: { seeded: true },
    },
    evaluation
  );

  await markEventOutcome(event._id, outcome);
  return event;
}

test.beforeEach(() => {
  __testing.resetInMemoryStores();
});

test('normal deposit is allowed', async () => {
  const evaluation = await evaluateDepositRisk({
    userId: 'alice@example.com',
    amount: 10000,
    currency: 'NGN',
    ip: '1.1.1.1',
    deviceId: 'device-a',
    cardFingerprint: 'card-a',
  });

  assert.equal(evaluation.decision, 'ALLOW');
  assert.equal(evaluation.reasonCodes.length, 0);
});

test('rapid repeat rule is triggered after many same-amount attempts', async () => {
  for (let i = 0; i < 3; i += 1) {
    await seedEvent({
      userId: 'repeat@example.com',
      amount: 75000,
      cardFingerprint: `card-${i}`,
      idempotencyKey: `repeat-seed-${i}`,
      outcome: 'attempted',
    });
  }

  const evaluation = await evaluateDepositRisk({
    userId: 'repeat@example.com',
    amount: 75000,
    currency: 'NGN',
    ip: '2.2.2.2',
    deviceId: 'device-repeat',
    cardFingerprint: 'card-4',
  });

  assert.ok(evaluation.reasonCodes.includes(REASON_CODES.RAPID_REPEAT_DEPOSITS));
});

test('high-risk pattern produces BLOCK decision', async () => {
  for (let i = 0; i < 3; i += 1) {
    await seedEvent({
      userId: 'blocked@example.com',
      amount: 600000,
      cardFingerprint: `declined-card-${i}`,
      idempotencyKey: `block-seed-${i}`,
      outcome: 'declined',
    });
  }

  const evaluation = await evaluateDepositRisk({
    userId: 'blocked@example.com',
    amount: 600000,
    currency: 'NGN',
    ip: '3.3.3.3',
    deviceId: 'device-risk',
    cardFingerprint: 'declined-card-3',
  });

  assert.equal(evaluation.decision, 'BLOCK');
  assert.ok(evaluation.reasonCodes.includes(REASON_CODES.MULTI_CARD_VELOCITY));
  assert.ok(evaluation.reasonCodes.includes(REASON_CODES.EXCESSIVE_DECLINES));
});

test('idempotency key can be reused safely under lock', async () => {
  const userId = 'lock@example.com';
  const idem = 'idem-lock-1';

  const createOnce = () =>
    withUserLock(userId, async () => {
      const existing = await findRiskEventByIdempotencyKey(userId, idem);
      if (existing) return existing;

      const evaluation = await evaluateDepositRisk({
        userId,
        amount: 50000,
        currency: 'NGN',
        ip: '4.4.4.4',
        deviceId: 'device-lock',
        cardFingerprint: 'card-lock',
      });

      return recordRiskEvaluation(
        {
          userId,
          depositId: 'dep-lock-1',
          idempotencyKey: idem,
          amount: 50000,
          currency: 'NGN',
          ip: '4.4.4.4',
          deviceId: 'device-lock',
          cardFingerprint: 'card-lock',
          cardBinLast4: '1234',
          metadata: {},
        },
        evaluation
      );
    });

  const [a, b] = await Promise.all([createOnce(), createOnce()]);

  assert.equal(String(a._id), String(b._id));
});

test('duplicate transactionId cannot create multiple risk events', async () => {
  const input = {
    userId: 'dup@example.com',
    transactionId: 'txn-dup-001',
    depositId: 'dep-dup-001',
    idempotencyKey: 'idem-dup-001',
    amount: 20000,
    currency: 'NGN',
    ip: '10.0.0.1',
    deviceId: 'device-dup',
    cardFingerprint: 'card-dup',
    cardBinLast4: '1111',
    metadata: { source: 'test' },
  };

  const evaluation = {
    triggeredRules: [],
    riskScore: 0,
    decision: 'ALLOW',
    reasonCodes: [],
    blockedUntil: null,
  };

  const first = await recordRiskEvaluation(input, evaluation);
  const second = await recordRiskEvaluation({ ...input, depositId: 'dep-dup-002' }, evaluation);

  assert.equal(String(first._id), String(second._id));
  assert.equal(__testing.getRiskEventCount(), 1);
});

test('upsert by transactionId is idempotent', async () => {
  const input = {
    userId: 'idem@example.com',
    transactionId: 'txn-idem-001',
    depositId: 'dep-idem-001',
    idempotencyKey: 'idem-001',
    amount: 12000,
    currency: 'NGN',
    ip: '10.0.0.2',
    deviceId: 'device-idem',
    cardFingerprint: 'card-idem',
    cardBinLast4: '2222',
    metadata: { source: 'test' },
  };

  const evaluation = {
    triggeredRules: [],
    riskScore: 0,
    decision: 'ALLOW',
    reasonCodes: [],
    blockedUntil: null,
  };

  const results = await Promise.all([
    recordRiskEvaluation(input, evaluation),
    recordRiskEvaluation(input, evaluation),
    recordRiskEvaluation(input, evaluation),
  ]);

  assert.equal(String(results[0]._id), String(results[1]._id));
  assert.equal(String(results[1]._id), String(results[2]._id));
  assert.equal(__testing.getRiskEventCount(), 1);
});

test('transactionId unique index is defined on RiskEvent schema', () => {
  assert.equal(__testing.hasTransactionIdUniqueIndex(), true);
});
