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

    res.json({
      username: user.username,
      email: user.email,
      country: user.country,
      totalVotes,
      correctVotes,
      accuracy,
      leagueStats
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;