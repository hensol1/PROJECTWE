// backend/models/Match.js
const mongoose = require('mongoose');
const Vote = require('./Vote');
const User = require('./User');
const UserStatsCache = require('./UserStatsCache');

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

// Add method to update match results and related votes
MatchSchema.statics.updateMatchAndVotes = async function(matchId, status, score) {
  const match = await this.findOne({ id: matchId });
  if (!match) return null;

  const wasFinished = match.status === 'FINISHED';
  match.status = status;
  match.score = score;
  
  if (!wasFinished && status === 'FINISHED') {
    // Get all votes for this match
    const votes = await Vote.find({ matchId: match.id });
    console.log(`Processing ${votes.length} votes for match ${match.id}`);

    // Determine actual result
    const actualResult = 
      score.fullTime.home > score.fullTime.away ? 'HOME_TEAM' :
      score.fullTime.away > score.fullTime.home ? 'AWAY_TEAM' : 'DRAW';

    // Update each vote's correctness
    for (const vote of votes) {
      const votePrediction = 
        vote.vote === 'home' ? 'HOME_TEAM' :
        vote.vote === 'away' ? 'AWAY_TEAM' : 'DRAW';
      
      vote.isCorrect = votePrediction === actualResult;
      await vote.save();

      // Update user stats
      await User.findOneAndUpdate(
        { _id: vote.userId },
        { 
          $inc: { 
            finishedVotes: 1,
            correctVotes: vote.isCorrect ? 1 : 0
          }
        }
      );

      // Force stats cache update
      await UserStatsCache.findOneAndUpdate(
        { userId: vote.userId },
        { $set: { lastUpdated: new Date(0) } },
        { upsert: true }
      );
    }

    match.processed = true;
  }

  await match.save();
  return match;
};

module.exports = mongoose.model('Match', MatchSchema);