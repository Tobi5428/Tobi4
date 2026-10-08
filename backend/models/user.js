const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    username: { type: String, trim: true, default: null, index: true, sparse: true },
    role: { type: String, default: 'user' },
    verificationTier: { type: String, enum: ['TIER_1', 'TIER_2', 'TIER_3'], default: 'TIER_1', index: true },
    firstName: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    businessName: { type: String, trim: true, default: '' },
    businessType: { type: String, trim: true, default: '' },
    rcNumber: { type: String, trim: true, default: '' },
    accountType: { type: String, trim: true, default: '' },
    password: { type: String, required: true },
    resetPasswordTokenHash: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    emailChangeTokenHash: { type: String, default: null },
    emailChangeExpires: { type: Date, default: null },
    pendingEmail: { type: String, default: null, lowercase: true, trim: true },
    activeSessionId: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.index({ username: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
