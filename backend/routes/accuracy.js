const express = require('express');
const router = express.Router();
const AIPredictionStat = require('../models/AIPredictionStat');
const Match = require('../models/Match');

// Helper function to get today's date at midnight
const getTodayDate = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// Get overall AI accuracy
router.get('/ai', async (req, res) => {
  try {
    const aiStat = await AIPredictionStat.findOne() || new AIPredictionStat();
    
    const accuracy = aiStat.totalPredictions > 0
      ? (aiStat.correctPredictions / aiStat.totalPredictions * 100)
      : 0;

    res.json({
      aiAccuracy: accuracy,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error fetching AI accuracy:', error);
    res.status(500).json({ 
      message: 'Error fetching AI accuracy',
      error: error.message 
    });
  }
});

// Get daily AI stats and store them
router.get('/ai/daily', async (req, res) => {
  try {
    const today = getTodayDate();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's matches
    const todayMatches = await Match.find({
      status: 'FINISHED',
      utcDate: {
        $gte: today.toISOString(),
        $lt: tomorrow.toISOString()
      },
      aiPrediction: { $exists: true }
    });

    // Calculate today's stats
    let total = 0;
    let correct = 0;

    todayMatches.forEach(match => {
      if (match.aiPrediction) {
        total++;
        const actualResult = match.score.winner || 
          (match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' : 
           match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW');

        if (match.aiPrediction === actualResult) {
          correct++;
        }
      }
    });

    // Update or create today's stats in the database
    const aiStat = await AIPredictionStat.findOne() || new AIPredictionStat();
    
    // Find today's stats in the dailyStats array
    const todayStats = aiStat.dailyStats.find(stat => 
      stat.date.toDateString() === today.toDateString()
    );

    if (todayStats) {
      todayStats.totalPredictions = total;
      todayStats.correctPredictions = correct;
    } else {
      aiStat.dailyStats.push({
        date: today,
        totalPredictions: total,
        correctPredictions: correct
      });
    }

    // Keep only last 30 days of stats
    aiStat.dailyStats = aiStat.dailyStats
      .sort((a, b) => b.date - a.date)
      .slice(0, 30);

    await aiStat.save();

    res.json({
      total,
      correct
    });
  } catch (error) {
    console.error('Error handling daily AI stats:', error);
    res.status(500).json({ 
      message: 'Error handling daily AI stats',
      error: error.message 
    });
  }
});

// Get AI stats for the last two days
router.get('/ai/two-days', async (req, res) => {
  try {
    const aiStat = await AIPredictionStat.findOne();
    if (!aiStat) {
      return res.json({
        today: { total: 0, correct: 0 },
        yesterday: { total: 0, correct: 0 }
      });
    }

    // Get today's and yesterday's dates at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Find today's and yesterday's stats from dailyStats array
    const todayStats = aiStat.dailyStats.find(
      stat => stat.date.toDateString() === today.toDateString()
    ) || { totalPredictions: 0, correctPredictions: 0 };

    const yesterdayStats = aiStat.dailyStats.find(
      stat => stat.date.toDateString() === yesterday.toDateString()
    ) || { totalPredictions: 0, correctPredictions: 0 };

    // Format response to match what PredictionTicker expects
    res.json({
      today: {
        total: todayStats.totalPredictions,
        correct: todayStats.correctPredictions
      },
      yesterday: {
        total: yesterdayStats.totalPredictions,
        correct: yesterdayStats.correctPredictions
      }
    });

  } catch (error) {
    console.error('Error fetching two days stats:', error);
    res.status(500).json({ 
      message: 'Error fetching two days stats',
      error: error.message 
    });
  }
});

// New route to get historical stats
router.get('/ai/history', async (req, res) => {
  try {
    const aiStat = await AIPredictionStat.findOne();
    if (!aiStat) {
      return res.json({ stats: [] });
    }

    // Add overall totals to the response
    const stats = aiStat.dailyStats.map(stat => ({
      date: stat.date,
      accuracy: stat.totalPredictions > 0 
        ? (stat.correctPredictions / stat.totalPredictions * 100)
        : 0,
      totalPredictions: stat.totalPredictions,
      correctPredictions: stat.correctPredictions
    }));

    // Calculate overall stats
    const overallStats = {
      totalPredictions: aiStat.totalPredictions,
      correctPredictions: aiStat.correctPredictions,
      overallAccuracy: aiStat.totalPredictions > 0 
        ? (aiStat.correctPredictions / aiStat.totalPredictions * 100)
        : 0
    };

    res.json({ 
      stats,
      overall: overallStats 
    });
  } catch (error) {
    console.error('Error fetching historical stats:', error);
    res.status(500).json({ 
      message: 'Error fetching historical stats',
      error: error.message 
    });
  }
});


module.exports = router;