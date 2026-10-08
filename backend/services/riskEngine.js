const mongoose = require('mongoose');
const RiskEvent = require('../models/RiskEvent');
const UserRiskState = require('../models/UserRiskState');
const PaymentInstrumentFingerprint = require('../models/PaymentInstrumentFingerprint');
const DeviceIntelligence = require('../models/DeviceIntelligence');
const { getRiskConfig } = require('./riskConfig');

const REASON_CODES = {
  MULTI_CARD_VELOCITY: 'MULTI_CARD_VELOCITY',
  RAPID_REPEAT_DEPOSITS: 'RAPID_REPEAT_DEPOSITS',
  EXCESSIVE_DECLINES: 'EXCESSIVE_DECLINES',
  AMOUNT_PATTERN_ANOMALY: 'AMOUNT_PATTERN_ANOMALY',
  DEVICE_LINK_RISK: 'DEVICE_LINK_RISK',
};

const decisionRank = {
  ALLOW: 1,
  REVIEW: 2,
  BLOCK: 3,
};

const memoryRiskEvents = [];
const memoryRiskEventsByTransactionId = new Map();
const memoryUserStates = new Map();
const memoryFingerprints = new Map();
const memoryDeviceLinks = new Map();
const userLocks = new Map();

function canUseMongo() {
  return mongoose.connection.readyState === 1;
}

function nowMs() {
  return Date.now();
}

function getUserStateMemory(userId) {
  const existing = memoryUserStates.get(userId);
  if (existing) return existing;
  const initial = {
    userId,
    riskLevel: 'normal',
    blockedUntil: null,
    isAllowlisted: false,
    lastRiskScore: 0,
    lastDecision: null,
    lastReasonCodes: [],
  };
  memoryUserStates.set(userId, initial);
  return initial;
}

function normalizeEvent(event) {
  return {
    ...event,
    timestamp: new Date(event.timestamp || event.createdAt || Date.now()),
  };
}

async function getEventsByUser(userId, sinceDate) {
  if (canUseMongo()) {
    return RiskEvent.find({ userId, timestamp: { $gte: sinceDate } }).sort({ timestamp: -1 }).lean();
  }
  return memoryRiskEvents
    .filter((event) => event.userId === userId && new Date(event.timestamp) >= sinceDate)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

async function findRiskEventByIdempotencyKey(userId, idempotencyKey) {
  if (!idempotencyKey) return null;

  if (canUseMongo()) {
    return RiskEvent.findOne({ userId, idempotencyKey }).sort({ timestamp: -1 }).lean();
  }

  const found = memoryRiskEvents
    .filter((event) => event.userId === userId && event.idempotencyKey === idempotencyKey)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

  return found || null;
}

function calculateNearIdenticalAmountCount(events, amount, windowMs) {
  const lower = amount * 0.98;
  const upper = amount * 1.02;
  const since = nowMs() - windowMs;
  return events.filter((event) => {
    const ts = new Date(event.timestamp).getTime();
    return ts >= since && event.amount >= lower && event.amount <= upper;
  }).length;
}

function decideRisk(riskScore, config) {
  if (riskScore >= config.BLOCK_THRESHOLD) return 'BLOCK';
  if (riskScore >= config.REVIEW_THRESHOLD) return 'REVIEW';
  return 'ALLOW';
}

async function getOrCreateUserState(userId) {
  if (canUseMongo()) {
    return UserRiskState.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId } },
      { upsert: true, new: true }
    );
  }

  return getUserStateMemory(userId);
}

async function saveUserState(userState) {
  if (canUseMongo()) {
    await UserRiskState.updateOne(
      { userId: userState.userId },
      {
        riskLevel: userState.riskLevel,
        blockedUntil: userState.blockedUntil,
        isAllowlisted: userState.isAllowlisted,
        lastRiskScore: userState.lastRiskScore,
        lastDecision: userState.lastDecision,
        lastReasonCodes: userState.lastReasonCodes,
      }
    );
    return;
  }

  memoryUserStates.set(userState.userId, { ...userState });
}

