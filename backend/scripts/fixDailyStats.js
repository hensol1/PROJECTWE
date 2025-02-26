/**
 * Script to recalculate daily match stats with correct dates
 * Save as /backend/scripts/fixDailyStats.js
 */
const mongoose = require('mongoose');
const { startOfDay, format, subDays } = require('date-fns');
require('dotenv').config();

// Import models
const Match = require('../models/Match');
const AIPredictionStat = require('../models/AIPredictionStat');

async function fixDailyStats() {
  try {
    console.log('Starting daily stats recalculation...');
    
    // Step 1: Get all finished matches with predictions
    const matches = await Match.find({
      status: 'FINISHED',
      aiPrediction: { $exists: true }
    }).sort({ utcDate: 1 });
    
    console.log(`Found ${matches.length} finished matches with predictions`);
    
    // Step 2: Group matches by date (using UTC date from match)
    const matchesByDate = {};
    matches.forEach(match => {
      // Parse the match UTC date and get just the date part
      const matchDate = new Date(match.utcDate);
      const dateKey = format(matchDate, 'yyyy-MM-dd');
      
      if (!matchesByDate[dateKey]) {
        matchesByDate[dateKey] = [];
      }
      matchesByDate[dateKey].push(match);
    });
    
    // Step 3: Calculate stats for each day
    const dailyStats = [];
    let totalPredictions = 0;
    let correctPredictions = 0;
    
    Object.keys(matchesByDate).sort().forEach(dateKey => {
      const dayMatches = matchesByDate[dateKey];
      const dayDate = new Date(dateKey);
      
      const dayTotal = dayMatches.length;
      const dayCorrect = dayMatches.filter(match => {
        // Calculate actual result based on full time score
        const homeScore = match.score.fullTime.home;
        const awayScore = match.score.fullTime.away;
        const actualResult = homeScore > awayScore ? 'HOME_TEAM' : 
                            awayScore > homeScore ? 'AWAY_TEAM' : 'DRAW';
        
        return match.aiPrediction === actualResult;
      }).length;
      
      // Add to totals
      totalPredictions += dayTotal;
      correctPredictions += dayCorrect;
      
      // Add to daily stats
      dailyStats.push({
        date: dayDate,
        totalPredictions: dayTotal,
        correctPredictions: dayCorrect
      });
      
      console.log(`${dateKey}: ${dayCorrect} correct of ${dayTotal} (${(dayCorrect/dayTotal*100).toFixed(1)}%)`);
    });
    
    // Step 4: Update the AIPredictionStat document
    const aiStat = await AIPredictionStat.findOne() || new AIPredictionStat();
    aiStat.totalPredictions = totalPredictions;
    aiStat.correctPredictions = correctPredictions;
    aiStat.dailyStats = dailyStats;
    
    await aiStat.save();
    
    console.log('=== Stats Update Complete ===');
    console.log(`Overall: ${correctPredictions} correct of ${totalPredictions} (${(correctPredictions/totalPredictions*100).toFixed(1)}%)`);
    console.log(`Daily stats: ${dailyStats.length} days processed`);
    
    return {
      success: true,
      totalDays: dailyStats.length,
      overall: {
        total: totalPredictions,
        correct: correctPredictions,
        accuracy: totalPredictions > 0 ? (correctPredictions/totalPredictions*100).toFixed(1) : 0
      }
    };
  } catch (error) {
    console.error('Error fixing daily stats:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run if called directly
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log('MongoDB connected');
      const result = await fixDailyStats();
      console.log('Result:', result);
      mongoose.disconnect();
    })
    .catch(err => {
      console.error('Database connection error:', err);
      process.exit(1);
    });
}

module.exports = fixDailyStats;