require('dotenv').config();
const mongoose = require('mongoose');
const { startOfDay } = require('date-fns');
const Match = require('../models/Match');
const FanPredictionStat = require('../models/FanPredictionStat');
const AIPredictionStat = require('../models/AIPredictionStat');

// Update MongoDB URI for production
const MONGODB_URI = 'mongodb+srv://cluster0.asbrji.mongodb.net/test';
// You might need to add username and password from your .env file
// const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.asbrji.mongodb.net/test`;

// Add debug logging
console.log('Environment:', process.env.NODE_ENV);
console.log('MongoDB URI:', MONGODB_URI.replace(/mongodb\+srv:\/\/.*@/, 'mongodb+srv://****:****@')); // Hide credentials in logs

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
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully');

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
    console.error('Migration failed:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('Closed MongoDB connection');
    }
    process.exit(1);
  }
};

// Run the migration
migrate();