async function saveRiskEvent(eventPayload) {
  const normalized = normalizeEvent(eventPayload);
  const transactionId = String(normalized.transactionId || normalized.depositId || '').trim();

  if (!transactionId) {
    const err = new Error('transactionId is required for risk-event writes.');
    err.code = 'MISSING_TRANSACTION_ID';
    throw err;
  }

  normalized.transactionId = transactionId;

  if (canUseMongo()) {
    const doc = await RiskEvent.findOneAndUpdate(
      { transactionId },
      { $setOnInsert: normalized },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );
    return doc.toObject();
  }

  const existingId = memoryRiskEventsByTransactionId.get(transactionId);
  if (existingId) {
    const existing = memoryRiskEvents.find((event) => String(event._id) === String(existingId));
    if (existing) return existing;
  }

  const stored = {
    ...normalized,
    _id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
  memoryRiskEvents.push(stored);
  memoryRiskEventsByTransactionId.set(transactionId, stored._id);
  return stored;
}

async function updateFingerprintStats({ userId, cardFingerprint, cardBinLast4, outcome }) {
  if (!cardFingerprint) return;

  if (canUseMongo()) {
    const updates = {
      $setOnInsert: {
        userId,
        cardFingerprint,
        cardBinLast4: cardBinLast4 || null,
        firstSeenAt: new Date(),
      },
      $set: {
        lastOutcome: outcome || 'attempted',
        lastSeenAt: new Date(),
      },
      $inc: { attemptCount: 1 },
    };
    if (outcome === 'succeeded') updates.$inc.successCount = 1;
    if (outcome === 'declined') updates.$inc.declineCount = 1;

    await PaymentInstrumentFingerprint.updateOne({ userId, cardFingerprint }, updates, { upsert: true });
    return;
  }

  const key = `${userId}:${cardFingerprint}`;
  const existing = memoryFingerprints.get(key) || {
    userId,
    cardFingerprint,
    cardBinLast4: cardBinLast4 || null,
    attemptCount: 0,
    successCount: 0,
    declineCount: 0,
    lastOutcome: null,
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
  };

  existing.attemptCount += 1;
  if (outcome === 'succeeded') existing.successCount += 1;
  if (outcome === 'declined') existing.declineCount += 1;
  existing.lastOutcome = outcome;
  existing.lastSeenAt = new Date();
  memoryFingerprints.set(key, existing);
}

async function updateDeviceLinks({ userId, deviceId, ip, geo }) {
  if (!deviceId) return;

  if (canUseMongo()) {
    await DeviceIntelligence.updateOne(
      { deviceId, userId },
      {
        $setOnInsert: { firstSeenAt: new Date(), linkCount: 0 },
        $set: { ip: ip || null, geo: geo || null, lastSeenAt: new Date() },
        $inc: { linkCount: 1 },
      },
      { upsert: true }
    );
    return;
  }

  const key = `${deviceId}:${userId}`;
  const existing = memoryDeviceLinks.get(key) || {
    deviceId,
    userId,
    ip: ip || null,
    geo: geo || null,
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    linkCount: 0,
  };
  existing.ip = ip || existing.ip;
  existing.geo = geo || existing.geo;
  existing.lastSeenAt = new Date();
  existing.linkCount += 1;
  memoryDeviceLinks.set(key, existing);
}

async function getDistinctUsersForDevice(deviceId, sinceDate) {
  if (!deviceId) return [];
  if (canUseMongo()) {
    return DeviceIntelligence.distinct('userId', { deviceId, updatedAt: { $gte: sinceDate } });
  }

  const set = new Set();
  for (const value of memoryDeviceLinks.values()) {
    if (value.deviceId === deviceId && new Date(value.lastSeenAt) >= sinceDate) {
      set.add(value.userId);
    }
  }
  return Array.from(set);
}

async function getDistinctUsersForCard(cardFingerprint, sinceDate) {
  if (!cardFingerprint) return [];
  if (canUseMongo()) {
    return PaymentInstrumentFingerprint.distinct('userId', {
      cardFingerprint,
      lastSeenAt: { $gte: sinceDate },
    });
  }

  const set = new Set();
  for (const value of memoryFingerprints.values()) {
    if (value.cardFingerprint === cardFingerprint && new Date(value.lastSeenAt) >= sinceDate) {
      set.add(value.userId);
    }
  }
  return Array.from(set);
}

function computeDecision(maxDecision, candidate) {
  return decisionRank[candidate] > decisionRank[maxDecision] ? candidate : maxDecision;
}

async function evaluateDepositRisk(input) {
  const config = await getRiskConfig();
  const now = nowMs();
  const userId = input.userId;
  const amount = Number(input.amount || 0);

  const userState = await getOrCreateUserState(userId);
  if (userState.isAllowlisted) {
    return {
      riskScore: 0,
      triggeredRules: [],
      reasonCodes: [],
      decision: 'ALLOW',
      userState,
      config,
      blockedUntil: userState.blockedUntil,
    };
  }

  if (userState.blockedUntil && new Date(userState.blockedUntil).getTime() > now) {
    return {
      riskScore: config.BLOCK_THRESHOLD,
      triggeredRules: ['ACTIVE_COOLDOWN_BLOCK'],
      reasonCodes: [REASON_CODES.EXCESSIVE_DECLINES],
      decision: 'BLOCK',
      userState,
      config,
      blockedUntil: userState.blockedUntil,
    };
  }

  const lookback24h = new Date(now - 24 * 60 * 60 * 1000);
  const lookback1h = new Date(now - 60 * 60 * 1000);
  const lookback10m = new Date(now - 10 * 60 * 1000);
  const lookback5m = new Date(now - 5 * 60 * 1000);
  const lookback15m = new Date(now - 15 * 60 * 1000);

  const events24h = await getEventsByUser(userId, lookback24h);
  const events1h = events24h.filter((e) => new Date(e.timestamp) >= lookback1h);
  const events10m = events24h.filter((e) => new Date(e.timestamp) >= lookback10m);
  const events5m = events24h.filter((e) => new Date(e.timestamp) >= lookback5m);
  const declines15m = events24h.filter(
    (e) => new Date(e.timestamp) >= lookback15m && (e.paymentOutcome === 'declined' || e.paymentOutcome === 'blocked')
  );

  let riskScore = 0;
  const triggeredRules = [];
  const reasonCodes = [];

  const distinctCards24h = new Set(events24h.map((e) => e.cardFingerprint).filter(Boolean));
  if (input.cardFingerprint) distinctCards24h.add(input.cardFingerprint);

  const distinctCards1h = new Set(events1h.map((e) => e.cardFingerprint).filter(Boolean));
  if (input.cardFingerprint) distinctCards1h.add(input.cardFingerprint);

  const failedIn1h = events1h.some((e) => e.paymentOutcome === 'declined' || e.paymentOutcome === 'blocked');

  if (
    distinctCards24h.size >= config.CARD_COUNT_WINDOW_24H ||
    (distinctCards1h.size >= config.CARD_COUNT_WINDOW_1H && failedIn1h)
  ) {
    riskScore += config.WEIGHT_MULTI_CARD_VELOCITY;
    triggeredRules.push('MULTI_CARD_RULE');
    reasonCodes.push(REASON_CODES.MULTI_CARD_VELOCITY);
  }

  const nearIdentical5mCount = calculateNearIdenticalAmountCount(events5m, amount, 5 * 60 * 1000);

  if (
    events10m.length + 1 >= config.DEPOSIT_COUNT_WINDOW_10M ||
    nearIdentical5mCount + 1 >= config.DEPOSIT_COUNT_WINDOW_5M
  ) {
    riskScore += config.WEIGHT_RAPID_REPEAT_DEPOSITS;
    triggeredRules.push('RAPID_REPEAT_RULE');
    reasonCodes.push(REASON_CODES.RAPID_REPEAT_DEPOSITS);
  }

  if (declines15m.length + (input.previousOutcome === 'declined' ? 1 : 0) >= config.DECLINE_WINDOW_15M) {
    riskScore += config.WEIGHT_EXCESSIVE_DECLINES;
    triggeredRules.push('DECLINE_STREAK_RULE');
    reasonCodes.push(REASON_CODES.EXCESSIVE_DECLINES);
  }

  const totalAmount1h = events1h.reduce((sum, e) => sum + Number(e.amount || 0), amount);
  const totalAmount24h = events24h.reduce((sum, e) => sum + Number(e.amount || 0), amount);
  if (totalAmount1h > config.AMOUNT_THRESHOLD_1H || totalAmount24h > config.AMOUNT_THRESHOLD_24H) {
    riskScore += config.WEIGHT_AMOUNT_PATTERN_ANOMALY;
    triggeredRules.push('AMOUNT_VELOCITY_RULE');
    reasonCodes.push(REASON_CODES.AMOUNT_PATTERN_ANOMALY);
  }

  if (input.deviceId || input.cardFingerprint) {
    const usersOnDevice = await getDistinctUsersForDevice(input.deviceId, lookback1h);
    const usersOnCard = await getDistinctUsersForCard(input.cardFingerprint, lookback1h);
    const hasCrossUserLink = usersOnDevice.filter((u) => u !== userId).length > 0 || usersOnCard.filter((u) => u !== userId).length > 0;

    const recentIp = events24h[0]?.ip;
    const rapidRecent = events10m.length + 1 >= config.DEPOSIT_COUNT_WINDOW_10M;
    const suddenIpChange = Boolean(recentIp && input.ip && recentIp !== input.ip && rapidRecent);

    if (hasCrossUserLink || suddenIpChange) {
      riskScore += config.WEIGHT_DEVICE_LINK_RISK;
      triggeredRules.push('DEVICE_LINK_RULE');
      reasonCodes.push(REASON_CODES.DEVICE_LINK_RISK);
    }
  }

  const decision = decideRisk(riskScore, config);
  const blockedUntil =
    decision === 'BLOCK'
      ? new Date(now + config.TEMP_BLOCK_HOURS * 60 * 60 * 1000)
      : userState.blockedUntil;

  return {
    riskScore,
    triggeredRules,
    reasonCodes,
    decision,
    userState,
    config,
    blockedUntil,
  };
}

async function applyUserRiskDecision(userId, evaluation) {
  const state = await getOrCreateUserState(userId);
  state.lastRiskScore = evaluation.riskScore;
  state.lastDecision = evaluation.decision;
  state.lastReasonCodes = evaluation.reasonCodes;

  if (evaluation.decision === 'BLOCK') {
    state.riskLevel = 'blocked';
    state.blockedUntil = evaluation.blockedUntil;
  } else if (evaluation.decision === 'REVIEW') {
    state.riskLevel = 'review';
  } else if (!state.blockedUntil || new Date(state.blockedUntil).getTime() <= nowMs()) {
    state.riskLevel = 'normal';
    state.blockedUntil = null;
  }

  await saveUserState(state);
  return state;
}

async function recordRiskEvaluation(input, evaluation) {
  const transactionId = String(input.transactionId || input.depositId || '').trim();

  const event = await saveRiskEvent({
    userId: input.userId,
    transactionId,
    depositId: input.depositId,
    idempotencyKey: input.idempotencyKey || null,
    timestamp: new Date(),
    triggeredRules: evaluation.triggeredRules,
    riskScore: evaluation.riskScore,
    decision: evaluation.decision,
    reasonCodes: evaluation.reasonCodes,
    ip: input.ip || null,
    deviceId: input.deviceId || null,
    cardFingerprint: input.cardFingerprint || null,
    cardBinLast4: input.cardBinLast4 || null,
    amount: input.amount,
    currency: input.currency || 'NGN',
    paymentOutcome: evaluation.decision === 'BLOCK' ? 'blocked' : evaluation.decision === 'REVIEW' ? 'review' : 'attempted',
    metadata: input.metadata || {},
  });

  await applyUserRiskDecision(input.userId, evaluation);
  await updateDeviceLinks({ userId: input.userId, deviceId: input.deviceId, ip: input.ip, geo: input.geo });

  return event;
}

async function markEventOutcome(eventId, outcome) {
  if (canUseMongo()) {
    await RiskEvent.updateOne({ _id: eventId }, { paymentOutcome: outcome });
    return;
  }

  const found = memoryRiskEvents.find((event) => String(event._id) === String(eventId));
  if (found) found.paymentOutcome = outcome;
}

async function markEventOutcomeByTransactionId(transactionId, outcome) {
  if (canUseMongo()) {
    await RiskEvent.updateOne({ transactionId }, { paymentOutcome: outcome });
    return;
  }

  for (const event of memoryRiskEvents) {
    if (event.transactionId === transactionId) {
      event.paymentOutcome = outcome;
    }
  }
}

async function withUserLock(userId, fn) {
  const current = userLocks.get(userId) || Promise.resolve();
  let release;
  const blocker = new Promise((resolve) => {
    release = resolve;
  });

  const queued = current.then(() => blocker);
  userLocks.set(userId, queued);

  try {
    await current;
    return await fn();
  } finally {
    release();
    if (userLocks.get(userId) === queued) {
      userLocks.delete(userId);
    }
  }
}

function resetInMemoryStores() {
  memoryRiskEvents.length = 0;
  memoryRiskEventsByTransactionId.clear();
  memoryUserStates.clear();
  memoryFingerprints.clear();
  memoryDeviceLinks.clear();
  userLocks.clear();
}

function getRiskEventCount() {
  return memoryRiskEvents.length;
}

function hasTransactionIdUniqueIndex() {
  const indexes = RiskEvent.schema.indexes();
  return indexes.some(
    ([fields, options]) =>
      fields?.transactionId === 1 &&
      options?.unique === true &&
      options?.name === 'ux_riskevents_transactionId'
  );
}

async function setAllowlist(userId, value) {
  const state = await getOrCreateUserState(userId);
  state.isAllowlisted = Boolean(value);
  if (state.isAllowlisted) {
    state.riskLevel = 'normal';
    state.blockedUntil = null;
  }
  await saveUserState(state);
  return state;
}

async function unblockUser(userId) {
  const state = await getOrCreateUserState(userId);
  state.riskLevel = 'normal';
  state.blockedUntil = null;
  state.lastDecision = 'ALLOW';
  await saveUserState(state);
  return state;
}

async function getUserRiskState(userId) {
  return getOrCreateUserState(userId);
}

async function listRiskEvents({ limit = 100, userId, decision }) {
  if (canUseMongo()) {
    const filter = {};
    if (userId) filter.userId = userId;
    if (decision) filter.decision = decision;
    return RiskEvent.find(filter).sort({ timestamp: -1 }).limit(limit).lean();
  }

  return memoryRiskEvents
    .filter((event) => (!userId || event.userId === userId) && (!decision || event.decision === decision))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

module.exports = {
  REASON_CODES,
  evaluateDepositRisk,
  findRiskEventByIdempotencyKey,
  recordRiskEvaluation,
  markEventOutcome,
  markEventOutcomeByTransactionId,
  updateFingerprintStats,
  withUserLock,
  setAllowlist,
  unblockUser,
  getUserRiskState,
  listRiskEvents,
  getRiskConfig,
  __testing: {
    resetInMemoryStores,
    getRiskEventCount,
    hasTransactionIdUniqueIndex,
  },
};
