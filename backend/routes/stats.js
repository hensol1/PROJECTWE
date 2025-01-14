const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const AIPredictionStat = require('../models/AIPredictionStat');

// Get daily stats
router.get('/daily-predictions', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('Querying for date range:', { start: today.toISOString(), end: tomorrow.toISOString() });

    const matches = await Match.find({
      utcDate: {
        $gte: today.toISOString(),
        $lt: tomorrow.toISOString()
      }
    });

    console.log('Found matches:', matches.length);

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

// Get general stats
router.get('/general', async (req, res) => {
  try {
    const [matches, aiStats] = await Promise.all([
      Match.find({ status: 'FINISHED' }),
      AIPredictionStat.findOne()
    ]);

    const stats = {
      totalMatches: matches.length,
      predictedMatches: matches.filter(m => m.aiPrediction).length,
      aiAccuracy: aiStats ? {
        total: aiStats.totalPredictions,
        correct: aiStats.correctPredictions,
        percentage: aiStats.totalPredictions > 0 
          ? (aiStats.correctPredictions / aiStats.totalPredictions * 100).toFixed(2)
          : 0
      } : { total: 0, correct: 0, percentage: 0 }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching general stats:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
});

module.exports = router;