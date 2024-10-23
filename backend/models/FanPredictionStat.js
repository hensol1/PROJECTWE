const mongoose = require('mongoose');

const FanPredictionStatSchema = new mongoose.Schema({
  totalPredictions: { type: Number, default: 0 },
  correctPredictions: { type: Number, default: 0 },
  lastReset: { type: Date, default: null }
});

module.exports = mongoose.model('FanPredictionStat', FanPredictionStatSchema);

