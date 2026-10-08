const mongoose = require('mongoose');

const paymentInstrumentFingerprintSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    cardFingerprint: { type: String, required: true, index: true },
    cardBinLast4: { type: String, default: null },
    attemptCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    declineCount: { type: Number, default: 0 },
    lastOutcome: { type: String, enum: ['attempted', 'succeeded', 'declined', null], default: null },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

paymentInstrumentFingerprintSchema.index({ userId: 1, cardFingerprint: 1 }, { unique: true });

module.exports =
  mongoose.models.PaymentInstrumentFingerprint ||
  mongoose.model('PaymentInstrumentFingerprint', paymentInstrumentFingerprintSchema);
