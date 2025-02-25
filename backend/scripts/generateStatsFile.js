/**
 * Script to generate pre-computed stats files
 * Place this in backend/scripts/generateStatsFiles.js
 */
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Match = require('../models/Match');
const AIPredictionStat = require('../models/AIPredictionStat');

// Create directory if it doesn't exist
const ensureDirectoryExists = async (directory) => {
  try {
    await fs.mkdir(directory, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

// Generate AI history stats
const generateAIHistoryStats = async () => {
  console.log('Generating AI history stats...');
  
  // Get the overall stats from AIPredictionStat
  const aiStatRecord = await AIPredictionStat.findOne().lean();
  
  if (!aiStatRecord) {
    console.error('No AIPredictionStat record found');
    return {
      stats: [],
      overall: {
        totalPredictions: 0,
        correctPredictions: 0,
        overallAccuracy: 0
      },
      generatedAt: new Date().toISOString()
    };
  }
  
  // Set January 14, 2024 as the start date for calculations
  const PREDICTIONS_START_DATE = new Date('2024-01-14T00:00:00Z');
  
  // Filter daily stats by start date and map to expected format
  const filteredDailyStats = aiStatRecord.dailyStats
    .filter(stat => new Date(stat.date) >= PREDICTIONS_START_DATE)
    .map(stat => ({
      date: new Date(stat.date).toISOString().split('T')[0], // Format as YYYY-MM-DD
      totalPredictions: stat.totalPredictions,
      correctPredictions: stat.correctPredictions,
      accuracy: stat.totalPredictions > 0 
        ? (stat.correctPredictions / stat.totalPredictions * 100) 
        : 0
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending

  // Get the overall stats
  const overallStats = {
    totalPredictions: aiStatRecord.totalPredictions,
    correctPredictions: aiStatRecord.correctPredictions,
    overallAccuracy: aiStatRecord.totalPredictions > 0
      ? (aiStatRecord.correctPredictions / aiStatRecord.totalPredictions * 100)
      : 0
  };

  return {
    stats: filteredDailyStats,
    overall: overallStats,
    generatedAt: new Date().toISOString()
  };
};

// Generate league stats
const generateLeagueStats = async () => {
  console.log('Generating league stats...');
  
  // Set January 14, 2024 as the start date for calculations
  const PREDICTIONS_START_DATE = new Date('2024-01-14T00:00:00Z');
  
  const stats = await Match.aggregate([
    {
      $match: {
        status: 'FINISHED',
        aiPrediction: { $exists: true },
        // Add date filter
        utcDate: { $gte: PREDICTIONS_START_DATE.toISOString() }
      }
    },
    {
      $group: {
        _id: '$competition.id',
        name: { $first: '$competition.name' },
        emblem: { $first: '$competition.emblem' },
        country: { $first: '$competition.country' },
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
    {
      $project: {
        id: '$_id',
        name: 1,
        emblem: 1,
        country: 1,
        totalPredictions: 1,
        correctPredictions: 1,
        accuracy: {
          $multiply: [
            { $divide: ['$correctPredictions', '$totalPredictions'] },
            100
          ]
        }
      }
    },
    { $sort: { totalPredictions: -1 } }
  ]);

  return {
    stats,
    generatedAt: new Date().toISOString()
  };
};

// Generate daily predictions stats
const generateDailyPredictions = async () => {
  console.log('Generating daily predictions stats...');
  
  // Get the AIPredictionStat record
  const aiStatRecord = await AIPredictionStat.findOne().lean();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Find today's stats in the dailyStats array
  const todayStats = aiStatRecord && aiStatRecord.dailyStats
    ? aiStatRecord.dailyStats.find(stat => {
        const statDate = new Date(stat.date);
        return statDate.getFullYear() === today.getFullYear() &&
               statDate.getMonth() === today.getMonth() &&
               statDate.getDate() === today.getDate();
      })
    : null;
  
  // Use lean() and only select needed fields for match info
  const matches = await Match.find({
    utcDate: {
      $gte: today.toISOString(),
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
    }
  })
  .select('aiPrediction status')
  .lean();

  return {
    totalMatches: matches.length,
    aiPredictions: matches.filter(m => m.aiPrediction).length,
    completedMatches: matches.filter(m => m.status === 'FINISHED').length,
    totalCorrectToday: todayStats ? todayStats.correctPredictions : 0,
    totalPredictionsToday: todayStats ? todayStats.totalPredictions : 0,
    generatedAt: new Date().toISOString()
  };
};

// Main function to generate all stat files
const generateAllStatsFiles = async () => {
  try {
    console.log('Starting stats file generation process...');
    
    // Create stats directory if it doesn't exist
    const statsDir = path.join(__dirname, '../public/stats');
    await ensureDirectoryExists(statsDir);
    
    // Generate timestamp for the files
    const timestamp = Date.now();
    
    // Generate and save AI history stats
    const aiHistoryStats = await generateAIHistoryStats();
    await fs.writeFile(
      path.join(statsDir, 'ai-history.json'), 
      JSON.stringify(aiHistoryStats)
    );
    
    // Generate and save league stats
    const leagueStats = await generateLeagueStats();
    await fs.writeFile(
      path.join(statsDir, 'league-stats.json'), 
      JSON.stringify(leagueStats)
    );
    
    // Generate and save daily predictions
    const dailyPredictions = await generateDailyPredictions();
    await fs.writeFile(
      path.join(statsDir, 'daily-predictions.json'), 
      JSON.stringify(dailyPredictions)
    );
    
    // Generate manifest file with timestamps for cache invalidation
    const manifest = {
      aiHistory: {
        path: '/stats/ai-history.json',
        lastUpdated: timestamp
      },
      leagueStats: {
        path: '/stats/league-stats.json',
        lastUpdated: timestamp
      },
      dailyPredictions: {
        path: '/stats/daily-predictions.json',
        lastUpdated: timestamp
      }
    };
    
    await fs.writeFile(
      path.join(statsDir, 'manifest.json'), 
      JSON.stringify(manifest)
    );
    
    console.log('All stats files generated successfully at:', new Date().toISOString());
    
    return {
      success: true,
      timestamp,
      files: [
        'ai-history.json',
        'league-stats.json',
        'daily-predictions.json',
        'manifest.json'
      ]
    };
  } catch (error) {
    console.error('Error generating stats files:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// If this script is run directly from command line
if (require.main === module) {
  // Connect to the database
  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log('MongoDB connected...');
      await generateAllStatsFiles();
      mongoose.disconnect();
    })
    .catch(err => {
      console.error('Database connection error:', err);
      process.exit(1);
    });
}

module.exports = generateAllStatsFiles;