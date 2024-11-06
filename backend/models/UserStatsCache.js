const mongoose = require('mongoose');

const UserStatsCacheSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  totalVotes: { type: Number, default: 0 },
  finishedVotes: { type: Number, default: 0 },
  correctVotes: { type: Number, default: 0 },
  leagueStats: [{
    leagueId: String,
    leagueName: String,
    totalVotes: Number,
    correctVotes: Number,
    accuracy: Number,
    leagueEmblem: String
  }],
  voteHistory: [{
    matchId: String,
    vote: String,
    homeTeam: String,
    awayTeam: String,
    score: {
      home: Number,
      away: Number
    },
    date: Date,
    status: String,
    isCorrect: Boolean,
    competition: {
      name: String,
      emblem: String,
      id: String
    }
  }],
  lastUpdated: { type: Date, default: Date.now }
});

UserStatsCacheSchema.index({ userId: 1 });
UserStatsCacheSchema.index({ lastUpdated: 1 });

module.exports = mongoose.model('UserStatsCache', UserStatsCacheSchema);
