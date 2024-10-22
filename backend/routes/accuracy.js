// routes/accuracy.js
const express = require('express');
const router = express.Router();
const AccuracyStats = require('../models/AccuracyStats');

router.get('/', async (req, res) => {
  try {
    // Get the most recent accuracy stats
    const accuracyStats = await AccuracyStats.findOne().sort({ lastUpdated: -1 });
    
    if (!accuracyStats) {
      console.log('No accuracy stats found');
      return res.json({
        data: {
          fanAccuracy: 0,
          aiAccuracy: 0,
          lastUpdated: new Date()
        }
      });
    }

    console.log('Returning accuracy stats:', {
      fanAccuracy: accuracyStats.fanAccuracy,
      aiAccuracy: accuracyStats.aiAccuracy,
      lastUpdated: accuracyStats.lastUpdated
    });

    res.json({
      data: {
        fanAccuracy: accuracyStats.fanAccuracy,
        aiAccuracy: accuracyStats.aiAccuracy,
        lastUpdated: accuracyStats.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error fetching accuracy stats:', error);
    res.status(500).json({ 
      error: 'Error fetching accuracy stats',
      message: error.message 
    });
  }
});

module.exports = router;