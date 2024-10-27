const express = require('express');
const router = express.Router();
const AccuracyStats = require('../models/AccuracyStats');
const FanPredictionStat = require('../models/FanPredictionStat');
const AIPredictionStat = require('../models/AIPredictionStat');
const { recalculateAllStats } = require('../utils/statsProcessor');
const { startOfDay } = require('date-fns');

const updatePredictionStats = async (modelType, isCorrect) => {
  const today = startOfDay(new Date());
  const StatModel = modelType === 'AI' ? AIPredictionStat : FanPredictionStat;
  
  try {
    // Get or create stats document
    let stats = await StatModel.findOne();
    if (!stats) {
      stats = new StatModel();
    }

    // Update total stats
    stats.totalPredictions += 1;
    if (isCorrect) {
      stats.correctPredictions += 1;
    }

    // Find today's daily stat or create it
    let dailyStat = stats.dailyStats.find(stat => 
      startOfDay(stat.date).getTime() === today.getTime()
    );

    if (!dailyStat) {
      stats.dailyStats.push({
        date: today,
        totalPredictions: 0,
        correctPredictions: 0
      });
      dailyStat = stats.dailyStats[stats.dailyStats.length - 1];
    }

    // Update daily stats
    dailyStat.totalPredictions += 1;
    if (isCorrect) {
      dailyStat.correctPredictions += 1;
    }

    // Remove old daily stats (keep last 30 days)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    stats.dailyStats = stats.dailyStats.filter(stat => 
      stat.date >= thirtyDaysAgo
    );

    await stats.save();
    return stats;
  } catch (error) {
    console.error(`Error updating ${modelType} prediction stats:`, error);
    throw error;
  }
};

// Add this function to check prediction correctness
const checkPredictionCorrect = (prediction, match) => {
  const homeScore = match.score.fullTime.home;
  const awayScore = match.score.fullTime.away;
  
  let actualResult;
  if (homeScore > awayScore) actualResult = 'HOME_TEAM';
  else if (awayScore > homeScore) actualResult = 'AWAY_TEAM';
  else actualResult = 'DRAW';
  
  return prediction === actualResult;
};


router.get('/', async (req, res) => {
  try {
    // Get the most recent accuracy stats
    let accuracyStats = await AccuracyStats.findOne().sort({ lastUpdated: -1 });
    
    if (!accuracyStats || 
        (Date.now() - new Date(accuracyStats.lastUpdated).getTime()) > 30 * 60 * 1000) {
      console.log('Stats missing or outdated, triggering recalculation');
      await recalculateAllStats();
      accuracyStats = await AccuracyStats.findOne().sort({ lastUpdated: -1 });
    }

    const response = {
      fanAccuracy: accuracyStats ? accuracyStats.fanAccuracy : 0,
      aiAccuracy: accuracyStats ? accuracyStats.aiAccuracy : 0,
      lastUpdated: accuracyStats ? accuracyStats.lastUpdated : new Date()
    };

    console.log('Sending accuracy response:', response);
    res.json({ data: response });

  } catch (error) {
    console.error('Error in accuracy route:', error);
    res.json({
      data: {
        fanAccuracy: 0,
        aiAccuracy: 0,
        lastUpdated: new Date()
      }
    });
  }
});

// Reset AI stats
router.post('/reset-ai', async (req, res) => {
  try {
    // Reset AI predictions and set reset timestamp
    await AIPredictionStat.updateOne(
      {},
      { 
        totalPredictions: 0, 
        correctPredictions: 0,
        lastReset: new Date()
      },
      { upsert: true }
    );

    // Delete accuracy stats to force recalculation
    await AccuracyStats.deleteMany({});

    console.log('AI stats reset successfully');
    res.json({ message: 'AI stats reset successfully' });
  } catch (error) {
    console.error('Error resetting AI stats:', error);
    res.status(500).json({ 
      message: 'Error resetting AI stats',
      error: error.message 
    });
  }
});


// Reset Fan stats
router.post('/reset-fans', async (req, res) => {
  try {
    // Reset fan predictions and set reset timestamp
    await FanPredictionStat.updateOne(
      {},
      { 
        totalPredictions: 0, 
        correctPredictions: 0,
        lastReset: new Date()
      },
      { upsert: true }
    );

    // Delete accuracy stats to force recalculation
    await AccuracyStats.deleteMany({});

    console.log('Fan stats reset successfully');
    res.json({ message: 'Fan stats reset successfully' });
  } catch (error) {
    console.error('Error resetting fan stats:', error);
    res.status(500).json({ 
      message: 'Error resetting fan stats',
      error: error.message 
    });
  }
});

