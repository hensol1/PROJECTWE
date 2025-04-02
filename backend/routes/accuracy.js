const express = require('express');
const router = express.Router();
const AIPredictionStat = require('../models/AIPredictionStat');
const Match = require('../models/Match');
const PREDICTIONS_START_DATE = new Date('2025-01-15T00:00:00Z');
const { format } = require('date-fns');

async function validateAndFixStats() {
  try {
    console.log('Running stats validation and fix...');
    
    // Calculate actual stats from matches
    const matches = await Match.find({
      status: 'FINISHED',
      aiPrediction: { $exists: true }
    });
    
    // Calculate overall totals
    const totalPredictions = matches.length;
    const correctPredictions = matches.filter(match => {
      // Calculate actual result based on full time score - using the same logic as fixDailyStats.js
      const homeScore = match.score.fullTime.home;
      const awayScore = match.score.fullTime.away;
      const actualResult = homeScore > awayScore ? 'HOME_TEAM' : 
                          awayScore > homeScore ? 'AWAY_TEAM' : 'DRAW';
      
      return match.aiPrediction === actualResult;
    }).length;
    
        
    // Get the stored stats
    const aiStats = await AIPredictionStat.findOne();
    if (!aiStats) {
      console.log('No AIPredictionStat found, creating new one...');
      const newAiStats = new AIPredictionStat({
        totalPredictions,
        correctPredictions,
        dailyStats: []
      });
      await newAiStats.save();
      return;
    }
    
    // Check if there's a discrepancy
    if (aiStats.totalPredictions !== totalPredictions || aiStats.correctPredictions !== correctPredictions) {
      console.log('Stats discrepancy found, fixing...', {
        stored: {
          total: aiStats.totalPredictions,
          correct: aiStats.correctPredictions
        },
        actual: {
          total: totalPredictions,
          correct: correctPredictions
        }
      });
      
      // Update the overall stats
      aiStats.totalPredictions = totalPredictions;
      aiStats.correctPredictions = correctPredictions;
      
      // Also validate and fix daily stats
      await validateAndFixDailyStats(aiStats);
      
      await aiStats.save();
      console.log('Stats fixed successfully');
    } else {
      console.log('Stats validation passed, no fix needed');
    }
  } catch (error) {
    console.error('Error in validateAndFixStats:', error);
  }
}

