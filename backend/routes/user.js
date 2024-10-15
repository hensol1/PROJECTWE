const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Match = require('../models/Match');

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
    const user = await User.findById(req.user.id).select('-password');
    
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

    // Fetch detailed vote history and recalculate statistics
    let totalVotes = 0;
    let correctVotes = 0;
    const leagueStats = {};

    const voteHistory = await Promise.all(user.votes.map(async (vote) => {
      const match = await Match.findOne({ id: vote.matchId });
      if (!match) return null;

      let isCorrect = null;
      if (match.status === 'FINISHED') {
        totalVotes++;
        const homeScore = match.score.fullTime.home;
        const awayScore = match.score.fullTime.away;
        
        isCorrect = (
          (vote.vote === 'home' && homeScore > awayScore) ||
          (vote.vote === 'away' && awayScore > homeScore) ||
          (vote.vote === 'draw' && homeScore === awayScore)
        );

        if (isCorrect) {
          correctVotes++;
        }

        // Update league stats
        if (!leagueStats[match.competition.id]) {
          leagueStats[match.competition.id] = { 
            name: match.competition.name,
            totalVotes: 0, 
            correctVotes: 0 
          };
        }
        leagueStats[match.competition.id].totalVotes++;
        if (isCorrect) {
          leagueStats[match.competition.id].correctVotes++;
        }
      }

      return {
        matchId: vote.matchId,
        vote: vote.vote,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        score: match.score.fullTime,
        date: match.utcDate,
        status: match.status,
        isCorrect,
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

    // Calculate overall accuracy
    const accuracy = totalVotes > 0 ? (correctVotes / totalVotes) * 100 : 0;

    // Prepare league stats for response
    const leagueStatsArray = Object.entries(leagueStats).map(([leagueId, stats]) => ({
      leagueName: stats.name,
      leagueId,
      accuracy: stats.totalVotes > 0 ? (stats.correctVotes / stats.totalVotes) * 100 : 0,
      leagueEmblem: leagueEmblemMap.get(leagueId) || ''
    }));

    res.json({
      totalVotes,
      correctVotes,
      accuracy,
      leagueStats: leagueStatsArray,
      voteHistory: filteredVoteHistory
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;