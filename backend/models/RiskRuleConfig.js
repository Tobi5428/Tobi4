const mongoose = require('mongoose');

const riskRuleConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: String, required: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.RiskRuleConfig || mongoose.model('RiskRuleConfig', riskRuleConfigSchema);
