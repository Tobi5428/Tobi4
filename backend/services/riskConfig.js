const mongoose = require('mongoose');
const RiskRuleConfig = require('../models/RiskRuleConfig');

const DEFAULTS = {
  CARD_COUNT_WINDOW_1H: 2,
  CARD_COUNT_WINDOW_24H: 3,
  DEPOSIT_COUNT_WINDOW_5M: 3,
  DEPOSIT_COUNT_WINDOW_10M: 5,
  DECLINE_WINDOW_15M: 3,
  BLOCK_THRESHOLD: 80,
  REVIEW_THRESHOLD: 55,
  AMOUNT_THRESHOLD_1H: 500000,
  AMOUNT_THRESHOLD_24H: 2000000,
  TEMP_BLOCK_HOURS: 24,
  WEIGHT_MULTI_CARD_VELOCITY: 30,
  WEIGHT_RAPID_REPEAT_DEPOSITS: 25,
  WEIGHT_EXCESSIVE_DECLINES: 20,
  WEIGHT_AMOUNT_PATTERN_ANOMALY: 20,
  WEIGHT_DEVICE_LINK_RISK: 20,
};

let cache = {
  loadedAt: 0,
  values: { ...DEFAULTS },
};

const CACHE_TTL_MS = 30 * 1000;

function readNumeric(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function loadDbOverrides() {
  if (mongoose.connection.readyState !== 1) return {};
  const rows = await RiskRuleConfig.find({}).lean();
  return rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

async function getRiskConfig() {
  const now = Date.now();
  if (now - cache.loadedAt < CACHE_TTL_MS) {
    return cache.values;
  }

  const dbValues = await loadDbOverrides();
  const merged = { ...DEFAULTS };

  Object.keys(DEFAULTS).forEach((key) => {
    const source = process.env[key] ?? dbValues[key];
    merged[key] = readNumeric(source, DEFAULTS[key]);
  });

  cache = { loadedAt: now, values: merged };
  return merged;
}

module.exports = {
  DEFAULTS,
  getRiskConfig,
};
