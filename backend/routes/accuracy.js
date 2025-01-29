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

    // Get ALL finished matches for today, not just ones with predictions
    const todayMatches = await Match.find({
      status: 'FINISHED',
      utcDate: {
        $gte: today.toISOString(),
        $lt: tomorrow.toISOString()
      }
    });

    // Calculate stats including matches without predictions
    let total = todayMatches.length; // Count all finished matches
    let correct = 0;

    todayMatches.forEach(match => {
      if (match.aiPrediction) {
        const actualResult = match.score.winner || 
          (match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' : 
           match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW');

        if (match.aiPrediction === actualResult) {
          correct++;
        }
      }
    });

    // Update or create today's stats
    const aiStat = await AIPredictionStat.findOne() || new AIPredictionStat();
    
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

    // Keep only last 30 days
    aiStat.dailyStats = aiStat.dailyStats
      .sort((a, b) => b.date - a.date)
      .slice(0, 30);

    await aiStat.save();

    // Add debug logging
    console.log('Daily stats calculated:', {
      date: today,
      total,
      correct,
      matches: todayMatches.map(m => ({
        id: m._id,
        aiPrediction: m.aiPrediction,
        status: m.status,
        score: m.score
      }))
    });

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
    // Get today's and yesterday's dates at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Debug log the date ranges we're querying
    console.log('Querying date ranges:', {
      today: today.toISOString(),
      tomorrow: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      yesterday: yesterday.toISOString()
    });

    // Get matches for both days directly from Match model
    const [todayMatches, yesterdayMatches] = await Promise.all([
      Match.find({
        status: 'FINISHED',
        utcDate: {
          $gte: today.toISOString(),
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
        }
      }),
      Match.find({
        status: 'FINISHED',
        utcDate: {
          $gte: yesterday.toISOString(),
          $lt: today.toISOString()
        }
      })
    ]);

    // Calculate stats directly from matches
    const calculateDayStats = (matches) => {
      let total = matches.length;
      let correct = 0;

      matches.forEach(match => {
        if (match.aiPrediction) {
          const actualResult = match.score.winner || 
            (match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' : 
             match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW');

          if (match.aiPrediction === actualResult) {
            correct++;
          }
        }
      });

      return { total, correct };
    };

    const todayStats = calculateDayStats(todayMatches);
    const yesterdayStats = calculateDayStats(yesterdayMatches);

    // Debug log the detailed stats calculation
    console.log('Calculated stats:', {
      today: {
        matches: todayMatches.map(m => ({
          id: m._id,
          prediction: m.aiPrediction,
          score: m.score,
          status: m.status
        })),
        stats: todayStats
      },
      yesterday: {
        matches: yesterdayMatches.map(m => ({
          id: m._id,
          prediction: m.aiPrediction,
          score: m.score,
          status: m.status
        })),
        stats: yesterdayStats
      }
    });

    // Return the calculated stats
    const response = {
      today: todayStats,
      yesterday: yesterdayStats
    };

    console.log('Sending response:', response);
    res.json(response);

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