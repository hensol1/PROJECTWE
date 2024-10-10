const mongoose = require('mongoose');

const AIPredictionStatSchema = new mongoose.Schema({
  totalPredictions: { type: Number, default: 0 },
  correctPredictions: { type: Number, default: 0 }
});

module.exports = mongoose.model('AIPredictionStat', AIPredictionStatSchema);
