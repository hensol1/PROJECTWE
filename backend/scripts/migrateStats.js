require('dotenv').config();
const mongoose = require('mongoose');
const { startOfDay, parseISO } = require('date-fns');
const Match = require('../models/Match');
const FanPredictionStat = require('../models/FanPredictionStat');
const AIPredictionStat = require('../models/AIPredictionStat');

// Set MongoDB URI from environment variable
const MONGODB_URI = process.env.MONGODB_URI + 'test';

// Set strictQuery to false to handle the deprecation warning
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

const resetStats = async () => {
  console.log('Resetting all stats...');
  await Promise.all([
    FanPredictionStat.deleteMany({}),
    AIPredictionStat.deleteMany({})
  ]);
  console.log('Stats reset complete.');
};

const createDailyStats = (matches) => {
  const dailyStats = {};
  const currentDate = new Date();

  matches.forEach(match => {
    // Parse the UTC date from the match
    const matchDate = parseISO(match.utcDate);
    const matchDay = startOfDay(matchDate);
    const dateKey = matchDay.getTime();

    // Debug log for today's matches
    const isToday = startOfDay(currentDate).getTime() === dateKey;
    if (isToday) {
      console.log('Found today\'s match:', {
        id: match.id,
        utcDate: match.utcDate,
        status: match.status,
        votes: match.votes,
        aiPrediction: match.aiPrediction
      });
    }

    if (!dailyStats[dateKey]) {
      dailyStats[dateKey] = {
        date: matchDay,
        ai: { total: 0, correct: 0 },
        fans: { total: 0, correct: 0 }
      };
    }

    // Process AI prediction
    if (match.aiPrediction) {
      dailyStats[dateKey].ai.total++;
      if (checkPredictionCorrect(match.aiPrediction, match)) {
        dailyStats[dateKey].ai.correct++;
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

      dailyStats[dateKey].fans.total++;
      if (checkPredictionCorrect(fanPrediction, match)) {
        dailyStats[dateKey].fans.correct++;
      }
    }
  });

  // Debug log all daily stats
  Object.entries(dailyStats).forEach(([date, stats]) => {
    console.log(`Stats for ${new Date(parseInt(date)).toISOString().split('T')[0]}:`, {
      ai: stats.ai,
      fans: stats.fans
    });
  });

  return Object.values(dailyStats);
};

const migrate = async () => {
  try {
    console.log('Starting stats migration...');
    console.log('Connecting to MongoDB at:', MONGODB_URI);
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: 'majority'
    });
    console.log('Connected to MongoDB successfully');

    // Get current date for query
    const currentDate = new Date();
    console.log('Current date:', currentDate.toISOString());

    // Get all finished matches including today's matches
    const matches = await Match.find({ 
      status: 'FINISHED',
      utcDate: { 
        $exists: true,
        $lte: currentDate.toISOString() // Include matches up to current time
      }
    }).sort({ utcDate: 1 });
    
    console.log(`Found ${matches.length} finished matches to process`);

    if (matches.length > 0) {
      console.log('Date range of matches:', {
        earliest: matches[0].utcDate,
        latest: matches[matches.length - 1].utcDate
      });

      // Log last 5 matches to verify we're getting today's matches
      console.log('Last 5 matches:', matches.slice(-5).map(m => ({
        id: m.id,
        date: m.utcDate,
        status: m.status
      })));
    }

    if (matches.length === 0) {
      console.log('No matches to process. Exiting...');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Calculate daily stats
    const dailyStats = createDailyStats(matches);
    console.log(`Calculated stats for ${dailyStats.length} days`);

    // Create new stat documents
    const aiStats = new AIPredictionStat();
    const fanStats = new FanPredictionStat();

    // Populate total stats and daily stats
    aiStats.totalPredictions = dailyStats.reduce((sum, day) => sum + day.ai.total, 0);
    aiStats.correctPredictions = dailyStats.reduce((sum, day) => sum + day.ai.correct, 0);
    aiStats.dailyStats = dailyStats.map(day => ({
      date: day.date,
      totalPredictions: day.ai.total,
      correctPredictions: day.ai.correct
    }));

    fanStats.totalPredictions = dailyStats.reduce((sum, day) => sum + day.fans.total, 0);
    fanStats.correctPredictions = dailyStats.reduce((sum, day) => sum + day.fans.correct, 0);
    fanStats.dailyStats = dailyStats.map(day => ({
      date: day.date,
      totalPredictions: day.fans.total,
      correctPredictions: day.fans.correct
    }));

    // Save the new stats
    await Promise.all([
      aiStats.save(),
      fanStats.save()
    ]);

    console.log('\nMigration completed successfully!');
    console.log('\nFinal Stats:');
    console.log('AI Stats:', {
      total: aiStats.totalPredictions,
      correct: aiStats.correctPredictions,
      accuracy: aiStats.totalPredictions > 0 
        ? ((aiStats.correctPredictions / aiStats.totalPredictions) * 100).toFixed(2) + '%'
        : '0%',
      dailyStatsCount: aiStats.dailyStats.length
    });
    console.log('Fan Stats:', {
      total: fanStats.totalPredictions,
      correct: fanStats.correctPredictions,
      accuracy: fanStats.totalPredictions > 0 
        ? ((fanStats.correctPredictions / fanStats.totalPredictions) * 100).toFixed(2) + '%'
        : '0%',
      dailyStatsCount: fanStats.dailyStats.length
    });

    await mongoose.connection.close();
    console.log('Closed MongoDB connection');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', {
      message: error.message,
      stack: error.stack
    });
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

// Run the migration
migrate().catch(error => {
  console.error('Unhandled error during migration:', error);
  process.exit(1);
});