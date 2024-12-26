const mongoose = require('mongoose');

const matchPredictionSchema = new mongoose.Schema({
  matchId: { type: String, required: true },
  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },
  predictedResult: { type: String, required: true },
  actualResult: { type: String },
  isCorrect: { type: Boolean },
  date: { type: Date, default: Date.now }
});

const dailyStatSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  totalPredictions: { type: Number, default: 0 },
  correctPredictions: { type: Number, default: 0 }
});

const AIPredictionStatSchema = new mongoose.Schema({
  totalPredictions: { type: Number, default: 0 },
  correctPredictions: { type: Number, default: 0 },
  lastReset: { type: Date, default: null },
  dailyStats: [dailyStatSchema],
  predictions: [matchPredictionSchema] // Add predictions array to store match details
});

module.exports = mongoose.model('AIPredictionStat', AIPredictionStatSchema);