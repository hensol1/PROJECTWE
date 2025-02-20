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
  odds: {
    update: Date,
    bookmakers: [{
      id: Number,
      name: String,
      bets: [{
        id: Number,
        name: String,
        values: [{
          value: String,
          odd: Number
        }]
      }]
    }]
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
  }
}, { 
  collection: 'matches',
  toJSON: { getters: true }
});

module.exports = mongoose.model('Match', MatchSchema);