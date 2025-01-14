const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const AIPredictionStat = require('../models/AIPredictionStat');
const { startOfDay, endOfDay, parseISO, isValid, subHours, addHours } = require('date-fns');
const { fetchAndStoreEvents } = require('../fetchEvents');
const Event = require('../models/Event');

// Helper functions
const checkPredictionCorrect = (prediction, match) => {
  const homeScore = match.score.fullTime.home;
  const awayScore = match.score.fullTime.away;
  
  let actualResult;
  if (homeScore > awayScore) actualResult = 'HOME_TEAM';
  else if (awayScore > homeScore) actualResult = 'AWAY_TEAM';
  else actualResult = 'DRAW';
  
  return prediction === actualResult;
};

const updatePredictionStats = async (isCorrect) => {
  const today = startOfDay(new Date());
  
  try {
    let stats = await AIPredictionStat.findOne();
    if (!stats) {
      stats = new AIPredictionStat();
    }

    // Update total stats
    stats.totalPredictions += 1;
    if (isCorrect) {
      stats.correctPredictions += 1;
    }

    // Find or create today's daily stat
    let dailyStat = stats.dailyStats.find(stat => 
      startOfDay(stat.date).getTime() === today.getTime()
    );

    if (!dailyStat) {
      stats.dailyStats.push({
        date: today,
        totalPredictions: 0,
        correctPredictions: 0
      });
      dailyStat = stats.dailyStats[stats.dailyStats.length - 1];
    }

    // Update daily stats
    dailyStat.totalPredictions += 1;
    if (isCorrect) {
      dailyStat.correctPredictions += 1;
    }

    // Keep last 30 days of daily stats
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    stats.dailyStats = stats.dailyStats.filter(stat => 
      stat.date >= thirtyDaysAgo
    );

    await stats.save();
    return stats;
  } catch (error) {
    console.error('Error updating AI prediction stats:', error);
    throw error;
  }
};

// Handle match completion - only for AI predictions
const handleMatchCompletion = async (match) => {
  if (match.status === 'FINISHED') {
    try {
      // If there's an AI prediction, update AI stats
      if (match.aiPrediction) {
        const aiCorrect = checkPredictionCorrect(match.aiPrediction, match);
        await updatePredictionStats(aiCorrect);
      }
      console.log('Updated AI prediction stats for match:', match.id);
    } catch (error) {
      console.error('Error updating match completion stats:', error);
      throw error;
    }
  }
};

// Calculate AI accuracy
const calculateAccuracy = async () => {
  const aiStat = await AIPredictionStat.findOne() || new AIPredictionStat();
  aiStat.totalPredictions = 0;
  aiStat.correctPredictions = 0;

  const matches = await Match.find({ status: 'FINISHED' });

  for (const match of matches) {
    if (match.aiPrediction) {
      aiStat.totalPredictions += 1;
      let actualWinner;
      if (match.score.winner === null) {
        const { home: homeScore, away: awayScore } = match.score.fullTime;
        actualWinner = homeScore > awayScore ? 'HOME_TEAM' : (awayScore > homeScore ? 'AWAY_TEAM' : 'DRAW');
      } else {
        actualWinner = match.score.winner;
      }

      if (match.aiPrediction === actualWinner) {
        aiStat.correctPredictions += 1;
      }
    }
  }

  console.log('AI Stat:', aiStat);
  await aiStat.save();
  return { aiStat };
};

const getAIAccuracy = async () => {
  const stat = await AIPredictionStat.findOne() || new AIPredictionStat();
  return stat;
};

// Routes
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    const timeZone = req.headers['x-timezone'] || 'UTC';
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const userDate = parseISO(date);
    if (!isValid(userDate)) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    // Calculate UTC offset in hours from timezone string
    const tzOffset = new Date().getTimezoneOffset() / 60;
    
    // Adjust date range based on timezone offset
    const start = subHours(startOfDay(userDate), tzOffset + 12);
    const end = subHours(endOfDay(userDate), tzOffset);

    const matches = await Match.find({
      $or: [
        { 
          utcDate: { 
            $gte: start.toISOString(), 
            $lte: end.toISOString() 
          }
        },
        {
          status: { 
            $in: ['IN_PLAY', 'HALFTIME', 'PAUSED', 'LIVE'] 
          },
          utcDate: { 
            $gte: subHours(start, 24).toISOString(),
            $lt: start.toISOString() 
          }
        }
      ]
    }).sort({ utcDate: 1 });

    const processedMatches = matches.map(match => {
      const matchObj = match.toObject();
      const matchDate = new Date(match.utcDate);
      matchObj.localDate = addHours(matchDate, tzOffset);
      return matchObj;
    });

    res.json({ matches: processedMatches });
  } catch (error) {
    console.error('Error in matches route:', error);
    res.status(500).json({ 
      message: 'Error fetching matches',
      error: error.message 
    });
  }
});

router.get('/all', async (req, res) => {
  try {
    const matches = await Match.find().limit(10);
    console.log('All matches found:', matches.length);
    if (matches.length > 0) {
      console.log('Sample match date:', matches[0].utcDate);
    }
    res.json(matches);
  } catch (error) {
    console.error('Error fetching all matches:', error);
    res.status(500).json({ message: 'Error fetching all matches', error: error.message });
  }
});

router.post('/update-match-status', async (req, res) => {
  try {
    const { matchId, status, score } = req.body;
    const match = await Match.findById(matchId);
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const wasFinished = match.status === 'FINISHED';
    match.status = status;
    match.score = score;
    await match.save();

    // Only update stats if the match just finished (wasn't finished before)
    if (!wasFinished && status === 'FINISHED') {
      await handleMatchCompletion(match);
    }

    res.json({ message: 'Match updated successfully' });
  } catch (error) {
    console.error('Error updating match:', error);
    res.status(500).json({ message: 'Error updating match' });
  }
});

router.get('/live', async (req, res) => {
  try {
    const liveMatches = await Match.find({
      status: { 
        $in: ['IN_PLAY', 'HALFTIME', 'PAUSED', 'LIVE']
      }
    });

    res.json({
      success: true,
      matches: liveMatches
    });
  } catch (error) {
    console.error('Error fetching live matches:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching live matches'
    });
  }
});

router.get('/:matchId/events', async (req, res) => {
  try {
    const { matchId } = req.params;
    
    // First try to get events from database
    let events = await Event.find({ matchId });
    
    // If it's a live match, fetch fresh events
    const match = await Match.findOne({ id: matchId });
    if (match && ['IN_PLAY', 'PAUSED', 'HALFTIME'].includes(match.status)) {
      events = await fetchAndStoreEvents(matchId);
    }
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching match events:', error);
    res.status(500).json({ error: 'Failed to fetch match events' });
  }
});

module.exports = router;