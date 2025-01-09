// backend/routes/rankings.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Match = require('../models/Match');
const Vote = require('../models/Vote');

const getWeekBounds = () => {
  const now = new Date();
  const day = now.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return { monday, sunday };
};

router.get('/leaderboard/weekly', async (req, res) => {
  try {
    const now = new Date();
    const isMonday = now.getDay() === 1;
    const { monday, sunday } = getWeekBounds();

    console.log('Searching matches between:', {
      mondayDate: monday.toISOString(),
      sundayDate: sunday.toISOString()
    });

    // Get matches for the week
    const weekMatches = await Match.find({
      utcDate: {
        $gte: monday.toISOString(),
        $lte: sunday.toISOString()
      }
    }).distinct('id');

    console.log('Found matches:', weekMatches);

    if (isMonday && weekMatches.length === 0) {
      return res.json([]);
    }

    // Get votes for these matches
    const weeklyStats = await Vote.aggregate([
      {
        $match: {
          matchId: { $in: weekMatches },
          isCorrect: { $ne: null } // Only count finished votes
        }
      },
      {
        $group: {
          _id: '$userId',
          finishedVotes: { $sum: 1 },
          correctVotes: {
            $sum: { $cond: [{ $eq: ['$isCorrect', true] }, 1, 0] }
          }
        }
      },
      {
        $match: {
          finishedVotes: { $gt: 0 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          username: '$user.username',
          country: '$user.country',
          city: '$user.city',
          finishedVotes: 1,
          correctVotes: 1,
          accuracy: {
            $round: [
              { $multiply: [{ $divide: ['$correctVotes', '$finishedVotes'] }, 100] },
              2
            ]
          }
        }
      },
      {
        $addFields: {
          score: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      {
                        $add: [
                          { $divide: ['$correctVotes', '$finishedVotes'] },
                          { $divide: [1.96, { $multiply: [2, { $sqrt: '$finishedVotes' }] }] }
                        ]
                      },
                      { $add: [1, { $divide: [3.84, '$finishedVotes'] }] }
                    ]
                  },
                  100
                ]
              },
              2
            ]
          }
        }
      },
      { $sort: { score: -1 } }
    ]);

    console.log('Stats per user:', weeklyStats.map(user => ({
      username: user.username,
      weeklyFinished: user.finishedVotes,
      accuracy: user.accuracy,
      score: user.score
    })));

    res.json(weeklyStats);
  } catch (error) {
    console.error('Weekly leaderboard error:', error);
    res.status(500).json({ message: 'Error getting weekly leaderboard' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find({ finishedVotes: { $gt: 0 } })
      .select('username country city totalVotes finishedVotes correctVotes wilsonScore')
      .sort({ wilsonScore: -1 });

    const leaderboard = users.map(user => ({
      _id: user._id,
      username: user.username,
      country: user.country,
      city: user.city,
      totalVotes: user.totalVotes,
      finishedVotes: user.finishedVotes,
      correctVotes: user.correctVotes,
      accuracy: ((user.correctVotes / user.finishedVotes) * 100).toFixed(1),
      score: (user.wilsonScore * 100).toFixed(1)
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Error getting leaderboard' });
  }
});

module.exports = router;