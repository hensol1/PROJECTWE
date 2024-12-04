const express = require('express');
const router = express.Router();
const AccuracyStats = require('../models/AccuracyStats');
const FanPredictionStat = require('../models/FanPredictionStat');
const AIPredictionStat = require('../models/AIPredictionStat');
const User = require('../models/User');
const { recalculateAllStats } = require('../utils/statsProcessor');
const { startOfDay } = require('date-fns');
const authMiddleware = require('../middleware/auth'); // Changed this line

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Router is working' });
});

// Main accuracy route
router.get('/', async (req, res) => {
  try {
    let accuracyStats = await AccuracyStats.findOne().sort({ lastUpdated: -1 });
    res.json({ 
      data: {
        fanAccuracy: accuracyStats?.fanAccuracy || 0,
        aiAccuracy: accuracyStats?.aiAccuracy || 0,
        lastUpdated: accuracyStats?.lastUpdated || new Date()
      }
    });
  } catch (error) {
    res.json({
      data: {
        fanAccuracy: 0,
        aiAccuracy: 0,
        lastUpdated: new Date()
      }
    });
  }
});

// Daily stats route
router.get('/daily', async (req, res) => {
  try {
    const today = startOfDay(new Date());
    console.log('Fetching stats for date:', today);

    const [aiStats, fanStats] = await Promise.all([
      AIPredictionStat.findOne(),
      FanPredictionStat.findOne()
    ]);

    const todayAiStats = aiStats?.dailyStats?.find(stat => 
      startOfDay(new Date(stat.date)).getTime() === today.getTime()
    ) || { totalPredictions: 0, correctPredictions: 0 };

    const todayFanStats = fanStats?.dailyStats?.find(stat => 
      startOfDay(new Date(stat.date)).getTime() === today.getTime()
    ) || { totalPredictions: 0, correctPredictions: 0 };

    // Log the found stats
    console.log('Found AI stats:', todayAiStats);
    console.log('Found Fan stats:', todayFanStats);

    const response = {
      data: {
        ai: {
          total: todayAiStats.totalPredictions || 0,
          correct: todayAiStats.correctPredictions || 0
        },
        fans: {
          total: todayFanStats.totalPredictions || 0,
          correct: todayFanStats.correctPredictions || 0
        }
      }
    };

    console.log('Sending daily stats response:', response);
    res.json(response);
  } catch (error) {
    console.error('Error fetching daily accuracy stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// User daily stats route
router.get('/user/daily', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = startOfDay(new Date());
    
    console.log('Fetching daily stats for user:', userId);
    console.log('Today date:', today.toISOString());

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Filter today's finished votes with exact date comparison
    const todayFinishedVotes = user.votes.filter(vote => {
      const voteDate = new Date(vote.createdAt);
      const voteStartOfDay = startOfDay(voteDate);
      
      console.log('Comparing dates:', {
        voteDate: voteStartOfDay.toISOString(),
        today: today.toISOString(),
        isToday: voteStartOfDay.getTime() === today.getTime(),
        isFinished: vote.isCorrect !== null
      });

      // Both conditions must be true:
      // 1. Vote must be from today (exact timestamp comparison after normalizing to start of day)
      // 2. Vote must be finished (isCorrect is not null)
      return voteStartOfDay.getTime() === today.getTime() && vote.isCorrect !== null;
    });

    const stats = {
      total: todayFinishedVotes.length,
      correct: todayFinishedVotes.filter(vote => vote.isCorrect === true).length
    };

    console.log('Daily stats:', {
      userId,
      todayDate: today.toISOString(),
      totalFinishedToday: todayFinishedVotes.length,
      correctToday: stats.correct
    });

    res.json({
      data: stats
    });
  } catch (error) {
    console.error('Error fetching user daily accuracy:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Reset route
router.post('/reset-all', async (req, res) => {
  try {
    res.json({ message: 'Reset successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;