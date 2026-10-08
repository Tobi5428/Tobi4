const mongoose = require('mongoose');

/**
 * Transaction PIN Schema
 * Stores hashed 4-digit PIN for user transaction verification
 */
const transactionPinSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
      unique: true,
    },
    pinHash: {
      type: String,
      required: true,
      select: false, // Don't return by default
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'transactionPins',
  }
);

module.exports = mongoose.models.TransactionPin ||
  mongoose.model('TransactionPin', transactionPinSchema);
