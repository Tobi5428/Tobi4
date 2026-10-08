const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const verifyJwt = require('../middleware/verifyJwt');
const ReferralLink = require('../models/ReferralLink');

const router = express.Router();

function canUseMongo() {
  return mongoose.connection.readyState === 1;
}

function generateReferralCode() {
  return `REF_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

/**
 * GET /referral/my-link
 * Get user's referral link and stats
 */
router.get('/my-link', verifyJwt, async (req, res) => {
  try {
    const email = req.user?.email;

    if (!email) {
      return res.status(401).json({ ok: false, message: 'User email not found in token' });
    }

    if (!canUseMongo()) {
      return res.json({
        ok: true,
        referralCode: 'OFFLINE',
        referralLink: '#/referral?code=OFFLINE',
        referredCount: 0,
        totalIncome: 0,
      });
    }

    let referral = await ReferralLink.findOne({ email });

    if (!referral) {
      // Create new referral link
      const code = generateReferralCode();
      const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      const useHashRouter = process.env.FRONTEND_USE_HASH_ROUTER !== 'false';
      const referralLink = useHashRouter
        ? `${frontendBase}/#/signup?referralCode=${code}`
        : `${frontendBase}/signup?referralCode=${code}`;

      referral = await ReferralLink.create({
        email,
        referralCode: code,
        referralLink,
        referredUsers: [],
      });
    }

    return res.json({
      ok: true,
      referralCode: referral.referralCode,
      referralLink: referral.referralLink,
      referredCount: referral.referredUsersCount,
      totalIncome: referral.totalReferralIncome,
      bonusClaimedAmount: referral.bonusClaimedAmount,
      claimableBonus: Math.max(0, referral.totalReferralIncome - referral.bonusClaimedAmount),
    });
  } catch (err) {
    console.error('[Referral] Error getting my-link:', err);
    return res.status(500).json({
      ok: false,
      message: 'Error fetching referral link',
    });
  }
});

/**
 * POST /referral/track
 * Track a referral signup
 * Body: { referralCode: "REF_XXXXX" }
 */
router.post('/track', async (req, res) => {
  try {
    const { referralCode, newUserEmail } = req.body || {};

    if (!referralCode || !newUserEmail) {
      return res.status(400).json({
        ok: false,
        message: 'Referral code and email required',
      });
    }

    if (!canUseMongo()) {
      return res.json({
        ok: true,
        message: 'Referral tracked (offline mode)',
      });
    }

    const referral = await ReferralLink.findOne({ referralCode });

    if (!referral) {
      return res.status(404).json({
        ok: false,
        message: 'Invalid referral code',
      });
    }

    // Check if user already referred
    const alreadyReferred = referral.referredUsers.some(
      (u) => u.email.toLowerCase() === newUserEmail.toLowerCase()
    );

    if (!alreadyReferred) {
      referral.referredUsers.push({
        email: newUserEmail.toLowerCase(),
        referredAt: new Date(),
        status: 'active',
      });
      referral.referredUsersCount += 1;
      referral.totalReferralIncome += 500; // ₦500 per referral
      await referral.save();

      console.log('[Referral] Tracked referral:', referralCode, 'from', newUserEmail);
    }

    return res.json({
      ok: true,
      message: 'Referral tracked',
      bonus: 500,
    });
  } catch (err) {
    console.error('[Referral] Error tracking referral:', err);
    return res.status(500).json({
      ok: false,
      message: 'Error tracking referral',
    });
  }
});

/**
 * POST /referral/claim-bonus
 * Claim referral bonus income
 */
router.post('/claim-bonus', verifyJwt, async (req, res) => {
  try {
    const email = req.user?.email;

    if (!email) {
      return res.status(401).json({ ok: false, message: 'User email not found in token' });
    }

    if (!canUseMongo()) {
      return res.json({
        ok: true,
        message: 'Bonus claimed (offline mode)',
        amount: 0,
      });
    }

    const referral = await ReferralLink.findOne({ email });

    if (!referral) {
      return res.status(404).json({
        ok: false,
        message: 'No referral link found',
      });
    }

    const claimableBonus = referral.totalReferralIncome - referral.bonusClaimedAmount;

    if (claimableBonus <= 0) {
      return res.status(400).json({
        ok: false,
        message: 'No bonus available to claim',
      });
    }

    // In a real system, this would transfer to user's wallet
    referral.bonusClaimedAmount = referral.totalReferralIncome;
    await referral.save();

    console.log('[Referral] Bonus claimed by:', email, 'Amount:', claimableBonus);

    return res.json({
      ok: true,
      message: 'Bonus claimed successfully',
      amount: claimableBonus,
    });
  } catch (err) {
    console.error('[Referral] Error claiming bonus:', err);
    return res.status(500).json({
      ok: false,
      message: 'Error claiming bonus',
    });
  }
});

module.exports = router;
