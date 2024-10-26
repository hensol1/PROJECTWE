// models/AIPredictionStat.js
const mongoose = require('mongoose');

const dailyStatSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  totalPredictions: { type: Number, default: 0 },
  correctPredictions: { type: Number, default: 0 }
});

const AIPredictionStatSchema = new mongoose.Schema({
  totalPredictions: { type: Number, default: 0 },
  correctPredictions: { type: Number, default: 0 },
  lastReset: { type: Date, default: null },
  dailyStats: [dailyStatSchema]
});

module.exports = mongoose.model('AIPredictionStat', AIPredictionStatSchema);
