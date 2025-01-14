const mongoose = require('mongoose');
const AIPredictionStat = require('../models/AIPredictionStat');
const Match = require('../models/Match');

const MONGO_URI = "mongodb://localhost:27017/test"; // Update with your MongoDB URI

async function migrateDailyStats() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Get all finished matches with AI predictions
    const matches = await Match.find({
      status: 'FINISHED',
      aiPrediction: { $exists: true }
    }).sort({ utcDate: 1 });

    console.log(`Found ${matches.length} matches to process`);

    // Group matches by date
    const dailyMatchesMap = new Map();

    matches.forEach(match => {
      const matchDate = new Date(match.utcDate);
      matchDate.setHours(0, 0, 0, 0);
      const dateKey = matchDate.toISOString();

      if (!dailyMatchesMap.has(dateKey)) {
        dailyMatchesMap.set(dateKey, []);
      }
      dailyMatchesMap.get(dateKey).push(match);
    });

    // Calculate stats for each day
    const dailyStats = [];

    for (const [dateKey, dayMatches] of dailyMatchesMap) {
      let totalPredictions = 0;
      let correctPredictions = 0;

      dayMatches.forEach(match => {
        if (match.aiPrediction) {
          totalPredictions++;
          const actualResult = match.score.winner || 
            (match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' : 
             match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW');

          if (match.aiPrediction === actualResult) {
            correctPredictions++;
          }
        }
      });

      if (totalPredictions > 0) {
        dailyStats.push({
          date: new Date(dateKey),
          totalPredictions,
          correctPredictions
        });
      }
    }

    // Update AIPredictionStat document
    const aiStat = await AIPredictionStat.findOne() || new AIPredictionStat();
    aiStat.dailyStats = dailyStats;
    
    // Sort by date descending and keep last 30 days
    aiStat.dailyStats.sort((a, b) => b.date - a.date);
    aiStat.dailyStats = aiStat.dailyStats.slice(0, 30);

    await aiStat.save();

    console.log(`Successfully migrated ${dailyStats.length} days of stats`);
    console.log('Sample of migrated stats:', dailyStats.slice(0, 3));

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrateDailyStats();