const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const Match = require('../models/Match');
const AIPredictionStat = require('../models/AIPredictionStat');
const { withCache } = require('../middleware/cacheMiddleware');

// Path to stats files
const STATS_DIR = path.join(__dirname, '../public/stats');

// Helper function to read a stats file with error handling
const readStatsFile = async (filename) => {
  try {
    const filePath = path.join(STATS_DIR, filename);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading stats file ${filename}:`, error);
    throw new Error('Stats file not available');
  }
};

// Get manifest file with timestamps for cache invalidation
router.get('/manifest', async (req, res) => {
  try {
    const manifest = await readStatsFile('manifest.json');
    res.json(manifest);
  } catch (error) {
    console.error('Error fetching stats manifest:', error);
    res.status(500).json({ 
      error: 'Error fetching stats manifest',
      message: 'Static stats files may not be generated yet'
    });
  }
});

// Get daily predictions (uses pre-computed file with fallback)
router.get('/daily-predictions', withCache('daily-stats', 300), async (req, res) => {
  try {
    // Try to read from pre-computed file
    const stats = await readStatsFile('daily-predictions.json');
    res.json(stats);
  } catch (error) {
    console.error('Error fetching daily predictions from file:', error);
    
    // Fallback to database query if file is not available
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
      .lean();

      const stats = {
        totalMatches: matches.length,
        aiPredictions: matches.filter(m => m.aiPrediction).length,
        completedMatches: matches.filter(m => m.status === 'FINISHED').length,
        generatedAt: new Date().toISOString()
      };

      res.json(stats);
    } catch (dbError) {
      console.error('Error in fallback query:', dbError);
      res.status(500).json({ message: 'Error fetching daily predictions' });
    }
  }
});

// Get AI performance history (uses pre-computed file with fallback)
router.get('/ai/history', withCache('ai-history', 300), async (req, res) => {
  try {
    // Try to read from pre-computed file
    const historyData = await readStatsFile('ai-history.json');
    res.json(historyData);
  } catch (error) {
    console.error('Error fetching AI history from file:', error);
    
    // Fallback to database query if file is not available
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
                  { 
                    $eq: [
                      "$aiPrediction",
                      {
                        $cond: [
                          { $gt: ["$score.fullTime.home", "$score.fullTime.away"] },
                          "HOME_TEAM",
                          {
                            $cond: [
                              { $gt: ["$score.fullTime.away", "$score.fullTime.home"] },
                              "AWAY_TEAM",
                              "DRAW"
                            ]
                          }
                        ]
                      }
                    ]
                  },
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
      ]);

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
        },
        generatedAt: new Date().toISOString()
      });
    } catch (dbError) {
      console.error('Error in fallback query:', dbError);
      res.status(500).json({ message: 'Error fetching AI history' });
    }
  }
});

// Get league stats (uses pre-computed file with fallback)
router.get('/ai/league-stats', withCache('league-stats', 300), async (req, res) => {
  try {
    // Try to read from pre-computed file
    const leagueStats = await readStatsFile('league-stats.json');
    res.json(leagueStats.stats); // Return just the stats array to maintain compatibility
  } catch (error) {
    console.error('Error fetching league stats from file:', error);
    
    // Fallback to database query if file is not available
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
                  { 
                    $eq: [
                      "$aiPrediction",
                      {
                        $cond: [
                          { $gt: ["$score.fullTime.home", "$score.fullTime.away"] },
                          "HOME_TEAM",
                          {
                            $cond: [
                              { $gt: ["$score.fullTime.away", "$score.fullTime.home"] },
                              "AWAY_TEAM",
                              "DRAW"
                            ]
                          }
                        ]
                      }
                    ]
                  },
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
      ]);

      res.json(stats);
    } catch (dbError) {
      console.error('Error in fallback query:', dbError);
      res.status(500).json({ message: 'Error fetching league stats' });
    }
  }
});

// Admin route to manually trigger stats file generation
router.post('/generate-files', async (req, res) => {
  try {
    const generateAllStatsFiles = require('../scripts/generateStatsFiles');
    const result = await generateAllStatsFiles();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Stats files generated successfully',
        details: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error generating stats files',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in stats file generation endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating stats files',
      error: error.message
    });
  }
});

module.exports = router;