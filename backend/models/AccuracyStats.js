const mongoose = require('mongoose');

const AccuracyStatsSchema = new mongoose.Schema({
  fanAccuracy: { type: Number, default: 0 },
  aiAccuracy: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  lastReset: { type: Date },
  resetType: { type: String, enum: ['ai', 'fans', 'all'] }
});

// Add index for faster queries
AccuracyStatsSchema.index({ lastUpdated: -1 });

module.exports = mongoose.model('AccuracyStats', AccuracyStatsSchema);
