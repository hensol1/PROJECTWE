require('dotenv').config();
const mongoose = require('mongoose');
const { startOfDay } = require('date-fns');
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

const debugQueries = async () => {
  try {
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nAvailable collections:', collections.map(c => c.name));

    // Check matches collection
    const matchesCount = await Match.countDocuments();
    const finishedMatchesCount = await Match.countDocuments({ status: 'FINISHED' });
    console.log('\nMatches statistics:');
    console.log(`Total matches: ${matchesCount}`);
    console.log(`Finished matches: ${finishedMatchesCount}`);

    // Sample finished match
    if (finishedMatchesCount > 0) {
      const sampleMatch = await Match.findOne({ status: 'FINISHED' });
      console.log('\nSample finished match:', JSON.stringify(sampleMatch, null, 2));
    }

    // Check prediction stats collections
    const aiStats = await AIPredictionStat.findOne();
    const fanStats = await FanPredictionStat.findOne();
    
    console.log('\nCurrent prediction stats:');
    console.log('AI Stats:', aiStats ? {
      total: aiStats.totalPredictions,
      correct: aiStats.correctPredictions,
      dailyStatsCount: aiStats.dailyStats?.length
    } : 'No AI stats found');
    console.log('Fan Stats:', fanStats ? {
      total: fanStats.totalPredictions,
      correct: fanStats.correctPredictions,
      dailyStatsCount: fanStats.dailyStats?.length
    } : 'No fan stats found');

    return true;
  } catch (error) {
    console.error('Debug queries failed:', error);
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

  matches.forEach(match => {
    const matchDate = startOfDay(new Date(match.utcDate)).getTime();
    
    if (!dailyStats[matchDate]) {
      dailyStats[matchDate] = {
        date: new Date(matchDate),
        ai: { total: 0, correct: 0 },
        fans: { total: 0, correct: 0 }
      };
    }

    // Process AI prediction
    if (match.aiPrediction) {
      dailyStats[matchDate].ai.total++;
      if (checkPredictionCorrect(match.aiPrediction, match)) {
        dailyStats[matchDate].ai.correct++;
      }
    }

    // Process Fan prediction
    const { home, draw, away } = match.votes;
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

      dailyStats[matchDate].fans.total++;
      if (checkPredictionCorrect(fanPrediction, match)) {
        dailyStats[matchDate].fans.correct++;
      }
    }
  });

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

    // Get all finished matches
    const matches = await Match.find({ 
      status: 'FINISHED',
      utcDate: { $exists: true }
    }).sort({ utcDate: 1 });
    
    console.log(`Found ${matches.length} finished matches to process`);

    if (matches.length === 0) {
      console.log('No matches to process. Exiting...');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Log first 5 matches for verification
    console.log('\nProcessing matches:');
    matches.slice(0, 5).forEach((match, index) => {
      console.log(`Match ${index + 1}:`, {
        id: match.id,
        date: match.utcDate,
        status: match.status,
        votes: match.votes,
        aiPrediction: match.aiPrediction,
        score: match.score?.fullTime
      });
    });

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