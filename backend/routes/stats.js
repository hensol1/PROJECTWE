const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const AIPredictionStat = require('../models/AIPredictionStat');
const { withCache } = require('../middleware/cacheMiddleware');

// Get daily predictions (15min cache)
router.get('/daily-predictions', withCache('daily-stats', 900), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Use lean() and only select needed fields
    const matches = await Match.find({
      utcDate: {
        $gte: today.toISOString(),
        $lt: tomorrow.toISOString()
      }
    })
    .select('aiPrediction status')
    .lean()
    .hint({ status: 1, utcDate: 1 });  // Use compound index

    const stats = {
      totalMatches: matches.length,
      aiPredictions: matches.filter(m => m.aiPrediction).length,
      completedMatches: matches.filter(m => m.status === 'FINISHED').length
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching daily predictions:', error);
    res.status(500).json({ message: 'Error fetching daily predictions' });
  }
});

// Get AI performance history (1hr cache)
router.get('/ai/history', withCache('ai-history', 3600), async (req, res) => {
  try {
    // Use aggregation for better performance
    const stats = await Match.aggregate([
      {
        $match: {
          status: 'FINISHED',
          aiPrediction: { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { 
              format: "%Y-%m-%d", 
              date: { $dateFromString: { dateString: "$utcDate" } }
            }
          },
          totalPredictions: { $sum: 1 },
          correctPredictions: {
            $sum: {
              $cond: [
                { $eq: ['$aiPrediction', '$score.winner'] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          date: '$_id',
          totalPredictions: 1,
          correctPredictions: 1,
          accuracy: {
            $multiply: [
              { $divide: ['$correctPredictions', '$totalPredictions'] },
              100
            ]
          }
        }
      },
      { $sort: { date: -1 } }
    ]).hint({ status: 1, aiPrediction: 1, utcDate: 1 });

    // Calculate overall stats
    const overall = stats.reduce((acc, day) => ({
      totalPredictions: acc.totalPredictions + day.totalPredictions,
      correctPredictions: acc.correctPredictions + day.correctPredictions
    }), { totalPredictions: 0, correctPredictions: 0 });

    const overallAccuracy = overall.totalPredictions > 0
      ? (overall.correctPredictions / overall.totalPredictions * 100)
      : 0;

    res.json({
      stats,
      overall: {
        ...overall,
        overallAccuracy
      }
    });
  } catch (error) {
    console.error('Error fetching AI history:', error);
    res.status(500).json({ message: 'Error fetching AI history' });
  }
});

// Get league stats (1hr cache)
router.get('/ai/league-stats', withCache('league-stats', 3600), async (req, res) => {
  try {
    const stats = await Match.aggregate([
      {
        $match: {
          status: 'FINISHED',
          aiPrediction: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$competition.id',
          name: { $first: '$competition.name' },
          emblem: { $first: '$competition.emblem' },
          country: { $first: '$competition.country' },
          totalPredictions: { $sum: 1 },
          correctPredictions: {
            $sum: {
              $cond: [
                { $eq: ['$aiPrediction', '$score.winner'] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          id: '$_id',
          name: 1,
          emblem: 1,
          country: 1,
          totalPredictions: 1,
          correctPredictions: 1,
          accuracy: {
            $multiply: [
              { $divide: ['$correctPredictions', '$totalPredictions'] },
              100
            ]
          }
        }
      },
      { $sort: { totalPredictions: -1 } }
    ]).hint({ 'competition.id': 1, status: 1 });

    res.json(stats);
  } catch (error) {
    console.error('Error fetching league stats:', error);
    res.status(500).json({ message: 'Error fetching league stats' });
  }
});

module.exports = router;