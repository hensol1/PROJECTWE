const mongoose = require('mongoose');

const AccuracyStatsSchema = new mongoose.Schema({
  fanAccuracy: { type: Number, default: 0 },
  aiAccuracy: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AccuracyStats', AccuracyStatsSchema);