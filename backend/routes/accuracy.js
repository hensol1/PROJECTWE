const express = require('express');
const router = express.Router();
const AccuracyStats = require('../models/AccuracyStats');
const FanPredictionStat = require('../models/FanPredictionStat');
const AIPredictionStat = require('../models/AIPredictionStat');
const { recalculateAllStats } = require('../utils/statsProcessor');

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

module.exports = router;
