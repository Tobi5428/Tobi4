const mongoose = require('mongoose');

/**
 * Referral Link Schema
 * Tracks user referral links and referral income
 */
const referralLinkSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
      unique: true,
    },
    referralCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    referralLink: {
      type: String,
      required: true,
    },
    referredUsersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalReferralIncome: {
      type: Number,
      default: 0,
      min: 0,
    },
    referredUsers: [
      {
        email: String,
        referredAt: Date,
        status: { type: String, enum: ['active', 'inactive'], default: 'active' },
      },
    ],
    bonusClaimedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
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
    collection: 'referralLinks',
  }
);

module.exports = mongoose.models.ReferralLink ||
  mongoose.model('ReferralLink', referralLinkSchema);
