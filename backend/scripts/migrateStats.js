require('dotenv').config();
const mongoose = require('mongoose');
const { startOfDay, endOfDay, parseISO } = require('date-fns');
const Match = require('../models/Match');
const FanPredictionStat = require('../models/FanPredictionStat');
const AIPredictionStat = require('../models/AIPredictionStat');

// Set MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI + 'test';

// Set strictQuery to false
mongoose.set('strictQuery', false);

const checkPredictionCorrect = (prediction, match) => {
  const homeScore = match.score.fullTime.home;
  const awayScore = match.score.fullTime.away;
  
  let actualResult;
  if (homeScore > awayScore) actualResult = 'HOME_TEAM';
  else if (awayScore > homeScore) actualResult = 'AWAY_TEAM';
  else actualResult = 'DRAW';
  
  return prediction === actualResult;
};

const processTodayMatches = async () => {
  try {
    console.log('Starting daily stats update...');
    console.log('Connecting to MongoDB at:', MONGODB_URI);
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully');

    // Get today's date range
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    console.log('Processing matches for:', {
      start: dayStart.toISOString(),
      end: dayEnd.toISOString()
    });

    // Find today's finished matches
    const todayMatches = await Match.find({
      status: 'FINISHED',
      utcDate: {
        $gte: dayStart.toISOString(),
        $lte: dayEnd.toISOString()
      }
    });

    console.log(`Found ${todayMatches.length} finished matches for today`);

    // Initialize counters
    const stats = {
      ai: { total: 0, correct: 0 },
      fans: { total: 0, correct: 0 }
    };

    // Process each match
    todayMatches.forEach(match => {
      console.log('Processing match:', {
        id: match.id,
        date: match.utcDate,
        aiPrediction: match.aiPrediction,
        votes: match.votes,
        score: match.score.fullTime
      });

      // Process AI prediction
      if (match.aiPrediction) {
        stats.ai.total++;
        if (checkPredictionCorrect(match.aiPrediction, match)) {
          stats.ai.correct++;
        }
      }

      // Process Fan prediction
      const { home = 0, draw = 0, away = 0 } = match.votes || {};
      const totalVotes = home + draw + away;
      if (totalVotes > 0) {
        const maxVotes = Math.max(home, draw, away);
        let fanPrediction;
        if (home === maxVotes) {
          fanPrediction = 'HOME_TEAM';
        } else if (away === maxVotes) {
          fanPrediction = 'AWAY_TEAM';
        } else {
          fanPrediction = 'DRAW';
        }

        stats.fans.total++;
        if (checkPredictionCorrect(fanPrediction, match)) {
          stats.fans.correct++;
        }
      }
    });

    console.log('Today\'s stats calculated:', stats);

    // Update AI stats
    const aiStats = await AIPredictionStat.findOne() || new AIPredictionStat();
    const existingAiDayStats = aiStats.dailyStats.find(
      stat => startOfDay(new Date(stat.date)).getTime() === dayStart.getTime()
    );

    if (existingAiDayStats) {
      existingAiDayStats.totalPredictions = stats.ai.total;
      existingAiDayStats.correctPredictions = stats.ai.correct;
    } else {
      aiStats.dailyStats.push({
        date: dayStart,
        totalPredictions: stats.ai.total,
        correctPredictions: stats.ai.correct
      });
    }

    // Update Fan stats
    const fanStats = await FanPredictionStat.findOne() || new FanPredictionStat();
    const existingFanDayStats = fanStats.dailyStats.find(
      stat => startOfDay(new Date(stat.date)).getTime() === dayStart.getTime()
    );

    if (existingFanDayStats) {
      existingFanDayStats.totalPredictions = stats.fans.total;
      existingFanDayStats.correctPredictions = stats.fans.correct;
    } else {
      fanStats.dailyStats.push({
        date: dayStart,
        totalPredictions: stats.fans.total,
        correctPredictions: stats.fans.correct
      });
    }

    // Update total stats
    aiStats.totalPredictions = aiStats.dailyStats.reduce((sum, day) => sum + day.totalPredictions, 0);
    aiStats.correctPredictions = aiStats.dailyStats.reduce((sum, day) => sum + day.correctPredictions, 0);
    
    fanStats.totalPredictions = fanStats.dailyStats.reduce((sum, day) => sum + day.totalPredictions, 0);
    fanStats.correctPredictions = fanStats.dailyStats.reduce((sum, day) => sum + day.correctPredictions, 0);

    // Save updates
    await Promise.all([
      aiStats.save(),
      fanStats.save()
    ]);

    console.log('\nStats update completed successfully!');
    console.log('Final Stats for today:', {
      ai: {
        total: stats.ai.total,
        correct: stats.ai.correct,
        accuracy: stats.ai.total > 0 
          ? ((stats.ai.correct / stats.ai.total) * 100).toFixed(2) + '%'
          : '0%'
      },
      fans: {
        total: stats.fans.total,
        correct: stats.fans.correct,
        accuracy: stats.fans.total > 0 
          ? ((stats.fans.correct / stats.fans.total) * 100).toFixed(2) + '%'
          : '0%'
      }
    });

    await mongoose.connection.close();
    console.log('Closed MongoDB connection');
    process.exit(0);
  } catch (error) {
    console.error('Update failed:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

// Run the update
processTodayMatches().catch(error => {
  console.error('Unhandled error during update:', error);
  process.exit(1);
});