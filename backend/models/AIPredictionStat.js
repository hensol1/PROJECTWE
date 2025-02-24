const mongoose = require('mongoose');

const matchPredictionSchema = new mongoose.Schema({
  matchId: { 
    type: String, 
    required: true,
    index: true  // Add index for match lookups
  },
  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },
  predictedResult: { type: String, required: true },
  actualResult: { type: String },
  isCorrect: { 
    type: Boolean,
    index: true  // Add index for correct/incorrect queries
  },
  date: { 
    type: Date, 
    default: Date.now,
    index: true  // Add index for date queries
  }
});

const dailyStatSchema = new mongoose.Schema({
  date: { 
    type: Date, 
    required: true,
    index: true  // Add index for date queries
  },
  totalPredictions: { type: Number, default: 0 },
  correctPredictions: { type: Number, default: 0 }
});

const AIPredictionStatSchema = new mongoose.Schema({
  totalPredictions: { type: Number, default: 0 },
  correctPredictions: { type: Number, default: 0 },
  lastReset: { type: Date, default: null },
  dailyStats: [dailyStatSchema],
  predictions: [matchPredictionSchema]
}, {
  timestamps: true  // Add timestamps for tracking
});

// Add compound indexes for common query patterns
AIPredictionStatSchema.index({ 'predictions.date': 1, 'predictions.isCorrect': 1 });
AIPredictionStatSchema.index({ 'dailyStats.date': 1 });

module.exports = mongoose.model('AIPredictionStat', AIPredictionStatSchema);