/**
 * Account Verification Tier Limits
 * This is the SOURCE OF TRUTH for all transaction limits in JEGA.
 * Backend enforces these limits; frontend displays them for UX only.
 * Never hard-code limits in frontend independently.
 */

const TIER_LIMITS = {
  TIER_1: {
    name: 'Basic',
    description: 'Basic account verification',
    singleTransaction: 50_000,      // ₦50,000
    dailyOutgoing: 100_000,          // ₦100,000
    dailyIncoming: 300_000,          // ₦300,000
  },
  TIER_2: {
    name: 'BVN/NIN Verified',
    description: 'BVN or NIN verified account',
    singleTransaction: 200_000,      // ₦200,000
    dailyOutgoing: 500_000,          // ₦500,000
    dailyIncoming: 1_000_000,        // ₦1,000,000
  },
  TIER_3: {
    name: 'Enhanced KYC',
    description: 'Full enhanced KYC verification',
    singleTransaction: 1_000_000,    // ₦1,000,000
    dailyOutgoing: 5_000_000,        // ₦5,000,000
    dailyIncoming: 10_000_000,       // ₦10,000,000
  },
};

const DEFAULT_TIER = 'TIER_1';

module.exports = {
  TIER_LIMITS,
  DEFAULT_TIER,
};
