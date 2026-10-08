const mongoose = require('mongoose');

const userRiskStateSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    riskLevel: { type: String, enum: ['normal', 'review', 'blocked'], default: 'normal' },
    blockedUntil: { type: Date, default: null, index: true },
    isAllowlisted: { type: Boolean, default: false, index: true },
    lastRiskScore: { type: Number, default: 0 },
    lastDecision: { type: String, enum: ['ALLOW', 'REVIEW', 'BLOCK', null], default: null },
    lastReasonCodes: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.models.UserRiskState || mongoose.model('UserRiskState', userRiskStateSchema);
