// backend/models/Vote.js
const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  matchId: {
    type: String,
    required: true
  },
  vote: {
    type: String,
    enum: ['home', 'draw', 'away'],
    required: true
  },
  isCorrect: {
    type: Boolean,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Add competition info for easier league stats calculation
  competition: {
    id: String,
    name: String
  }
});

// Compound index for efficient queries and ensuring one vote per user per match
VoteSchema.index({ userId: 1, matchId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', VoteSchema);