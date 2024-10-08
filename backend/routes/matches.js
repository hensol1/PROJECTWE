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
    console.log('Fetching matches for date:', date);
    console.log('Start of day:', startOfDay.toISOString());
    console.log('End of day:', endOfDay.toISOString());

    const matches = await Match.find({
      utcDate: {
        $gte: startOfDay.toISOString(),
        $lte: endOfDay.toISOString()
      }
    }).sort({ 'competition.name': 1, utcDate: 1 });

    console.log('Matches found:', matches.length);
    console.log('Sample match:', matches[0]);

    res.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ message: 'Error fetching matches', error: error.message });
  }
});

// Add a new route to fetch all matches
router.get('/all', async (req, 
res) => {
  try {
    const matches = await Match.find().limit(10);
    console.log('All matches found:', matches.length);
    console.log('Sample match:', matches[0]);
    res.json(matches);
  } catch (error) {
    console.error('Error fetching all matches:', error);
    res.status(500).json({ message: 'Error fetching all matches', error: error.message });
  }
});

module.exports = router;