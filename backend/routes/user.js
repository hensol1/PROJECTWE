const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Match = require('../models/Match');
const { recalculateUserStats, safelyUpdateUser } = require('../utils/userStats');

async function updateAllUsersStats() {
  try {
    console.log('Starting update of all users stats');
    const users = await User.find({});
    const matches = await Match.find({ 
      status: 'FINISHED',
      'score.fullTime': { $exists: true }
    });

    console.log(`Found ${users.length} users and ${matches.length} finished matches`);

    // Create a map of matches for quick lookup
    const matchesMap = matches.reduce((acc, match) => {
      acc[match.id] = match;
      return acc;
    }, {});

    // Update each user's stats
    for (const user of users) {
      let finishedVotes = 0;
      let correctVotes = 0;

      // Process each vote
      for (const vote of user.votes) {
        const match = matchesMap[vote.matchId];
        if (match && match.status === 'FINISHED') {
          finishedVotes++;
          
          const actualWinner = match.score.winner || (
            match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' :
            match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW'
          );

          const userPrediction = 
            vote.vote === 'home' ? 'HOME_TEAM' :
            vote.vote === 'away' ? 'AWAY_TEAM' : 'DRAW';

          vote.isCorrect = userPrediction === actualWinner;
          if (vote.isCorrect) {
            correctVotes++;
          }
        }
      }

      // Update user stats
      user.finishedVotes = finishedVotes;
      user.correctVotes = correctVotes;

      // Calculate Wilson score
      const n = finishedVotes;
      const p = n > 0 ? correctVotes / n : 0;
      const z = 1.96; // 95% confidence
      const zsqr = z * z;
      user.wilsonScore = n > 0 ? 
        (p + zsqr/(2*n) - z * Math.sqrt((p*(1-p) + zsqr/(4*n))/n))/(1 + zsqr/n) : 0;

      await user.save();
    }

    console.log('Finished updating all users stats');
  } catch (error) {
    console.error('Error updating all users stats:', error);
    throw error;
  }
}

// Profile route
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

// Stats route
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

// Leaderboard route
router.get('/leaderboard', async (req, res) => {
  console.log('Leaderboard route hit');
  try {
    console.log('Fetching users');
    const users = await User.find(
      { finishedVotes: { $gte: 10 } },
      '_id username country totalVotes finishedVotes correctVotes wilsonScore'
    ).sort({ wilsonScore: -1 });  // Sort at database level
    
    console.log(`Found ${users.length} users with 10+ finished votes`);
    
    const leaderboardData = users.map(user => ({
      _id: user._id,
      username: user.username,
      country: user.country,
      finishedVotes: user.finishedVotes,
      correctVotes: user.correctVotes,
      accuracy: (user.correctVotes / user.finishedVotes * 100).toFixed(2),
      score: (user.wilsonScore * 100).toFixed(2)
    }));

    console.log('Sending leaderboard response');
    res.json(leaderboardData);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/profile', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'Account successfully deleted' });
  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;