// Helper function to validate and fix daily stats
async function validateAndFixDailyStats(aiStats) {
  try {
    // Group matches by date
    const matchesByDate = await Match.aggregate([
      {
        $match: {
          status: 'FINISHED',
          aiPrediction: { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { 
              format: "%Y-%m-%d", 
              date: { $dateFromString: { dateString: "$utcDate" } }
            }
          },
          matches: { $push: "$$ROOT" }
        }
      }
    ]);
    
    // Process each date's matches
    for (const dayData of matchesByDate) {
      const dateStr = dayData._id;
      const matchDate = new Date(dateStr);
      matchDate.setHours(0, 0, 0, 0);
      
      // Calculate stats for this day
      const dayMatches = dayData.matches;
      const totalForDay = dayMatches.length;
      const correctForDay = dayMatches.filter(match => {
        const actualResult = match.score.winner || 
          (match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' : 
          match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW');
        return match.aiPrediction === actualResult;
      }).length;
      
      // Find this day in the stats
      const existingDayStat = aiStats.dailyStats.find(
        stat => new Date(stat.date).toDateString() === matchDate.toDateString()
      );
      
      if (existingDayStat) {
        // Update if different
        if (existingDayStat.totalPredictions !== totalForDay || 
            existingDayStat.correctPredictions !== correctForDay) {
          console.log(`Fixing stats for ${dateStr}:`, {
            old: {
              total: existingDayStat.totalPredictions,
              correct: existingDayStat.correctPredictions
            },
            new: {
              total: totalForDay,
              correct: correctForDay
            }
          });
          
          existingDayStat.totalPredictions = totalForDay;
          existingDayStat.correctPredictions = correctForDay;
        }
      } else {
        // Add new day stat
        console.log(`Adding missing day stat for ${dateStr}`);
        aiStats.dailyStats.push({
          date: matchDate,
          totalPredictions: totalForDay,
          correctPredictions: correctForDay
        });
      }
    }
    
    // Sort daily stats by date (newest first)
    aiStats.dailyStats.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log(`Fixed ${matchesByDate.length} daily stat entries`);
  } catch (error) {
    console.error('Error in validateAndFixDailyStats:', error);
  }
}

// Helper function to get today's date at midnight
const getTodayDate = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// Get overall AI accuracy
router.get('/ai', async (req, res) => {
  try {
    const aiStat = await AIPredictionStat.findOne();
    
    if (!aiStat) {
      return res.json({
        aiAccuracy: 0,
        totalPredictions: 0,
        correctPredictions: 0,
        lastUpdated: new Date()
      });
    }
    
    // Use stored values directly instead of recalculating
    const accuracy = aiStat.totalPredictions > 0
      ? (aiStat.correctPredictions / aiStat.totalPredictions * 100)
      : 0;

    // Return full stats object including the raw counts
    res.json({
      aiAccuracy: accuracy,
      totalPredictions: aiStat.totalPredictions,
      correctPredictions: aiStat.correctPredictions,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error fetching AI accuracy:', error);
    res.status(500).json({ 
      message: 'Error fetching AI accuracy',
      error: error.message 
    });
  }
});

// Get daily AI stats and store them
router.get('/ai/daily', async (req, res) => {
  try {
    const today = getTodayDate();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get ALL finished matches for today, not just ones with predictions
    const todayMatches = await Match.find({
      status: 'FINISHED',
      aiPrediction: { $exists: true },
      utcDate: {
        $gte: today.toISOString(),
        $lt: tomorrow.toISOString()
      }
    }).lean();
    
    const todayStats = {
      total: todayMatches.length,
      correct: todayMatches.filter(m => {
        // Calculate actual result based on scores
        const homeScore = m.score.fullTime.home;
        const awayScore = m.score.fullTime.away;
        const actualResult = homeScore > awayScore ? 'HOME_TEAM' : 
                            awayScore > homeScore ? 'AWAY_TEAM' : 'DRAW';
        return m.aiPrediction === actualResult;
      }).length
    };
    
    // Retrieve the AI stats record
    const aiStat = await AIPredictionStat.findOne() || new AIPredictionStat();
    
    // Keep only last 30 days
    aiStat.dailyStats = aiStat.dailyStats
      .sort((a, b) => b.date - a.date)
      .slice(0, 30);

    await aiStat.save();

    // Add debug logging
    console.log('Daily stats calculated:', {
      date: today,
      total: todayStats.total,
      correct: todayStats.correct,
      matches: todayMatches.map(m => ({
        id: m._id,
        aiPrediction: m.aiPrediction,
        status: m.status,
        score: m.score
      }))
    });

    res.json({
      total: todayStats.total,
      correct: todayStats.correct
    });
  } catch (error) {
    console.error('Error handling daily AI stats:', error);
    res.status(500).json({ 
      message: 'Error handling daily AI stats',
      error: error.message 
    });
  }
});

// Get AI stats for the last two days
router.get('/ai/two-days', async (req, res) => {
  try {
    // Get today's and yesterday's dates at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Debug log the date ranges we're querying
    console.log('Querying date ranges:', {
      today: today.toISOString(),
      tomorrow: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      yesterday: yesterday.toISOString()
    });

    // Get matches for both days directly from Match model
    const [todayMatches, yesterdayMatches] = await Promise.all([
      Match.find({
        status: 'FINISHED',
        utcDate: {
          $gte: today.toISOString(),
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
        }
      }),
      Match.find({
        status: 'FINISHED',
        utcDate: {
          $gte: yesterday.toISOString(),
          $lt: today.toISOString()
        }
      })
    ]);

    // Calculate stats directly from matches
    const calculateDayStats = (matches) => {
      let total = matches.length;
      let correct = 0;

      matches.forEach(match => {
        if (match.aiPrediction) {
          const actualResult = match.score.winner || 
            (match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' : 
             match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW');

          if (match.aiPrediction === actualResult) {
            correct++;
          }
        }
      });

      return { total, correct };
    };

    const todayStats = calculateDayStats(todayMatches);
    const yesterdayStats = calculateDayStats(yesterdayMatches);

    // Debug log the detailed stats calculation
    console.log('Calculated stats:', {
      today: {
        matches: todayMatches.map(m => ({
          id: m._id,
          prediction: m.aiPrediction,
          score: m.score,
          status: m.status
        })),
        stats: todayStats
      },
      yesterday: {
        matches: yesterdayMatches.map(m => ({
          id: m._id,
          prediction: m.aiPrediction,
          score: m.score,
          status: m.status
        })),
        stats: yesterdayStats
      }
    });

    // Return the calculated stats
    const response = {
      today: todayStats,
      yesterday: yesterdayStats
    };

    console.log('Sending response:', response);
    res.json(response);

  } catch (error) {
    console.error('Error fetching two days stats:', error);
    res.status(500).json({ 
      message: 'Error fetching two days stats',
      error: error.message 
    });
  }
});

// New route to get historical stats
router.get('/ai/history', async (req, res) => {
  try {
    // Get data directly from AIPredictionStat model
    const aiStat = await AIPredictionStat.findOne().lean();
    
    if (!aiStat) {
      return res.json({
        stats: [],
        overall: {
          totalPredictions: 0,
          correctPredictions: 0,
          overallAccuracy: 0
        }
      });
    }
    
    // Format daily stats
    const stats = aiStat.dailyStats.map(stat => ({
      date: format(new Date(stat.date), 'yyyy-MM-dd'),
      totalPredictions: stat.totalPredictions,
      correctPredictions: stat.correctPredictions,
      accuracy: stat.totalPredictions > 0 
        ? (stat.correctPredictions / stat.totalPredictions * 100)
        : 0
    })).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Use the stored values for overall stats
    const overall = {
      totalPredictions: aiStat.totalPredictions,
      correctPredictions: aiStat.correctPredictions,
      overallAccuracy: aiStat.totalPredictions > 0 
        ? (aiStat.correctPredictions / aiStat.totalPredictions * 100)
        : 0
    };
    
    // Log what we're returning for debugging
    console.log('AI history response:', {
      totalDays: stats.length,
      overall
    });
    
    res.json({
      stats,
      overall
    });
  } catch (error) {
    console.error('Error fetching historical stats:', error);
    res.status(500).json({ 
      message: 'Error fetching historical stats',
      error: error.message 
    });
  }
});

router.get('/ai/league-stats', async (req, res) => {
  try {
    // Get all finished matches with predictions (removed date filter)
    const matches = await Match.find({
      status: 'FINISHED',
      aiPrediction: { $exists: true }
    });

    // Group matches by competition and include country data
    const leagueStats = matches.reduce((acc, match) => {
      const competitionId = match.competition?.id;
      
      if (!competitionId) {
        console.log('Match missing competition ID:', match._id);
        return acc;
      }
      
      if (!acc[competitionId]) {
        acc[competitionId] = {
          id: competitionId,
          name: match.competition.name,
          emblem: match.competition.emblem,
          country: match.competition.country, // Add country data
          totalPredictions: 0,
          correctPredictions: 0,
          matches: []
        };
      }

      const actualResult = match.score.winner || 
        (match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' : 
         match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW');

      acc[competitionId].totalPredictions++;
      if (match.aiPrediction === actualResult) {
        acc[competitionId].correctPredictions++;
      }
      acc[competitionId].matches.push(match._id);

      return acc;
    }, {});

    // Transform to array and calculate percentages
    const leagueStatsArray = Object.values(leagueStats)
      .map(league => ({
        id: league.id,
        name: league.name,
        emblem: league.emblem,
        country: league.country, // Include country in the response
        totalPredictions: league.totalPredictions,
        correctPredictions: league.correctPredictions,
        accuracy: league.totalPredictions > 0 
          ? (league.correctPredictions / league.totalPredictions * 100).toFixed(1)
          : 0,
        matchCount: league.matches.length
      }))
      .sort((a, b) => b.totalPredictions - a.totalPredictions);

    // Debug log to verify country data
    console.log('League stats sample:', leagueStatsArray[0]);

    res.json(leagueStatsArray);
  } catch (error) {
    console.error('Error fetching league stats:', error);
    res.status(500).json({ 
      message: 'Error fetching league stats',
      error: error.message 
    });
  }
});

// Add this near the bottom of your accuracy.js file (before module.exports)

// Run validation on server start
validateAndFixStats().catch(err => {
  console.error('Error during stats validation on startup:', err);
});

// Admin route to manually fix stats
router.post('/admin/fix-stats', async (req, res) => {
  try {
    await validateAndFixStats();
    res.json({ success: true, message: 'Stats validation and fix completed' });
  } catch (error) {
    console.error('Error in fix-stats endpoint:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fixing stats',
      error: error.message
    });
  }
});

module.exports = router;