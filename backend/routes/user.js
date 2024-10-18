const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Match = require('../models/Match');
const { recalculateUserStats, safelyUpdateUser } = require('../utils/userStats');

// Existing profile route
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = {
      username: user.username,
      email: user.email,
      country: user.country,
      isAdmin: user.isAdmin
    };

    console.log('Sending user profile:', userData);
    res.json(userData);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// New stats route
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await recalculateUserStats(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch league emblems
    const leagueEmblems = await Match.aggregate([
      { $group: { 
          _id: "$competition.id", 
          name: { $first: "$competition.name" }, 
          emblem: { $first: "$competition.emblem" } 
        } 
      }
    ]);
    const leagueEmblemMap = new Map(leagueEmblems.map(league => [league._id.toString(), league.emblem]));

    // Fetch detailed vote history
    const voteHistory = await Promise.all(user.votes.map(async (vote) => {
      const match = await Match.findOne({ id: vote.matchId });
      if (!match) return null;

      return {
        matchId: vote.matchId,
        vote: vote.vote,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        score: match.score.fullTime,
        date: match.utcDate,
        status: match.status,
        isCorrect: vote.isCorrect,
        competition: {
          name: match.competition.name,
          emblem: match.competition.emblem
        }
      };
    }));

    // Filter out null values and sort the vote history
    const filteredVoteHistory = voteHistory
      .filter(vote => vote !== null)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Prepare league stats for response
    const leagueStatsArray = user.leagueStats.map(stats => ({
      leagueName: stats.leagueName,
      leagueId: stats.leagueId,
      accuracy: stats.totalVotes > 0 ? (stats.correctVotes / stats.totalVotes) * 100 : 0,
      leagueEmblem: leagueEmblemMap.get(stats.leagueId) || ''
    }));

    res.json({
      totalVotes: user.totalVotes,
      finishedVotes: user.finishedVotes,
      correctVotes: user.correctVotes,
      accuracy: user.finishedVotes > 0 ? (user.correctVotes / user.finishedVotes) * 100 : 0,
      leagueStats: leagueStatsArray,
      voteHistory: filteredVoteHistory
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/leaderboard', async (req, res) => {
  console.log('Leaderboard route hit');
  try {
    console.log('Fetching users');
    const users = await User.find({ finishedVotes: { $gte: 10 } }, '_id username country totalVotes finishedVotes correctVotes wilsonScore');
    console.log(`Found ${users.length} users with 10+ finished votes`);
    
    const leaderboardData = users.map(user => {
      const accuracy = user.finishedVotes > 0 ? (user.correctVotes / user.finishedVotes) * 100 : 0;
      return {
        _id: user._id,
        username: user.username,
        country: user.country,
        finishedVotes: user.finishedVotes,
        correctVotes: user.correctVotes,
        accuracy: accuracy.toFixed(2),
        score: user.wilsonScore.toFixed(4)
      };
    });

    const sortedLeaderboard = leaderboardData.sort((a, b) => b.score - a.score);

    console.log('Sending leaderboard response:', sortedLeaderboard);
    res.json(sortedLeaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;