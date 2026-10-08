const express = require('express');
const mongoose = require('mongoose');
const verifyJwt = require('../middleware/verifyJwt');
const { hashPassword, comparePassword } = require('../authHelpers');
const TransactionPin = require('../models/TransactionPin');

const router = express.Router();

function canUseMongo() {
  return mongoose.connection.readyState === 1;
}

/**
 * POST /transaction-pin/set
 * Set or update user's 4-digit transaction PIN
 * Body: { pin: "1234" }
 */
router.post('/set', verifyJwt, async (req, res) => {
  try {
    const email = req.user?.email;
    const { pin, currentPin } = req.body || {};

    if (!email) {
      return res.status(401).json({ ok: false, message: 'User email not found in token' });
    }

    if (!pin || pin.toString().length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        ok: false,
        message: 'PIN must be exactly 4 digits',
      });
    }

    // If updating existing PIN, verify current PIN first
    if (canUseMongo()) {
      const existing = await TransactionPin.findOne({ email }).select('+pinHash');
      
      if (existing && currentPin) {
        const pinMatches = await comparePassword(currentPin.toString(), existing.pinHash);
        if (!pinMatches) {
          return res.status(401).json({
            ok: false,
            message: 'Current PIN is incorrect',
          });
        }
      }

      const pinHash = await hashPassword(pin.toString());
      const updated = await TransactionPin.findOneAndUpdate(
        { email },
        {
          email,
          pinHash,
          attempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      console.log('[TransactionPin] PIN set/updated for:', email);
      return res.json({
        ok: true,
        message: 'Transaction PIN set successfully',
      });
    }

    return res.status(500).json({
      ok: false,
      message: 'Database not available',
    });
  } catch (err) {
    console.error('[TransactionPin] Error setting PIN:', err);
    return res.status(500).json({
      ok: false,
      message: 'Error setting transaction PIN',
    });
  }
});

/**
 * POST /transaction-pin/verify
 * Verify user's transaction PIN
 * Body: { pin: "1234" }
 */
router.post('/verify', verifyJwt, async (req, res) => {
  try {
    const email = req.user?.email;
    const { pin } = req.body || {};

    if (!email) {
      return res.status(401).json({ ok: false, message: 'User email not found in token' });
    }

    if (!pin || pin.toString().length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        ok: false,
        message: 'PIN must be exactly 4 digits',
      });
    }

    if (!canUseMongo()) {
      return res.status(500).json({
        ok: false,
        message: 'Database not available',
      });
    }

    const record = await TransactionPin.findOne({ email }).select('+pinHash');

    if (!record) {
      return res.status(404).json({
        ok: false,
        message: 'Transaction PIN not set. Please set a PIN first.',
      });
    }

    // Check if account is locked
    if (record.lockedUntil && new Date() < record.lockedUntil) {
      const remainingSeconds = Math.ceil((record.lockedUntil - new Date()) / 1000);
      return res.status(429).json({
        ok: false,
        message: `Account locked. Try again in ${remainingSeconds} seconds`,
        lockedUntil: record.lockedUntil,
      });
    }

    // Check PIN
    const pinMatches = await comparePassword(pin.toString(), record.pinHash);

    if (!pinMatches) {
      record.attempts += 1;
      record.lastAttemptAt = new Date();

      // Lock after 5 failed attempts
      if (record.attempts >= record.maxAttempts) {
        record.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await record.save();

        console.warn('[TransactionPin] Account locked for:', email);
        return res.status(429).json({
          ok: false,
          message: 'Too many failed attempts. Account locked for 15 minutes.',
          lockedUntil: record.lockedUntil,
        });
      }

      await record.save();

      return res.status(401).json({
        ok: false,
        message: 'Incorrect PIN',
        attemptsRemaining: record.maxAttempts - record.attempts,
      });
    }

    // Reset attempts on successful verification
    record.attempts = 0;
    record.lockedUntil = null;
    record.lastAttemptAt = new Date();
    await record.save();

    console.log('[TransactionPin] PIN verified for:', email);
    return res.json({
      ok: true,
      message: 'PIN verified successfully',
    });
  } catch (err) {
    console.error('[TransactionPin] Error verifying PIN:', err);
    return res.status(500).json({
      ok: false,
      message: 'Error verifying PIN',
    });
  }
});

/**
 * GET /transaction-pin/status
 * Check if user has a PIN set
 */
router.get('/status', verifyJwt, async (req, res) => {
  try {
    const email = req.user?.email;

    if (!email) {
      return res.status(401).json({ ok: false, message: 'User email not found in token' });
    }

    if (!canUseMongo()) {
      return res.json({ ok: true, pinSet: false });
    }

    const record = await TransactionPin.findOne({ email });

    return res.json({
      ok: true,
      pinSet: Boolean(record),
      isLocked: record && record.lockedUntil && new Date() < record.lockedUntil,
    });
  } catch (err) {
    console.error('[TransactionPin] Error checking status:', err);
    return res.status(500).json({
      ok: false,
      message: 'Error checking PIN status',
    });
  }
});

module.exports = router;
