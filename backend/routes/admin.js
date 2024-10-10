const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Match = require('../models/Match');

router.post('/:matchId/predict', [auth, admin], async (req, res) => {
  console.log('Admin prediction route called');
  try {
    const { matchId } = req.params;
    const { prediction } = req.body;

    if (!['HOME_TEAM', 'DRAW', 'AWAY_TEAM'].includes(prediction)) {
      return res.status(400).json({ message: 'Invalid prediction' });
    }

    const match = await Match.findOne({ id: matchId });

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.status !== 'TIMED' && match.status !== 'SCHEDULED') {
      return res.status(400).json({ message: 'Prediction is not allowed for this match' });
    }

    match.aiPrediction = prediction;
    await match.save();

    res.json({ message: 'AI prediction recorded successfully', prediction });
  } catch (error) {
    console.error('Error recording AI prediction:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;