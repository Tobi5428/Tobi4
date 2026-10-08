const express = require('express');
const verifyJwt = require('../middleware/verifyJwt');
const {
  getUserTier,
  getUserLimits,
  getRemainingLimits,
  validateTransactionLimit,
  getAllTierLimits,
} = require('../services/accountLimitService');

const router = express.Router();

/**
 * GET /account-limits/tier
 * Returns user's current tier and all tier limit configurations
 * Authoritative response from backend
 */
router.get('/tier', verifyJwt, async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return res.status(401).json({ message: 'User email not found in token' });
    }

    const userTier = await getUserTier(email);
    const allTiers = getAllTierLimits();

    return res.json({
      ok: true,
      userTier,
      tiers: allTiers,
    });
  } catch (err) {
    console.error('[AccountLimits] Error fetching tier:', err);
    return res.status(500).json({ message: 'Error fetching tier information' });
  }
});

/**
 * GET /account-limits/remaining
 * Returns user's current remaining limits for today
 * Shows how much more they can send/receive today
 */
router.get('/remaining', verifyJwt, async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return res.status(401).json({ message: 'User email not found in token' });
    }

    const remaining = await getRemainingLimits(email);
    return res.json({
      ok: true,
      limits: remaining,
    });
  } catch (err) {
    console.error('[AccountLimits] Error fetching remaining limits:', err);
    return res.status(500).json({ message: 'Error fetching remaining limits' });
  }
});

/**
 * POST /account-limits/validate
 * Informational pre-flight check (NOT authoritative)
 * Frontend calls this to show warnings before submitting transaction
 * Input: { amount, type: 'incoming' | 'outgoing' }
 * Note: Backend will enforce limits again when transaction is submitted
 */
router.post('/validate', verifyJwt, async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return res.status(401).json({ message: 'User email not found in token' });
    }

    const amount = Number(req.body?.amount);
    const type = req.body?.type; // 'incoming' or 'outgoing'

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        ok: false,
        message: 'Invalid amount',
      });
    }

    if (!['incoming', 'outgoing'].includes(type)) {
      return res.status(400).json({
        ok: false,
        message: 'Invalid transaction type',
      });
    }

    const validation = await validateTransactionLimit(email, amount, type);
    return res.json({
      ok: true,
      validation,
    });
  } catch (err) {
    console.error('[AccountLimits] Error validating transaction:', err);
    return res.status(500).json({ message: 'Error validating transaction' });
  }
});

module.exports = router;
