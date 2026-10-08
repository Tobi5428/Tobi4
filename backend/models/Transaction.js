const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, index: true, unique: true },
    customerId: { type: String, required: true, index: true },
    customerIp: { type: String, required: true },
    deviceFingerprint: { type: String, required: true },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'NGN' },
    status: {
      type: String,
      enum: ['submitted', 'pending', 'successful', 'declined', 'blocked', 'pending_manual_review'],
      default: 'submitted',
      index: true,
    },
    riskFlags: { type: [String], default: [] },
    reviewStatus: {
      type: String,
      enum: ['none', 'manual_review_required', 'approved', 'rejected'],
      default: 'none',
      index: true,
    },
    reviewReason: { type: String, default: null },
    reviewedBy: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    reviewerNote: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'transactions',
  }
);

transactionSchema.index({ customerId: 1, createdAt: -1 });
transactionSchema.index({ customerId: 1, customerIp: 1 });
transactionSchema.index({ reviewStatus: 1, createdAt: -1 });

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
