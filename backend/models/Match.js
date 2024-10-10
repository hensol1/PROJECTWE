const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema({
  id: String,
  awayTeam: {
    id: Number,
    name: String,
    crest: String
  },
  competition: {
    id: Number,
    name: String,
    emblem: String
  },
  homeTeam: {
    id: Number,
    name: String,
    crest: String
  },
  lastUpdated: Date,
  score: {
    winner: String,
    duration: String,
    fullTime: {
      home: Number,
      away: Number
    },
    halfTime: {
      home: Number,
      away: Number
    }
  },
  source: String,
  status: String,
  utcDate: {
    type: String,
    get: (v) => v,
    set: (v) => v
  },
  votes: {
    home: { type: Number, default: 0 },
    draw: { type: Number, default: 0 },
    away: { type: Number, default: 0 }
  },
    aiPrediction: {
    type: String,
    enum: ['HOME_TEAM', 'DRAW', 'AWAY_TEAM'],
    default: null
  },

  voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  fanPredictionProcessed: { type: Boolean, default: false }  // Moved inside the schema
}, { 
  collection: 'matches',
  toJSON: { getters: true }
});

module.exports = mongoose.model('Match', MatchSchema);