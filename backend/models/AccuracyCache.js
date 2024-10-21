const mongoose = require('mongoose');

const AccuracyCacheSchema = new mongoose.Schema({
  fanAccuracy: Number,
  aiAccuracy: Number,
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AccuracyCache', AccuracyCacheSchema);
