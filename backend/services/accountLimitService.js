const mongoose = require('mongoose');
const AccountVerificationTier = require('../models/AccountVerificationTier');
const AccountLimitState = require('../models/AccountLimitState');
const { TIER_LIMITS, DEFAULT_TIER } = require('../constants/tierLimits');

/**
 * Core account limit service
 * Responsible for:
 * - Retrieving user's verification tier from MongoDB
 * - Checking transaction limits
 * - Tracking daily totals
 * - Preventing concurrent bypassing via atomic operations
 */

function getTodayUtcDate() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function ensureUserTierExists(email) {
  if (!mongoose.connection.readyState === 1) {
    console.warn('[AccountLimitService] MongoDB not connected');
    return null;
  }

  try {
    const tier = await AccountVerificationTier.findOne({ email });
    if (!tier) {
      // Create default TIER_1 for new users
      const newTier = await AccountVerificationTier.create({
        email,
        verificationTier: DEFAULT_TIER,
      });
      return newTier;
    }
    return tier;
  } catch (err) {
    console.error('[AccountLimitService] Error ensuring user tier:', err);
    return null;
  }
}

/**
 * Get user's current verification tier
 * Returns tier object with limits, or DEFAULT_TIER if not found
 */
async function getUserTier(email) {
  if (!email) return null;

  try {
    const tier = await ensureUserTierExists(email);
    if (!tier) return DEFAULT_TIER;
    return tier.verificationTier || DEFAULT_TIER;
  } catch (err) {
    console.error('[AccountLimitService] Error getting user tier:', err);
    return DEFAULT_TIER;
  }
}

/**
 * Get all limits applicable to a user based on their tier
 * Returns: { tierName, singleTransaction, dailyOutgoing, dailyIncoming }
 */
async function getUserLimits(email) {
  const tierKey = await getUserTier(email);
  const tierData = TIER_LIMITS[tierKey] || TIER_LIMITS[DEFAULT_TIER];

  return {
    tier: tierKey,
    ...tierData,
  };
}

/**
 * Get today's limit state for a user
 * Creates new record if doesn't exist
 */
async function getTodayLimitState(email) {
  if (!mongoose.connection.readyState === 1) {
    return null;
  }

  const today = getTodayUtcDate();
  try {
    const state = await AccountLimitState.findOneAndUpdate(
      { email, date: today },
      { $setOnInsert: { email, date: today, outgoingToday: 0, incomingToday: 0, transactionCountToday: 0 } },
      { upsert: true, new: true }
    );
    return state;
  } catch (err) {
    console.error('[AccountLimitService] Error getting limit state:', err);
    return null;
  }
}

/**
 * Get remaining limits for a user
 * Calculates: { singleTransaction, dailyOutgoingRemaining, dailyIncomingRemaining }
 */
async function getRemainingLimits(email) {
  const limits = await getUserLimits(email);
  const state = await getTodayLimitState(email);

  return {
    tier: limits.tier,
    tierName: limits.name,
    singleTransaction: limits.singleTransaction,
    dailyOutgoing: limits.dailyOutgoing,
    dailyOutgoingUsed: state?.outgoingToday || 0,
    dailyOutgoingRemaining: Math.max(0, (limits.dailyOutgoing || 0) - (state?.outgoingToday || 0)),
    dailyIncoming: limits.dailyIncoming,
    dailyIncomingUsed: state?.incomingToday || 0,
    dailyIncomingRemaining: Math.max(0, (limits.dailyIncoming || 0) - (state?.incomingToday || 0)),
  };
}

/**
 * Validate if a transaction is within user's limits
 * Returns: { allowed: boolean, reason?: string, errorCode?: string }
 * errorCode values: SINGLE_TRANSACTION_EXCEEDED, DAILY_OUTGOING_EXCEEDED, DAILY_INCOMING_EXCEEDED
 */
async function validateTransactionLimit(email, amount, transactionType) {
  if (!email || !amount || !transactionType) {
    return { allowed: false, reason: 'Invalid parameters', errorCode: 'INVALID_INPUT' };
  }

  const limits = await getUserLimits(email);
  const state = await getTodayLimitState(email);

  // Check single transaction limit
  if (amount > limits.singleTransaction) {
    return {
      allowed: false,
      reason: `Single transaction limit is ₦${limits.singleTransaction.toLocaleString()}`,
      errorCode: 'SINGLE_TRANSACTION_EXCEEDED',
    };
  }

  // Check daily outgoing limit
  if (transactionType === 'outgoing') {
    const outgoingTotal = (state?.outgoingToday || 0) + amount;
    if (outgoingTotal > limits.dailyOutgoing) {
      const remaining = Math.max(0, limits.dailyOutgoing - (state?.outgoingToday || 0));
      return {
        allowed: false,
        reason: `Daily outgoing limit exceeded. Remaining: ₦${remaining.toLocaleString()}`,
        errorCode: 'DAILY_OUTGOING_EXCEEDED',
      };
    }
  }

  // Check daily incoming limit
  if (transactionType === 'incoming') {
    const incomingTotal = (state?.incomingToday || 0) + amount;
    if (incomingTotal > limits.dailyIncoming) {
      const remaining = Math.max(0, limits.dailyIncoming - (state?.incomingToday || 0));
      return {
        allowed: false,
        reason: `Daily incoming limit exceeded. Remaining: ₦${remaining.toLocaleString()}`,
        errorCode: 'DAILY_INCOMING_EXCEEDED',
      };
    }
  }

  return { allowed: true };
}

/**
 * Record a transaction in the daily limit state
 * Uses atomic $inc operations to prevent race conditions
 * This is called ONLY AFTER a transaction is approved
 *
 * Returns: updated state or null if error
 */
async function recordTransaction(email, amount, transactionType) {
  if (!mongoose.connection.readyState === 1) {
    console.warn('[AccountLimitService] MongoDB not connected, cannot record transaction');
    return null;
  }

  const today = getTodayUtcDate();
  const updateData = { $setOnInsert: { email, date: today } };

  // Use atomic increment operations to prevent race conditions
  if (transactionType === 'outgoing') {
    updateData.$inc = { outgoingToday: amount, transactionCountToday: 1 };
  } else if (transactionType === 'incoming') {
    updateData.$inc = { incomingToday: amount, transactionCountToday: 1 };
  }

  try {
    const updated = await AccountLimitState.findOneAndUpdate(
      { email, date: today },
      updateData,
      { upsert: true, new: true }
    );
    return updated;
  } catch (err) {
    console.error('[AccountLimitService] Error recording transaction:', err);
    return null;
  }
}

/**
 * Upgrade user's verification tier
 */
async function upgradeTier(email, tierKey) {
  if (!TIER_LIMITS[tierKey]) {
    return { ok: false, reason: 'Invalid tier' };
  }

  try {
    const updated = await AccountVerificationTier.findOneAndUpdate(
      { email },
      {
        verificationTier: tierKey,
        tierUpgradedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    return { ok: true, tier: updated };
  } catch (err) {
    console.error('[AccountLimitService] Error upgrading tier:', err);
    return { ok: false, reason: err.message };
  }
}

/**
 * Get all tier configurations (for frontend reference)
 */
function getAllTierLimits() {
  return TIER_LIMITS;
}

module.exports = {
  getUserTier,
  getUserLimits,
  getRemainingLimits,
  validateTransactionLimit,
  recordTransaction,
  upgradeTier,
  getAllTierLimits,
  getTodayUtcDate,
  getTodayLimitState,
  ensureUserTierExists,
};
