const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Match = require('../models/Match');
const adminAuth = require('../middleware/admin');
const bcrypt = require('bcryptjs');
const AIPredictionStat = require('../models/AIPredictionStat');
const { processMatchesForDate } = require('../fetchMatches');
const generateOddsFiles = require('../scripts/generateOddsFile');
const generateStats = require('../scripts/statsGenerator');

// Admin login route (public)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findByCredentials(username, password);
    const token = admin.generateAuthToken();
    
    res.json({
      message: 'Admin logged in successfully',
      token
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(401).json({ message: 'Invalid login credentials' });
  }
});

// Protected admin routes - all routes below this use adminAuth middleware
router.use(adminAuth);

// Get admin profile
router.get('/profile', async (req, res) => {
  try {
    res.json({
      username: req.admin.username,
      email: req.admin.email
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admin profile' });
  }
});

// Update match details
router.post('/matches/update', async (req, res) => {
  try {
    const { matchId, status, score, aiPrediction } = req.body;
    
    const match = await Match.findOne({ id: matchId });
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (status) match.status = status;
    if (score) match.score = score;
    if (aiPrediction) match.aiPrediction = aiPrediction;

    await match.save();
    
    res.json({ 
      message: 'Match updated successfully',
      match 
    });
  } catch (error) {
    console.error('Error updating match:', error);
    res.status(500).json({ message: 'Error updating match' });
  }
});

// Add AI prediction to match
router.post('/matches/:matchId/prediction', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { prediction } = req.body;

    if (!['HOME_TEAM', 'AWAY_TEAM', 'DRAW'].includes(prediction)) {
      return res.status(400).json({ message: 'Invalid prediction value' });
    }

    const match = await Match.findOne({ id: matchId });
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    match.aiPrediction = prediction;
    await match.save();

    res.json({
      message: 'AI prediction added successfully',
      match
    });
  } catch (error) {
    console.error('Error adding AI prediction:', error);
    res.status(500).json({ message: 'Error adding prediction' });
  }
});

// Get all matches for admin
router.get('/matches', async (req, res) => {
  try {
    const matches = await Match.find({})
      .sort({ utcDate: -1 })
      .limit(50);
      
    res.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ message: 'Error fetching matches' });
  }
});

// Change admin password
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, req.admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    req.admin.password = newPassword;
    await req.admin.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
});

// Fetch matches endpoint
router.post('/fetch-matches', async (req, res) => {
  try {
    const { date, debug } = req.body;
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    console.log('Received fetch request for date:', date);

    // Call the processMatchesForDate function from fetchMatches.js
    const stats = await processMatchesForDate(new Date(date));
    console.log('Processing stats:', stats);

    if (debug) {
      // Return detailed debug information
      return res.json({
        success: true,
        stats,
        debug: {
          requestDate: date,
          processedMatches: stats.processed,
          totalMatches: stats.total,
          filteredMatches: stats.filtered
        },
        message: `Successfully processed matches for ${date}`
      });
    }

    // Get the updated matches from the database
    const targetDate = new Date(date);
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 1);

    const matches = await Match.find({
      utcDate: {
        $gte: targetDate.toISOString(),
        $lt: endDate.toISOString()
      }
    });

    res.json({
      success: true,
      stats: {
        ...stats,
        dbMatches: matches.length
      },
      message: `Successfully processed ${stats.filtered} matches and found ${matches.length} matches in database for ${date}`
    });

  } catch (error) {
    console.error('Error in fetch-matches:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching matches',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Reset AI stats
router.post('/reset-ai', async (req, res) => {
  try {
    // Reset the AI prediction stats
    await AIPredictionStat.findOneAndUpdate({}, {
      $set: {
        totalPredictions: 0,
        correctPredictions: 0,
        dailyStats: []
      }
    }, { upsert: true });

    // Reset AI predictions in matches
    await Match.updateMany(
      { aiPrediction: { $exists: true } },
      { $set: { aiPrediction: null } }
    );

    res.json({
      success: true,
      message: 'AI prediction stats have been reset'
    });
  } catch (error) {
    console.error('Error resetting AI stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error resetting AI stats',
      error: error.message 
    });
  }
});

// Recalculate stats
router.post('/recalculate-stats', async (req, res) => {
  try {
    const aiStats = await AIPredictionStat.findOne() || new AIPredictionStat();
    aiStats.totalPredictions = 0;
    aiStats.correctPredictions = 0;

    const matches = await Match.find({ 
      status: 'FINISHED',
      aiPrediction: { $exists: true }
    });

    for (const match of matches) {
      if (match.aiPrediction) {
        aiStats.totalPredictions++;
        
        const actualResult = match.score.winner || 
          (match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' : 
           match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW');

        if (match.aiPrediction === actualResult) {
          aiStats.correctPredictions++;
        }
      }
    }

    await aiStats.save();

    res.json({
      success: true,
      aiStats: {
        total: aiStats.totalPredictions,
        correct: aiStats.correctPredictions,
        accuracy: aiStats.totalPredictions > 0 
          ? (aiStats.correctPredictions / aiStats.totalPredictions * 100).toFixed(2)
          : 0
      }
    });
  } catch (error) {
    console.error('Error recalculating stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error recalculating stats',
      error: error.message 
    });
  }
});

router.post('/fetch-odds', async (req, res) => {  // Changed from '/fetchOdds' to '/fetch-odds'
  try {
    const { date } = req.body;
    const stats = await require('../fetchOdds').processOddsForDate(date);
    res.json({ 
      success: true, 
      stats,
      message: `Successfully processed odds for ${stats.updated} out of ${stats.total} matches.`
    });
  } catch (error) {
    console.error('Error processing odds:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

const fixDailyStats = require('../scripts/fixDailyStats');
const generateAllStatsFile = require('../scripts/generateStatsFile');

// Simple admin route to fix daily stats
router.post('/fix-stats', async (req, res) => {
  try {
    console.log('Admin triggered stats fix');
    
    // Run the fix script
    const result = await fixDailyStats();
    
    if (result.success) {
      // Regenerate stats files
      try {
        const fileResult = await generateAllStatsFile();
        console.log('Stats files regenerated');
        
        // Return combined results
        return res.json({
          success: true,
          stats: result,
          files: fileResult
        });
      } catch (fileError) {
        console.error('Error generating stats files:', fileError);
        return res.json({
          success: true,
          stats: result,
          files: { success: false, error: fileError.message }
        });
      }
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error fixing stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/generate-odds', async (req, res) => {
  try {
    console.log('Admin triggered odds file generation');
    
    // Run the generate odds script
    const result = await generateOddsFiles();
    
    if (result && result.success) {
      return res.json({
        success: true,
        message: 'Odds files generated successfully',
        result
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate odds files',
        error: result?.error || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error generating odds files:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating odds files',
      error: error.message
    });
  }
});

// Add the route
router.post('/generate-stats', async (req, res) => {
  try {
    console.log('Admin requested manual stats generation');
    
    // Call the generator function
    const result = await generateStats();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Stats generated successfully',
        details: {
          timestamp: new Date().toISOString(),
          totalMatches: result.totalMatches || 'N/A',
          totalLeagues: result.totalLeagues || 'N/A'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Stats generation failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in generate-stats endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating stats',
      error: error.message
    });
  }
});


module.exports = router;