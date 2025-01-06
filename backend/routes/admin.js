const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Match = require('../models/Match');
const AIPredictionStat = require('../models/AIPredictionStat');
const FanPredictionStat = require('../models/FanPredictionStat');
const { processMatchesForDate } = require('../fetchMatches');
const { recalculateAllStats } = require('../utils/statsProcessor');

// AI Prediction route
router.post('/:matchId/predict', [auth, admin], async (req, res) => {
  console.log('Admin prediction route called');
  console.log('Request body:', req.body);
  console.log('Match ID:', req.params.matchId);

  try {
    const { matchId } = req.params;
    const { prediction } = req.body;

    if (!['HOME_TEAM', 'DRAW', 'AWAY_TEAM'].includes(prediction)) {
      console.log('Invalid prediction:', prediction);
      return res.status(400).json({ message: 'Invalid prediction' });
    }

    const match = await Match.findOne({ id: matchId });

    if (!match) {
      console.log('Match not found:', matchId);
      return res.status(404).json({ message: 'Match not found' });
    }

    console.log('Match status:', match.status);
    if (match.status !== 'TIMED' && match.status !== 'SCHEDULED') {
      console.log('Invalid match status for prediction');
      return res.status(400).json({ message: 'Prediction is not allowed for this match' });
    }

    match.aiPrediction = prediction;
    await match.save();

    console.log('AI prediction saved successfully');
    res.json({ message: 'AI prediction recorded successfully', prediction });
  } catch (error) {
    console.error('Error recording AI prediction:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Process finished matches route
router.post('/process-finished', [auth, admin], async (req, res) => {
  try {
    const finishedMatches = await Match.find({ 
      status: 'FINISHED',
      processed: false
    });

    console.log(`Found ${finishedMatches.length} unprocessed matches to process`);

    let successCount = 0;
    const results = [];

    for (const match of finishedMatches) {
      const success = await processFinishedMatch(match);
      if (success) {
        successCount++;
        results.push({
          id: match.id,
          teams: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
          status: 'processed'
        });
      } else {
        results.push({
          id: match.id,
          teams: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
          status: 'failed'
        });
      }
    }

    res.json({
      message: `Processed ${successCount}/${finishedMatches.length} matches`,
      results
    });
  } catch (error) {
    console.error('Error processing finished matches:', error);
    res.status(500).json({
      message: 'Error processing finished matches',
      error: error.message
    });
  }
});

// Updated fetch matches route with date parameter
router.post('/fetch-matches', [auth, admin], async (req, res) => {
  try {
    const { date } = req.body;
    console.log('Manual fetch matches triggered for date:', date);
    
    if (!date) {
      return res.status(400).json({ 
        error: 'Date is required',
        message: 'Please provide a valid date' 
      });
    }
    
    const fetchDate = new Date(date);
    if (isNaN(fetchDate.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format',
        message: 'Please provide a valid date format' 
      });
    }

    const result = await processMatchesForDate(fetchDate);
    
    res.json({ 
      success: true,
      message: 'Matches fetched successfully',
      stats: {
        total: result.total,
        filtered: result.filtered,
        processed: result.processed
      }
    });
  } catch (error) {
    console.error('Error in manual fetch matches:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching matches',
      message: error.message 
    });
  }
});

// Reset AI stats route
router.post('/reset-ai', [auth, admin], async (req, res) => {
  try {
    console.log('Resetting AI stats');
    
    // Reset the AI prediction stats document
    await AIPredictionStat.findOneAndUpdate(
      {},
      {
        $set: {
          totalPredictions: 0,
          correctPredictions: 0,
          lastReset: new Date(),
          dailyStats: [],
          predictions: []
        }
      },
      { upsert: true }
    );
    
    res.json({
      success: true,
      message: 'AI stats reset successfully'
    });
  } catch (error) {
    console.error('Error resetting AI stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error resetting AI stats',
      message: error.message
    });
  }
});

// Reset fan stats route
router.post('/reset-fans', [auth, admin], async (req, res) => {
  try {
    console.log('Resetting fan stats');
    
    // Reset the fan prediction stats document
    await FanPredictionStat.findOneAndUpdate(
      {},
      {
        $set: {
          totalPredictions: 0,
          correctPredictions: 0,
          lastReset: new Date(),
          dailyStats: []
        }
      },
      { upsert: true }
    );
    
    res.json({
      success: true,
      message: 'Fan stats reset successfully'
    });
  } catch (error) {
    console.error('Error resetting fan stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error resetting fan stats',
      message: error.message
    });
  }
});

// Reset all stats route
router.post('/reset-all', [auth, admin], async (req, res) => {
  try {
    console.log('Resetting all stats');
    
    // Reset both AI and Fan stats
    await Promise.all([
      AIPredictionStat.findOneAndUpdate(
        {},
        {
          $set: {
            totalPredictions: 0,
            correctPredictions: 0,
            lastReset: new Date(),
            dailyStats: [],
            predictions: []
          }
        },
        { upsert: true }
      ),
      FanPredictionStat.findOneAndUpdate(
        {},
        {
          $set: {
            totalPredictions: 0,
            correctPredictions: 0,
            lastReset: new Date(),
            dailyStats: []
          }
        },
        { upsert: true }
      )
    ]);
    
    res.json({
      success: true,
      message: 'All stats reset successfully'
    });
  } catch (error) {
    console.error('Error resetting all stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error resetting all stats',
      message: error.message
    });
  }
});

// Recalculate stats route
router.post('/recalculate-stats', [auth, admin], async (req, res) => {
  try {
    console.log('Starting full stats recalculation');
    const stats = await recalculateAllStats();
    res.json({
      message: 'Stats recalculated successfully',
      stats
    });
  } catch (error) {
    console.error('Error recalculating stats:', error);
    res.status(500).json({
      error: 'Error recalculating stats',
      message: error.message
    });
  }
});

module.exports = router;