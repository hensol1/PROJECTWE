const express = require('express');
const router = express.Router();
const AIPredictionStat = require('../models/AIPredictionStat');
const Match = require('../models/Match');
const PREDICTIONS_START_DATE = new Date('2025-01-15T00:00:00Z');

// Helper function to get today's date at midnight
const getTodayDate = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// Get overall AI accuracy
router.get('/ai', async (req, res) => {
  try {
    const aiStat = await AIPredictionStat.findOne() || new AIPredictionStat();
    
    const accuracy = aiStat.totalPredictions > 0
      ? (aiStat.correctPredictions / aiStat.totalPredictions * 100)
      : 0;

    res.json({
      aiAccuracy: accuracy,
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
      utcDate: {
        $gte: today.toISOString(),
        $lt: tomorrow.toISOString()
      }
    });

    // Calculate stats including matches without predictions
    let total = todayMatches.length; // Count all finished matches
    let correct = 0;

    todayMatches.forEach(match => {
      if (match.aiPrediction) {
        const actualResult = match.score.winner || 
          (match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' : 
           match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW');

        if (match.aiPrediction === actualResult) {
          correct++;
        }
      }
    });

    // Update or create today's stats
    const aiStat = await AIPredictionStat.findOne() || new AIPredictionStat();
    
    const todayStats = aiStat.dailyStats.find(stat => 
      stat.date.toDateString() === today.toDateString()
    );

    if (todayStats) {
      todayStats.totalPredictions = total;
      todayStats.correctPredictions = correct;
    } else {
      aiStat.dailyStats.push({
        date: today,
        totalPredictions: total,
        correctPredictions: correct
      });
    }

    // Keep only last 30 days
    aiStat.dailyStats = aiStat.dailyStats
      .sort((a, b) => b.date - a.date)
      .slice(0, 30);

    await aiStat.save();

    // Add debug logging
    console.log('Daily stats calculated:', {
      date: today,
      total,
      correct,
      matches: todayMatches.map(m => ({
        id: m._id,
        aiPrediction: m.aiPrediction,
        status: m.status,
        score: m.score
      }))
    });

    res.json({
      total,
      correct
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
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get only matches from our start date with predictions
    const matches = await Match.find({
      status: 'FINISHED',
      utcDate: {
        $gte: PREDICTIONS_START_DATE,
        $lte: now
      },
      aiPrediction: { $exists: true }
    });

    console.log('Found matches:', {
      total: matches.length,
      dateRange: {
        from: PREDICTIONS_START_DATE,
        to: now
      }
    });

    // Group matches by date
    const groupedMatches = matches.reduce((acc, match) => {
      // Use UTC date for consistency
      const matchDate = new Date(match.utcDate);
      const dateKey = new Date(
        matchDate.getUTCFullYear(), 
        matchDate.getUTCMonth(), 
        matchDate.getUTCDate()
      ).toISOString();

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(match);
      return acc;
    }, {});

    // Calculate stats for each day
    const stats = Object.entries(groupedMatches)
      .map(([date, dayMatches]) => {
        const total = dayMatches.length;
        const correct = dayMatches.filter(match => {
          const actualResult = match.score.winner || 
            (match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' : 
             match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW');
          return match.aiPrediction === actualResult;
        }).length;

        return {
          date: new Date(date),
          accuracy: total > 0 ? (correct / total * 100) : 0,
          totalPredictions: total,
          correctPredictions: correct
        };
      });

    // Calculate overall stats
    const totalPredictions = matches.length;
    const correctPredictions = matches.filter(match => {
      const actualResult = match.score.winner || 
        (match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' : 
         match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW');
      return match.aiPrediction === actualResult;
    }).length;

    // Debug log the stats
    console.log('Calculated stats:', {
      totalDays: stats.length,
      totalPredictions,
      correctPredictions,
      overallAccuracy: (correctPredictions / totalPredictions * 100).toFixed(1)
    });

    res.json({
      stats,
      overall: {
        totalPredictions,
        correctPredictions,
        overallAccuracy: totalPredictions > 0 
          ? (correctPredictions / totalPredictions * 100)
          : 0
      }
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
    const matches = await Match.find({
      status: 'FINISHED',
      utcDate: {
        $gte: PREDICTIONS_START_DATE
      },
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


module.exports = router;