const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Match = require('../models/Match'); // Add this line to import the Match model

router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const totalVotes = user.totalVotes;
    const correctVotes = user.correctVotes;
    const accuracy = totalVotes > 0 ? (correctVotes / totalVotes) * 100 : 0;

    // Fetch league logos
    const leagueLogos = await Match.aggregate([
      { $group: { _id: "$competition.id", name: { $first: "$competition.name" }, logo: { $first: "$competition.emblem" } } }
    ]);

    const leagueLogoMap = new Map(leagueLogos.map(league => [league._id, league.logo]));

    const leagueStats = user.leagueStats.map(league => ({
      leagueName: league.leagueName,
      leagueId: league.leagueId,
      accuracy: league.totalVotes > 0 ? (league.correctVotes / league.totalVotes) * 100 : 0,
      leagueLogo: leagueLogoMap.get(league.leagueId) || '' // Add league logo URL
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