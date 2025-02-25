// Create this file as scripts/fixAiStats.js
const mongoose = require('mongoose');
const Match = require('../models/Match');
const AIPredictionStat = require('../models/AIPredictionStat');
const generateAllStatsFiles = require('./generateStatsFiles');
require('dotenv').config();

async function fixAiStats() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Calculate total stats
    const totalStats = await Match.aggregate([
      {
        $match: {
          status: 'FINISHED',
          aiPrediction: { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          totalPredictions: { $sum: 1 },
          correctPredictions: {
            $sum: {
              $cond: [
                { $eq: ['$aiPrediction', '$score.winner'] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    // Calculate daily stats
    const dailyStats = await Match.aggregate([
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
          totalPredictions: { $sum: 1 },
          correctPredictions: {
            $sum: {
              $cond: [
                { $eq: ['$aiPrediction', '$score.winner'] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { _id: -1 } }
    ]);
    
    // Format daily stats for MongoDB
    const formattedDailyStats = dailyStats.map(stat => ({
      date: new Date(stat._id),
      totalPredictions: stat.totalPredictions,
      correctPredictions: stat.correctPredictions
    }));
    
    // Reset and update AIPredictionStat
    await AIPredictionStat.deleteMany({});
    
    await AIPredictionStat.create({
      totalPredictions: totalStats[0]?.totalPredictions || 0,
      correctPredictions: totalStats[0]?.correctPredictions || 0,
      dailyStats: formattedDailyStats,
      updatedAt: new Date()
    });
    
    console.log('Stats fixed successfully:', {
      total: totalStats[0]?.totalPredictions || 0,
      correct: totalStats[0]?.correctPredictions || 0,
      days: formattedDailyStats.length
    });
    
    // Generate new stats files
    console.log('Generating new stats files...');
    await generateAllStatsFiles();
    console.log('Stats files generated successfully');
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error fixing AI stats:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  fixAiStats();
}

module.exports = fixAiStats;