// Also update the reset-all route to include lastReset for both
router.post('/reset-all', async (req, res) => {
  try {
    const resetTime = new Date();
    
    await Promise.all([
      // Reset both prediction stats with reset timestamp
      FanPredictionStat.updateOne(
        {},
        { 
          totalPredictions: 0, 
          correctPredictions: 0,
          lastReset: resetTime
        },
        { upsert: true }
      ),
      AIPredictionStat.updateOne(
        {},
        { 
          totalPredictions: 0, 
          correctPredictions: 0,
          lastReset: resetTime
        },
        { upsert: true }
      ),
      // Clear accuracy stats
      AccuracyStats.deleteMany({})
    ]);

    console.log('All stats reset successfully');
    res.json({ message: 'All stats reset successfully' });
  } catch (error) {
    console.error('Error resetting all stats:', error);
    res.status(500).json({ 
      message: 'Error resetting all stats',
      error: error.message 
    });
  }
});


// Reset all stats
router.post('/reset-all', async (req, res) => {
  try {
    await Promise.all([
      // Reset both prediction stats
      FanPredictionStat.updateOne(
        {},
        { totalPredictions: 0, correctPredictions: 0 },
        { upsert: true }
      ),
      AIPredictionStat.updateOne(
        {},
        { totalPredictions: 0, correctPredictions: 0 },
        { upsert: true }
      ),
      // Clear accuracy stats
      AccuracyStats.deleteMany({})
    ]);

    console.log('All stats reset successfully');
    res.json({ message: 'All stats reset successfully' });
  } catch (error) {
    console.error('Error resetting all stats:', error);
    res.status(500).json({ 
      message: 'Error resetting all stats',
      error: error.message 
    });
  }
});

router.get('/daily', async (req, res) => {
  try {
    const today = startOfDay(new Date());
    
    // Log the date we're looking for
    console.log('Fetching stats for date:', today);

    const [aiStats, fanStats] = await Promise.all([
      AIPredictionStat.findOne(),
      FanPredictionStat.findOne()
    ]);

    // Find today's stats in both collections
    const todayAiStats = aiStats?.dailyStats?.find(stat => 
      startOfDay(new Date(stat.date)).getTime() === today.getTime()
    ) || { totalPredictions: 0, correctPredictions: 0 };

    const todayFanStats = fanStats?.dailyStats?.find(stat => 
      startOfDay(new Date(stat.date)).getTime() === today.getTime()
    ) || { totalPredictions: 0, correctPredictions: 0 };

    // Log what we found
    console.log('Today stats found:', {
      ai: todayAiStats,
      fans: todayFanStats
    });

    const response = {
      data: {
        ai: {
          total: todayAiStats.totalPredictions,
          correct: todayAiStats.correctPredictions
        },
        fans: {
          total: todayFanStats.totalPredictions,
          correct: todayFanStats.correctPredictions
        }
      }
    };

    console.log('Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('Error fetching daily accuracy stats:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

router.get('/debug', async (req, res) => {
  try {
    const today = startOfDay(new Date());
    
    const [aiStats, fanStats] = await Promise.all([
      AIPredictionStat.findOne(),
      FanPredictionStat.findOne()
    ]);

    const todayAiStats = aiStats?.dailyStats?.find(
      stat => startOfDay(new Date(stat.date)).getTime() === today.getTime()
    );

    const todayFanStats = fanStats?.dailyStats?.find(
      stat => startOfDay(new Date(stat.date)).getTime() === today.getTime()
    );

    const matches = await Match.find({
      status: 'FINISHED',
      utcDate: {
        $gte: today.toISOString(),
        $lte: endOfDay(today).toISOString()
      }
    });

    res.json({
      currentTime: new Date().toISOString(),
      today: today.toISOString(),
      todayMatches: matches.length,
      aiStats: todayAiStats,
      fanStats: todayFanStats,
      sampleMatches: matches.slice(0, 3).map(m => ({
        id: m.id,
        date: m.utcDate,
        status: m.status,
        teams: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
        score: m.score.fullTime
      }))
    });
  } catch (error) {
    console.error('Debug route error:', error);
    res.status(500).json({ error: error.message });
  }
});



module.exports = router;
