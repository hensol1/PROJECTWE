// backend/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: function() { return !this.googleId; }
  },
  country: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: function() {
      return this.isNew;
    }
  },
  googleId: {
    type: String,
    sparse: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  votes: [{
    matchId: String,
    vote: String,
    isCorrect: { type: Boolean, default: null },
    createdAt: { type: Date, default: Date.now }
  }],
  totalVotes: { type: Number, default: 0 },
  finishedVotes: { type: Number, default: 0 },
  correctVotes: { type: Number, default: 0 },
  leagueStats: [{
    leagueId: String,
    leagueName: String,
    totalVotes: { type: Number, default: 0 },
    correctVotes: { type: Number, default: 0 },
    leagueEmblem: { type: String, default: '' }
  }],
  wilsonScore: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', UserSchema);