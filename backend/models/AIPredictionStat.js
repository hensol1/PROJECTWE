// models/AIPredictionStat.js
const mongoose = require('mongoose');

const AIPredictionStatSchema = new mongoose.Schema({
  totalPredictions: { type: Number, default: 0 },
  correctPredictions: { type: Number, default: 0 },
  lastReset: { type: Date, default: null }
});

module.exports = mongoose.model('AIPredictionStat', AIPredictionStatSchema);