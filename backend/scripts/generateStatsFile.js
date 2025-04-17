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
  
  // Log the raw data from the database for debugging
  console.log('Raw AIPredictionStat from database:', {
    totalPredictions: aiStatRecord.totalPredictions,
    correctPredictions: aiStatRecord.correctPredictions,
    dailyStatsCount: aiStatRecord.dailyStats?.length || 0
  });
  
  // Map and ensure proper date formatting
  const filteredDailyStats = (aiStatRecord.dailyStats || [])
    .map(stat => {
      // Make sure the date is properly formatted to ISO
      const statDate = new Date(stat.date);
      const isoDate = statDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      
      // Log each date conversion for debugging
      console.log('Date processing:', {
        original: stat.date,
        converted: statDate.toISOString(),
        formatted: isoDate
      });
      
      return {
        date: isoDate,
        totalPredictions: stat.totalPredictions,
        correctPredictions: stat.correctPredictions,
        accuracy: stat.totalPredictions > 0 
          ? (stat.correctPredictions / stat.totalPredictions * 100) 
          : 0
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending

  // Use the stored overall stats directly
  const overallStats = {
    totalPredictions: aiStatRecord.totalPredictions,
    correctPredictions: aiStatRecord.correctPredictions,
    overallAccuracy: aiStatRecord.totalPredictions > 0
      ? (aiStatRecord.correctPredictions / aiStatRecord.totalPredictions * 100)
      : 0
  };
  
  console.log('Generated stats file with overall stats:', overallStats);

  return {
    stats: filteredDailyStats,
    overall: overallStats,
    generatedAt: new Date().toISOString()
  };
};

// Generate league stats
const generateLeagueStats = async () => {
  console.log('Generating league stats...');
  
  const stats = await Match.aggregate([
    {
      $match: {
        status: 'FINISHED',
        aiPrediction: { $exists: true }
        // Date filter removed
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

// Generate team stats
const generateTeamStats = async () => {
  console.log('Generating team stats...');
  
  const stats = await Match.aggregate([
    {
      $match: {
        status: 'FINISHED',
        aiPrediction: { $exists: true }
      }
    },
    {
      $group: {
        _id: {
          teamId: {
            $cond: [
              { $eq: ['$score.winner', 'HOME_TEAM'] },
              '$homeTeam.id',
              '$awayTeam.id'
            ]
          },
          winner: '$score.winner'
        },
        name: {
          $first: {
            $cond: [
              { $eq: ['$score.winner', 'HOME_TEAM'] },
              '$homeTeam.name',
              '$awayTeam.name'
            ]
          }
        },
        crest: {
          $first: {
            $cond: [
              { $eq: ['$score.winner', 'HOME_TEAM'] },
              '$homeTeam.crest',
              '$awayTeam.crest'
            ]
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
    {
      $group: {
        _id: '$_id.teamId',
        name: { $first: '$name' },
        crest: { $first: '$crest' },
        totalPredictions: { $sum: '$totalPredictions' },
        correctPredictions: { $sum: '$correctPredictions' }
      }
    },
    {
      $project: {
        id: '$_id',
        name: 1,
        crest: 1,
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

// Generate all teams list for search
const generateAllTeams = async () => {
  console.log('Generating all teams list...');
  
  const teams = await Match.aggregate([
    {
      $project: {
        teams: [
          {
            id: '$homeTeam.id',
            name: '$homeTeam.name',
            crest: '$homeTeam.crest'
          },
          {
            id: '$awayTeam.id',
            name: '$awayTeam.name',
            crest: '$awayTeam.crest'
          }
        ]
      }
    },
    { $unwind: '$teams' },
    {
      $group: {
        _id: '$teams.id',
        name: { $first: '$teams.name' },
        crest: { $first: '$teams.crest' }
      }
    },
    {
      $project: {
        id: '$_id',
        name: 1,
        crest: 1
      }
    },
    { $sort: { name: 1 } }
  ]);

  return {
    teams,
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

    // Ensure numbers are properly formatted
    if (aiHistoryStats.overall) {
      aiHistoryStats.overall.overallAccuracy = parseFloat(aiHistoryStats.overall.overallAccuracy) || 0;
      aiHistoryStats.overall.totalPredictions = parseInt(aiHistoryStats.overall.totalPredictions) || 0;
      aiHistoryStats.overall.correctPredictions = parseInt(aiHistoryStats.overall.correctPredictions) || 0;
    }

    if (aiHistoryStats.stats && Array.isArray(aiHistoryStats.stats)) {
      aiHistoryStats.stats = aiHistoryStats.stats.map(stat => ({
        ...stat,
        accuracy: parseFloat(stat.accuracy) || 0,
        totalPredictions: parseInt(stat.totalPredictions) || 0,
        correctPredictions: parseInt(stat.correctPredictions) || 0
      }));
    }

    await fs.writeFile(
      path.join(statsDir, 'ai-history.json'), 
      JSON.stringify(aiHistoryStats, null, 2)
    );
    
    // Generate and save league stats
    const leagueStats = await generateLeagueStats();

    // Ensure league stats numbers are properly formatted
    if (leagueStats.stats && Array.isArray(leagueStats.stats)) {
      leagueStats.stats = leagueStats.stats.map(stat => ({
        ...stat,
        accuracy: parseFloat(stat.accuracy) || 0,
        totalPredictions: parseInt(stat.totalPredictions) || 0,
        correctPredictions: parseInt(stat.correctPredictions) || 0
      }));
    }

    await fs.writeFile(
      path.join(statsDir, 'league-stats.json'), 
      JSON.stringify(leagueStats, null, 2)
    );
    
    // Generate and save daily predictions
    const dailyPredictions = await generateDailyPredictions();
    await fs.writeFile(
      path.join(statsDir, 'daily-predictions.json'), 
      JSON.stringify(dailyPredictions)
    );
    
    // Generate and save team stats
    const teamStats = await generateTeamStats();
    await fs.writeFile(
      path.join(statsDir, 'team-stats.json'),
      JSON.stringify(teamStats, null, 2)
    );

    // Generate and save all teams list
    const allTeams = await generateAllTeams();
    await fs.writeFile(
      path.join(statsDir, 'all-teams.json'),
      JSON.stringify(allTeams, null, 2)
    );
    
    // Update manifest with new files
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
      },
      teamStats: {
        path: '/stats/team-stats.json',
        lastUpdated: timestamp
      },
      allTeams: {
        path: '/stats/all-teams.json',
        lastUpdated: timestamp
      }
    };
    
    await fs.writeFile(
      path.join(statsDir, 'manifest.json'), 
      JSON.stringify(manifest, null, 2)
    );
    
    console.log('All stats files generated successfully at:', new Date().toISOString());
    
    return {
      success: true,
      timestamp,
      files: [
        'ai-history.json',
        'league-stats.json',
        'daily-predictions.json',
        'team-stats.json',
        'all-teams.json',
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