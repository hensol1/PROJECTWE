const express = require('express');
const router = express.Router();
const Match = require('../models/Match');

router.get('/', async (req, res) => {
  const { date } = req.query;
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  try {
    const matches = await Match.find({
      utcDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ 'competition.name': 1, utcDate: 1 });

    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching matches', error: error.message });
  }
});

module.exports = router;