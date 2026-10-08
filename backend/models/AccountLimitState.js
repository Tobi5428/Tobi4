const mongoose = require('mongoose');

/**
 * Tracks daily transaction totals per user.
 * Used to enforce daily incoming/outgoing limits.
 * Resets daily at midnight UTC.
 */
const accountLimitStateSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Date is in YYYY-MM-DD format (UTC)
    date: {
      type: String,
      required: true,
      index: true,
    },
    // Total outgoing amount on this user on this date
    outgoingToday: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Total incoming amount for this user on this date
    incomingToday: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Track number of transactions for rate limiting if needed
    transactionCountToday: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'accountLimitStates',
  }
);

// Unique index: one document per user per day
accountLimitStateSchema.index({ email: 1, date: 1 }, { unique: true });
// Useful for cleanup jobs
accountLimitStateSchema.index({ date: 1 });

module.exports = mongoose.models.AccountLimitState ||
  mongoose.model('AccountLimitState', accountLimitStateSchema);
