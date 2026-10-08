const mongoose = require('mongoose');

const loginOtpChallengeSchema = new mongoose.Schema(
  {
    challengeId: { type: String, required: true, unique: true, index: true },
    userEmail: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    expiresAt: { type: Date, required: true, index: true },
    createdByIp: { type: String, default: 'unknown' },
    lastSentAt: { type: Date, required: true },
    verifiedAt: { type: Date, default: null },
    usedAt: { type: Date, default: null },
    lockedAt: { type: Date, default: null },
    invalidatedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

loginOtpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

module.exports = mongoose.models.LoginOtpChallenge || mongoose.model('LoginOtpChallenge', loginOtpChallengeSchema);
