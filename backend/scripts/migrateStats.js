require('dotenv').config();
const mongoose = require('mongoose');
const { startOfDay, parseISO } = require('date-fns');
const Match = require('../models/Match');
const FanPredictionStat = require('../models/FanPredictionStat');
const AIPredictionStat = require('../models/AIPredictionStat');

// Use the environment variable directly and append the 'test' database name
const MONGODB_URI = process.env.MONGODB_URI + 'test';

// Add debug logging
console.log('Environment:', process.env.NODE_ENV);
console.log('MongoDB URI:', MONGODB_URI.replace(/mongodb\+srv:\/\/.*@/, 'mongodb+srv://****:****@'));

// Set strictQuery to false to handle the deprecation warning
mongoose.set('strictQuery', false);

const verifyData = async () => {
  try {
    console.log('\nVerifying data...');
    const finishedMatches = await Match.find({ status: 'FINISHED' }).count();
    console.log(`Number of finished matches: ${finishedMatches}`);

    if (finishedMatches > 0) {
      const sampleMatch = await Match.findOne({ status: 'FINISHED' });
      console.log('Sample match data:', {
        id: sampleMatch.id,
        utcDate: sampleMatch.utcDate,
        status: sampleMatch.status,
        votes: sampleMatch.votes,
        aiPrediction: sampleMatch.aiPrediction,
        score: sampleMatch.score
      });

      // Get today's matches
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayMatches = await Match.find({
        status: 'FINISHED',
        utcDate: {
          $gte: today.toISOString(),
          $lte: new Date().toISOString()
        }
      });
      console.log(`\nToday's finished matches: ${todayMatches.length}`);
      if (todayMatches.length > 0) {
        console.log('Sample today match:', {
          id: todayMatches[0].id,
          utcDate: todayMatches[0].utcDate,
          status: todayMatches[0].status,
          votes: todayMatches[0].votes,
          aiPrediction: todayMatches[0].aiPrediction
        });
      }
    }

    const currentStats = await Promise.all([
      AIPredictionStat.findOne(),
      FanPredictionStat.findOne()
    ]);

    console.log('\nCurrent Stats:');
    console.log('AI Stats:', currentStats[0]);
    console.log('Fan Stats:', currentStats[1]);
    
    return finishedMatches > 0;
  } catch (error) {
    console.error('Data verification failed:', error);
    return false;
  }
};

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
  const now = new Date();
  const todayStart = startOfDay(now);

  matches.forEach(match => {
    // Parse the UTC date
    const matchDate = parseISO(match.utcDate);
    const localDate = startOfDay(matchDate);
    const dateKey = localDate.getTime();

    // Initialize the day's stats if not exists
    if (!dailyStats[dateKey]) {
      dailyStats[dateKey] = {
        date: localDate,
        ai: { total: 0, correct: 0 },
        fans: { total: 0, correct: 0 }
      };
    }
    // Add extra logging for today's matches
    if (localDate.getTime() === todayStart.getTime()) {
      console.log('Processing today\'s match:', {
        id: match.id,
        date: match.utcDate,
        status: match.status,
        votes: match.votes,
        aiPrediction: match.aiPrediction,
        score: match.score
      });
    }

    console.log('Processing match:', {
      id: match.id,
      date: match.utcDate,
      localDate: new Date(localDate).toISOString(),
      hasAIPrediction: !!match.aiPrediction,
      votesCount: match.votes ? (match.votes.home + match.votes.draw + match.votes.away) : 0
    });

    // Process AI prediction
    if (match.aiPrediction) {
      dailyStats[dateKey].ai.total++;
      if (checkPredictionCorrect(match.aiPrediction, match)) {
        dailyStats[dateKey].ai.correct++;
      }
    }

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

  // Add extra logging for today's stats
  const todayKey = todayStart.getTime();
  if (dailyStats[todayKey]) {
    console.log('\nToday\'s stats:', {
      date: new Date(todayKey).toISOString(),
      stats: dailyStats[todayKey]
    });
  } else {
    console.log('\nNo stats found for today');
  }

  return Object.values(dailyStats);
};

const migrate = async () => {
  try {
    console.log('Starting stats migration...');
    console.log('Connecting to MongoDB at:', MONGODB_URI);
    
    // Connect to MongoDB with updated options
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: 'majority'
    });
    console.log('Connected to MongoDB successfully');

    // Verify data before proceeding
    const dataValid = await verifyData();
    if (!dataValid) {
      console.error('Data verification failed. Aborting migration.');
      await mongoose.connection.close();
      process.exit(1);
    }

    // Reset existing stats
    await resetStats();

    // Get all finished matches including today
    const matches = await Match.find({ 
      status: 'FINISHED',
      utcDate: { 
        $exists: true,
        $lte: new Date().toISOString() // Include matches up to current time
      }
    }).sort({ utcDate: 1 });
    
    console.log(`Found ${matches.length} finished matches to process`);

    // Log the date range of matches
    if (matches.length > 0) {
      console.log('Date range:', {
        earliest: matches[0].utcDate,
        latest: matches[matches.length - 1].utcDate,
        currentTime: new Date().toISOString()
      });
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
        : '0%'
    });
    console.log('Fan Stats:', {
      total: fanStats.totalPredictions,
      correct: fanStats.correctPredictions,
      accuracy: fanStats.totalPredictions > 0 
        ? ((fanStats.correctPredictions / fanStats.totalPredictions) * 100).toFixed(2) + '%'
        : '0%'
    });

    await mongoose.connection.close();
    console.log('Closed MongoDB connection');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', {
      message: error.message,
      stack: error.stack,
      mongoURI: MONGODB_URI.replace(/mongodb\+srv:\/\/.*@/, 'mongodb+srv://****:****@')
    });
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

// Run the migration with better error handling
migrate().catch(error => {
  console.error('Unhandled error during migration:', error);
  process.exit(1);
});