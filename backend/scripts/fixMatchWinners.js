// Create a new file: scripts/fixMatchWinners.js

const mongoose = require('mongoose');
const Match = require('../models/Match');
const AIPredictionStat = require('../models/AIPredictionStat');
require('dotenv').config();

async function fixMatchWinners() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get all finished matches
    const matches = await Match.find({
      status: 'FINISHED',
      aiPrediction: { $exists: true }
    });
    
    console.log(`Found ${matches.length} finished matches with predictions`);
    
    // Update each match's winner field based on scores
    let fixedCount = 0;
    for (const match of matches) {
      const homeScore = match.score.fullTime.home;
      const awayScore = match.score.fullTime.away;
      const correctWinner = homeScore > awayScore ? 'HOME_TEAM' : 
                           awayScore > homeScore ? 'AWAY_TEAM' : 'DRAW';
      
      if (match.score.winner !== correctWinner) {
        console.log(`Fixing match ${match.id}: ${match.homeTeam.name} ${homeScore}-${awayScore} ${match.awayTeam.name}`);
        console.log(`  Wrong winner: ${match.score.winner}, Correct: ${correctWinner}`);
        
        match.score.winner = correctWinner;
        await match.save();
        fixedCount++;
      }
    }
    
    console.log(`Fixed ${fixedCount} matches with incorrect winners`);
    
    // Now recalculate all stats
    console.log('Recalculating all stats...');
    
    // Delete existing stats
    await AIPredictionStat.deleteMany({});
    
    // Calculate overall stats
    const aiStats = new AIPredictionStat();
    aiStats.totalPredictions = matches.length;
    
    // Group matches by date for daily stats
    const matchesByDate = {};
    
    for (const match of matches) {
      const homeScore = match.score.fullTime.home;
      const awayScore = match.score.fullTime.away;
      const actualResult = match.score.winner; // Now corrected
      
      // Count correct predictions for overall stats
      if (match.aiPrediction === actualResult) {
        aiStats.correctPredictions++;
      }
      
      // Group by date for daily stats
      const matchDate = new Date(match.utcDate);
      matchDate.setHours(0, 0, 0, 0);
      const dateKey = matchDate.toISOString();
      
      if (!matchesByDate[dateKey]) {
        matchesByDate[dateKey] = {
          date: matchDate,
          totalPredictions: 0,
          correctPredictions: 0
        };
      }
      
      matchesByDate[dateKey].totalPredictions++;
      if (match.aiPrediction === actualResult) {
        matchesByDate[dateKey].correctPredictions++;
      }
    }
    
    // Add daily stats
    aiStats.dailyStats = Object.values(matchesByDate);
    
    // Save updated stats
    await aiStats.save();
    
    console.log(`Stats recalculated: ${aiStats.correctPredictions}/${aiStats.totalPredictions} correct overall`);
    
    // Log daily stats
    console.log('Daily stats:');
    aiStats.dailyStats.sort((a, b) => b.date - a.date).slice(0, 5).forEach(day => {
      console.log(`${day.date.toISOString().split('T')[0]}: ${day.correctPredictions}/${day.totalPredictions}`);
    });
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error fixing match winners:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  fixMatchWinners();
}

module.exports = fixMatchWinners;