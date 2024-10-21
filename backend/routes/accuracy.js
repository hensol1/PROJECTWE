const express = require('express');
const router = express.Router();
const AccuracyStats = require('../models/AccuracyStats');

router.get('/', async (req, res) => {
  try {
    const accuracyStats = await AccuracyStats.findOne().sort({ lastUpdated: -1 });
    if (!accuracyStats) {
      return res.status(404).json({ message: 'Accuracy stats not found' });
    }
    res.json(accuracyStats);
  } catch (error) {
    console.error('Error fetching accuracy stats:', error);
    res.status(500).json({ message: 'Error fetching accuracy stats' });
  }
});

module.exports = router;