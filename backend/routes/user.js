const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Match = require('../models/Match');

router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const totalVotes = user.totalVotes;
    const correctVotes = user.correctVotes;
    const accuracy = totalVotes > 0 ? (correctVotes / totalVotes) * 100 : 0;

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

    const leagueStats = user.leagueStats.map(league => ({
      leagueName: league.leagueName,
      leagueId: league.leagueId,
      accuracy: league.totalVotes > 0 ? (league.correctVotes / league.totalVotes) * 100 : 0,
      leagueEmblem: leagueEmblemMap.get(league.leagueId.toString()) || ''
    }));

    // Fetch detailed vote history
    const voteHistory = await Promise.all(user.votes.map(async (vote) => {
      const match = await Match.findOne({ id: vote.matchId });
      if (!match) return null;

      let isCorrect = null;
      if (match.status === 'FINISHED') {
        isCorrect = (
          (vote.vote === 'home' && match.score.winner === 'HOME_TEAM') ||
          (vote.vote === 'away' && match.score.winner === 'AWAY_TEAM') ||
          (vote.vote === 'draw' && match.score.winner === 'DRAW')
        );
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

    // Filter out any null values (matches that weren't found)
    const filteredVoteHistory = voteHistory.filter(vote => vote !== null);

    res.json({
      username: user.username,
      email: user.email,
      country: user.country,
      totalVotes,
      correctVotes,
      accuracy,
      leagueStats,
      voteHistory: filteredVoteHistory
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;