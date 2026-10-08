const mongoose = require('mongoose');

const riskEventSchema = new mongoose.Schema(
  {
    eventType: { type: String, default: 'DEPOSIT_ATTEMPT', index: true },
    userId: { type: String, required: true, index: true },
    transactionId: { type: String, required: true, index: true },
    depositId: { type: String, required: true, index: true },
    idempotencyKey: { type: String, default: null, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    triggeredRules: { type: [String], default: [] },
    riskScore: { type: Number, required: true },
    decision: { type: String, enum: ['ALLOW', 'REVIEW', 'BLOCK'], required: true, index: true },
    reasonCodes: { type: [String], default: [] },
    ip: { type: String, default: null, index: true },
    deviceId: { type: String, default: null, index: true },
    cardFingerprint: { type: String, default: null, index: true },
    cardBinLast4: { type: String, default: null },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'NGN' },
    paymentOutcome: { type: String, enum: ['attempted', 'succeeded', 'declined', 'blocked', 'review'], default: 'attempted', index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

riskEventSchema.index({ userId: 1, timestamp: -1 });
riskEventSchema.index({ cardFingerprint: 1, timestamp: -1 });
riskEventSchema.index({ deviceId: 1, timestamp: -1 });
riskEventSchema.index({ transactionId: 1 }, { unique: true, name: 'ux_riskevents_transactionId' });

module.exports = mongoose.models.RiskEvent || mongoose.model('RiskEvent', riskEventSchema);
