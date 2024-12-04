const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Match = require('../models/Match');
const { recalculateUserStats, safelyUpdateUser } = require('../utils/userStats');
const UserStatsCache = require('../models/UserStatsCache');
const { updateUserStatsCache } = require('../utils/statsCache');


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
      city: user.city,
      isAdmin: user.isAdmin
    };

    console.log('Sending user profile:', userData);
    res.json(userData);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Global Location Rankings
router.get('/rankings/locations', async (req, res) => {
  try {
    console.log('Fetching location rankings with raw accuracy...');
    
    // Get top 5 countries
    const topCountries = await User.aggregate([
      { 
        $match: { 
          finishedVotes: { $gte: 10 } // Minimum 10 predictions
        }
      },
      {
        $group: {
          _id: '$country',
          totalCorrectVotes: { $sum: '$correctVotes' },
          totalFinishedVotes: { $sum: '$finishedVotes' },
          userCount: { $sum: 1 },
          // Add individual accuracies for debugging
          users: {
            $push: {
              username: '$username',
              accuracy: {
                $multiply: [
                  { $divide: ['$correctVotes', '$finishedVotes'] },
                  100
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          country: '$_id',
          userCount: 1,
          averageScore: {
            $multiply: [
              { $divide: ['$totalCorrectVotes', '$totalFinishedVotes'] },
              100
            ]
          },
          users: 1, // Keep for debugging
          totalPredictions: '$totalFinishedVotes'
        }
      },
      { $sort: { averageScore: -1 } },
      { $limit: 5 }
    ]);

    // Get top 5 cities
    const topCities = await User.aggregate([
      { 
        $match: { 
          finishedVotes: { $gte: 10 },
          city: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: { 
            country: '$country', 
            city: '$city' 
          },
          totalCorrectVotes: { $sum: '$correctVotes' },
          totalFinishedVotes: { $sum: '$finishedVotes' },
          userCount: { $sum: 1 },
          // Add individual accuracies for debugging
          users: {
            $push: {
              username: '$username',
              accuracy: {
                $multiply: [
                  { $divide: ['$correctVotes', '$finishedVotes'] },
                  100
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          country: '$_id.country',
          city: '$_id.city',
          userCount: 1,
          averageScore: {
            $multiply: [
              { $divide: ['$totalCorrectVotes', '$totalFinishedVotes'] },
              100
            ]
          },
          users: 1, // Keep for debugging
          totalPredictions: '$totalFinishedVotes'
        }
      },
      { $sort: { averageScore: -1 } },
      { $limit: 5 }
    ]);

    // Add detailed logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Location Rankings Debug Info:');
      topCountries.forEach(country => {
        console.log(`\nCountry: ${country.country}`);
        console.log(`Average Score: ${country.averageScore.toFixed(2)}%`);
        console.log('Individual user accuracies:', 
          country.users.map(u => `${u.username}: ${u.accuracy.toFixed(2)}%`).join(', ')
        );
      });

      topCities.forEach(city => {
        console.log(`\nCity: ${city.city}, ${city.country}`);
        console.log(`Average Score: ${city.averageScore.toFixed(2)}%`);
        console.log('Individual user accuracies:', 
          city.users.map(u => `${u.username}: ${u.accuracy.toFixed(2)}%`).join(', ')
        );
      });
    }

    // Remove debug info before sending response
    const cleanTopCountries = topCountries.map(({ country, averageScore, userCount, totalPredictions }) => ({
      country,
      averageScore,
      userCount,
      totalPredictions
    }));

    const cleanTopCities = topCities.map(({ city, country, averageScore, userCount, totalPredictions }) => ({
      city,
      country,
      averageScore,
      userCount,
      totalPredictions
    }));

    res.json({ topCountries: cleanTopCountries, topCities: cleanTopCities });
  } catch (error) {
    console.error('Error fetching location rankings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's ranking in their location
router.get('/rankings/my-location', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's country ranking
    const countryUsers = await User.find({ 
      country: user.country,
      finishedVotes: { $gte: 10 }
    }).sort({ wilsonScore: -1 });

    const countryRank = countryUsers.findIndex(u => u._id.toString() === user._id.toString()) + 1;

    // Get user's city ranking
    const cityUsers = await User.find({
      country: user.country,
      city: user.city,
      finishedVotes: { $gte: 10 }
    }).sort({ wilsonScore: -1 });

    const cityRank = cityUsers.findIndex(u => u._id.toString() === user._id.toString()) + 1;

    res.json({
      country: {
        name: user.country,
        rank: countryRank,
        totalUsers: countryUsers.length,
        topUsers: countryUsers.slice(0, 5).map(u => ({
          username: u.username,
          score: (u.wilsonScore * 100).toFixed(2)
        }))
      },
      city: {
        name: user.city,
        rank: cityRank,
        totalUsers: cityUsers.length,
        topUsers: cityUsers.slice(0, 5).map(u => ({
          username: u.username,
          score: (u.wilsonScore * 100).toFixed(2)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching user location rankings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// User's Location Ranking
router.get('/rankings/user-location/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's country ranking
    const countryRanking = await User.aggregate([
      { 
        $match: { 
          country: user.country,
          finishedVotes: { $gte: 10 },
          wilsonScore: { $gt: 0 }
        }
      },
      { $sort: { wilsonScore: -1 } },
      {
        $group: {
          _id: null,
          users: { 
            $push: { 
              _id: '$_id',
              username: '$username',
              wilsonScore: '$wilsonScore',
              correctVotes: '$correctVotes',
              finishedVotes: '$finishedVotes'
            }
          },
          totalUsers: { $sum: 1 }
        }
      }
    ]);

    // Get user's city ranking
    const cityRanking = await User.aggregate([
      { 
        $match: { 
          country: user.country,
          city: user.city,
          finishedVotes: { $gte: 10 },
          wilsonScore: { $gt: 0 }
        }
      },
      { $sort: { wilsonScore: -1 } },
      {
        $group: {
          _id: null,
          users: { 
            $push: { 
              _id: '$_id',
              username: '$username',
              wilsonScore: '$wilsonScore',
              correctVotes: '$correctVotes',
              finishedVotes: '$finishedVotes'
            }
          },
          totalUsers: { $sum: 1 }
        }
      }
    ]);

    // Calculate user's rankings
    const countryData = countryRanking[0] || { users: [], totalUsers: 0 };
    const cityData = cityRanking[0] || { users: [], totalUsers: 0 };

    const userCountryRank = countryData.users.findIndex(u => u._id.toString() === user._id.toString()) + 1;
    const userCityRank = cityData.users.findIndex(u => u._id.toString() === user._id.toString()) + 1;

    // Get nearby users within 50km
    const nearbyUsers = await User.aggregate([
      {
        $geoNear: {
          near: user.location,
          distanceField: "distance",
          maxDistance: 50000, // 50km in meters
          spherical: true
        }
      },
      { $match: { 
        _id: { $ne: user._id },
        finishedVotes: { $gte: 10 },
        wilsonScore: { $gt: 0 }
      }},
      { $sort: { wilsonScore: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      user: {
        username: user.username,
        wilsonScore: user.wilsonScore * 100,
        correctVotes: user.correctVotes,
        finishedVotes: user.finishedVotes
      },
      rankings: {
        country: {
          rank: userCountryRank,
          total: countryData.totalUsers,
          name: user.country
        },
        city: {
          rank: userCityRank,
          total: cityData.totalUsers,
          name: user.city
        }
      },
      nearbyUsers: nearbyUsers.map(u => ({
        username: u.username,
        wilsonScore: u.wilsonScore * 100,
        distance: Math.round(u.distance / 1000), // Convert to km
        correctVotes: u.correctVotes,
        finishedVotes: u.finishedVotes
      }))
    });
  } catch (error) {
    console.error('Error fetching user location ranking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Other existing routes remain the same
router.get('/stats', auth, async (req, res) => {
  try {
    console.log('Starting /stats route for user:', req.user.id);
    
    // Try to get cached stats first
    let statsCache = await UserStatsCache.findOne({ userId: req.user.id });
    console.log('Found stats cache:', statsCache ? 'yes' : 'no');
    
    // If cache doesn't exist or is older than 15 minutes, update it
    if (!statsCache || Date.now() - statsCache.lastUpdated > 15 * 60 * 1000) {
      console.log('Cache needs update, fetching new data...');
      await updateUserStatsCache(req.user.id);
      statsCache = await UserStatsCache.findOne({ userId: req.user.id });
      console.log('Updated cache:', statsCache ? 'success' : 'failed');
    }

    if (!statsCache) {
      console.log('No stats cache found after update attempt');
      return res.status(404).json({ message: 'User stats not found' });
    }

    const response = {
      totalVotes: statsCache.totalVotes,
      finishedVotes: statsCache.finishedVotes,
      correctVotes: statsCache.correctVotes,
      leagueStats: statsCache.leagueStats,
      voteHistory: statsCache.voteHistory
    };
    
    console.log('Sending response with stats');
    res.json(response);
  } catch (error) {
    console.error('Error in /stats route:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Existing leaderboard route
router.get('/leaderboard', async (req, res) => {
  console.log('Leaderboard route hit');
  try {
    console.log('Fetching users');
    const users = await User.find(
      { finishedVotes: { $gte: 10 } },
      '_id username country city totalVotes finishedVotes correctVotes wilsonScore'
    ).sort({ wilsonScore: -1 });  // Sort at database level
    
    console.log(`Found ${users.length} users with 10+ finished votes`);
    
    const leaderboardData = users.map(user => ({
      _id: user._id,
      username: user.username,
      country: user.country,
      city: user.city,
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

// Also add a route to get user's personal location rankings
router.get('/rankings/my-location', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's country ranking
    const countryUsers = await User.find({ 
      country: user.country,
      finishedVotes: { $gte: 10 }
    }).sort({ wilsonScore: -1 });

    const countryRank = countryUsers.findIndex(u => u._id.toString() === user._id.toString()) + 1;

    // Get user's city ranking
    const cityUsers = await User.find({
      country: user.country,
      city: user.city,
      finishedVotes: { $gte: 10 }
    }).sort({ wilsonScore: -1 });

    const cityRank = cityUsers.findIndex(u => u._id.toString() === user._id.toString()) + 1;

    res.json({
      country: {
        name: user.country,
        rank: countryRank,
        totalUsers: countryUsers.length,
        topUsers: countryUsers.slice(0, 5).map(u => ({
          username: u.username,
          score: (u.wilsonScore * 100).toFixed(2)
        }))
      },
      city: {
        name: user.city,
        rank: cityRank,
        totalUsers: cityUsers.length,
        topUsers: cityUsers.slice(0, 5).map(u => ({
          username: u.username,
          score: (u.wilsonScore * 100).toFixed(2)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching user location rankings:', error);
    res.status(500).json({ message: 'Server error' });
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