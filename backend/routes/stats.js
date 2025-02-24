const express = require('express');
const router = express.Router();
const NodeCache = require('node-cache');
const Match = require('../models/Match');
const AIPredictionStat = require('../models/AIPredictionStat');

// Cache with 1 hour TTL
const statsCache = new NodeCache({ stdTTL: 3600 });

// Middleware to handle cache
const withCache = (key, ttl = 3600) => async (req, res, next) => {
  try {
    // Check cache first
    const cached = statsCache.get(key);
    if (cached) {
      console.log(`Cache hit for ${key}`);
      return res.json(cached);
    }

    // Store original res.json to intercept the response
    const originalJson = res.json;
    res.json = function(data) {
      // Store in cache before sending
      statsCache.set(key, data, ttl);
      return originalJson.call(this, data);
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Clear cache at midnight
const setupCacheClear = () => {
  const now = new Date();
  const night = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const msToMidnight = night.getTime() - now.getTime();

  setTimeout(() => {
    statsCache.flushAll();
    setupCacheClear(); // Setup next day's clear
  }, msToMidnight);
};

setupCacheClear();

// Get daily stats with 15-minute cache
router.get('/daily-predictions', withCache('daily-stats', 900), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const matches = await Match.find({
      utcDate: {
        $gte: today.toISOString(),
        $lt: tomorrow.toISOString()
      }
    }).lean(); // Use lean() for better performance

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

// Get general stats with 1-hour cache
router.get('/general', withCache('general-stats', 3600), async (req, res) => {
  try {
    const [matches, aiStats] = await Promise.all([
      Match.find({ status: 'FINISHED' }).lean(),
      AIPredictionStat.findOne().lean()
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