// rankings.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Match = require('../models/Match');


// Helper function to get Monday and Sunday of current week
const getWeekBounds = () => {
  const now = new Date();
  const day = now.getDay();
  
  // Adjust for Sunday being 0 in JavaScript
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
    // Check if it's Monday and there's no data yet
    const now = new Date();
    const isMonday = now.getDay() === 1;

      const { monday, sunday } = getWeekBounds();
      const mondayDate = new Date(monday).toISOString();
      const sundayDate = new Date(sunday).toISOString();
  
      console.log('Searching matches between:', {
        mondayDate,
        sundayDate
      });
  
      const weekMatches = await Match.find({
        utcDate: {
          $gte: mondayDate,
          $lte: sundayDate
        }
      }).distinct('id'); // Changed from _id to id
  
      console.log('Found matches:', weekMatches);

      // If it's Monday and no matches are found, return empty array
      if (isMonday && weekMatches.length === 0) {
        return res.json([]);
      }
        
      const weeklyStats = await User.aggregate([
        {
          $project: {
            username: 1,
            country: 1,
            city: 1,
            weeklyVotes: {
              $filter: {
                input: "$votes",
                as: "vote",
                cond: { 
                  $in: ["$$vote.matchId", weekMatches]
                }
              }
            }
          }
        },
          {
          $project: {
            username: 1,
            country: 1,
            city: 1,
            finishedVotes: {
              $size: {
                $filter: {
                  input: "$weeklyVotes",
                  as: "vote",
                  cond: { $ne: ["$$vote.isCorrect", null] }
                }
              }
            },
            correctVotes: {
              $size: {
                $filter: {
                  input: "$weeklyVotes",
                  as: "vote",
                  cond: { $eq: ["$$vote.isCorrect", true] }
                }
              }
            }
          }
        },
          {
          $match: {
            finishedVotes: { $gt: 0 }
          }
        },
        {
          $addFields: {
            accuracy: {
              $round: [
                {
                  $multiply: [
                    { $divide: ["$correctVotes", "$finishedVotes"] },
                    100
                  ]
                },
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
                            { $divide: ["$correctVotes", "$finishedVotes"] },
                            {
                              $divide: [
                                1.96,
                                { $multiply: [2, { $sqrt: "$finishedVotes" }] }
                              ]
                            }
                          ]
                        },
                        {
                          $add: [
                            1,
                            { $divide: [3.84, "$finishedVotes"] }
                          ]
                        }
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
    
// Get all-time leaderboard (existing endpoint)
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find({ finishedVotes: { $gt: 0 } })
      .select('username country city totalVotes finishedVotes correctVotes')
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
      score: user.wilsonScore.toFixed(1)
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Error getting leaderboard' });
  }
});

module.exports = router;