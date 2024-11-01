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
    emblem: String,
    country: {
      name: String,
      flag: String
    }
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
    status: String,
    minute: {
      type: Number,
      default: null
    },
    matchPeriod: {
      type: String,
      default: null
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
    set: (v) => {
      if (!v) return v;
      const date = new Date(v);
      return date.toISOString();
    }
  },
  aiPrediction: {
    type: String,
    enum: ['HOME_TEAM', 'DRAW', 'AWAY_TEAM', null],
    default: null
  },
  votes: {
    home: { type: Number, default: 0 },
    draw: { type: Number, default: 0 },
    away: { type: Number, default: 0 }
  },
  voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  voterIPs: [{ type: String }],
  processed: { type: Boolean, default: false }
}, { 
  collection: 'matches',
  toJSON: { getters: true }
});

module.exports = mongoose.model('Match', MatchSchema);