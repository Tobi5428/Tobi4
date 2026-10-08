const mongoose = require('mongoose');

const deviceIntelligenceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    ip: { type: String, default: null, index: true },
    geo: { type: String, default: null },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    linkCount: { type: Number, default: 1 },
  },
  { timestamps: true }
);

deviceIntelligenceSchema.index({ deviceId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.models.DeviceIntelligence || mongoose.model('DeviceIntelligence', deviceIntelligenceSchema);
