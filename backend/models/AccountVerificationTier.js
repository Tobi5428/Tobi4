const mongoose = require('mongoose');

const accountVerificationTierSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    verificationTier: {
      type: String,
      enum: ['TIER_1', 'TIER_2', 'TIER_3'],
      default: 'TIER_1',
      index: true,
    },
    // KYC/Verification data
    bvnVerified: {
      type: Boolean,
      default: false,
    },
    bvn: {
      type: String,
      default: null,
      select: false, // Don't return by default
    },
    ninVerified: {
      type: Boolean,
      default: false,
    },
    nin: {
      type: String,
      default: null,
      select: false, // Don't return by default
    },
    enhancedKycVerified: {
      type: Boolean,
      default: false,
    },
    // Metadata
    tierUpgradedAt: {
      type: Date,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    auditNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: 'accountVerificationTiers',
  }
);

accountVerificationTierSchema.index({ email: 1, verificationTier: 1 });

module.exports = mongoose.models.AccountVerificationTier ||
  mongoose.model('AccountVerificationTier', accountVerificationTierSchema);
