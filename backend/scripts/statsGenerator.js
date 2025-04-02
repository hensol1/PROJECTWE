// statsGenerator.js
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Import model
const Match = require('../models/Match');

// Directory for stats files
const STATS_DIR = path.join(__dirname, '../public/stats');

async function generateStats() {
    console.log('Starting stats generation process...');
    
    try {
      // Check if already connected instead of creating a new connection
      if (mongoose.connection.readyState !== 1) {
        console.log('MongoDB not connected, connecting now...');
        await mongoose.connect(process.env.MONGODB_URI);
      } else {
        console.log('Using existing MongoDB connection');
      }
      
      // Get all finished matches with predictions
      const matches = await Match.find({
        status: 'FINISHED',
        aiPrediction: { $exists: true }
      }).lean();
      
      console.log(`Found ${matches.length} finished matches with predictions`);
      
      // Calculate overall stats
      const correctMatches = matches.filter(match => {
        const homeScore = match.score.fullTime.home;
        const awayScore = match.score.fullTime.away;
        const actualResult = homeScore > awayScore ? 'HOME_TEAM' : 
                            awayScore > homeScore ? 'AWAY_TEAM' : 'DRAW';
        return match.aiPrediction === actualResult;
      });
      
      const overallStats = {
        totalPredictions: matches.length,
        correctPredictions: correctMatches.length,
        overallAccuracy: (correctMatches.length / matches.length * 100).toFixed(1)
      };
      
      console.log('Overall stats calculated:', overallStats);
      
    // Calculate daily stats
    const dailyStats = [];
    const dateMap = new Map();
    
    matches.forEach(match => {
      const matchDate = new Date(match.utcDate);
      const dateKey = matchDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { total: 0, correct: 0, date: dateKey });
      }
      
      const stat = dateMap.get(dateKey);
      stat.total++;
      
      const homeScore = match.score.fullTime.home;
      const awayScore = match.score.fullTime.away;
      const actualResult = homeScore > awayScore ? 'HOME_TEAM' : 
                          awayScore > homeScore ? 'AWAY_TEAM' : 'DRAW';
      
      if (match.aiPrediction === actualResult) {
        stat.correct++;
      }
    });
    
    // Convert map to array and calculate percentages
    dateMap.forEach(stat => {
      stat.accuracy = stat.total > 0 ? (stat.correct / stat.total * 100) : 0;
      dailyStats.push(stat);
    });
    
    // Sort by date (newest first)
    dailyStats.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log(`Calculated stats for ${dailyStats.length} days`);
    
    // Build the complete stats object
    const statsData = {
      stats: dailyStats,
      overall: overallStats,
      generatedAt: new Date().toISOString()
    };
    
    // Write the stats file
    await fs.writeFile(
      path.join(STATS_DIR, 'ai-history.json'),
      JSON.stringify(statsData, null, 2)
    );
    
    // Create a manifest file for cache invalidation
    const manifest = {
      aiHistory: {
        path: '/stats/ai-history.json',
        lastUpdated: Date.now()
      }
    };
    
    await fs.writeFile(
      path.join(STATS_DIR, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    
    // Make sure leagueStats is defined before using it
    const leagueStatsResult = await generateLeagueStats(matches);
    const leagueStatsCount = leagueStatsResult ? leagueStatsResult.length : 0;
    
    console.log('Stats files generated successfully');
    
    return { 
      success: true,
      totalMatches: matches.length,
      totalLeagues: leagueStatsCount  // Fixed reference to leagueStats
    };
  } catch (error) {
    console.error('Error generating stats:', error);
    return { success: false, error: error.message };
  }
}

async function generateLeagueStats(matches) {
    // Group matches by league
    const leagueMap = new Map();
    
    matches.forEach(match => {
      const competitionId = match.competition?.id;
    if (!competitionId) return;
    
    if (!leagueMap.has(competitionId)) {
      leagueMap.set(competitionId, {
        id: competitionId,
        name: match.competition.name,
        emblem: match.competition.emblem,
        country: match.competition.country,
        total: 0,
        correct: 0,
        matches: []
      });
    }
    
    const league = leagueMap.get(competitionId);
    league.total++;
    league.matches.push(match._id);
    
    const homeScore = match.score.fullTime.home;
    const awayScore = match.score.fullTime.away;
    const actualResult = homeScore > awayScore ? 'HOME_TEAM' : 
                        awayScore > homeScore ? 'AWAY_TEAM' : 'DRAW';
    
    if (match.aiPrediction === actualResult) {
      league.correct++;
    }
  });
  
  // Convert to array and calculate accuracy
  const leagueStats = Array.from(leagueMap.values()).map(league => ({
    id: league.id,
    name: league.name,
    emblem: league.emblem,
    country: league.country,
    totalPredictions: league.total,
    correctPredictions: league.correct,
    accuracy: league.total > 0 ? (league.correct / league.total * 100) : 0,
    matchCount: league.matches.length
  }));
  
  // Sort by total predictions
  leagueStats.sort((a, b) => b.totalPredictions - a.totalPredictions);
  
  // Write to file
  await fs.writeFile(
    path.join(STATS_DIR, 'league-stats.json'),
    JSON.stringify({ stats: leagueStats, generatedAt: new Date().toISOString() }, null, 2)
  );
  
  console.log(`Generated league stats for ${leagueStats.length} leagues`);
  
  // Return the leagueStats array
  return leagueStats;
}

// Run if called directly
if (require.main === module) {
  generateStats()
    .then(result => {
      if (result.success) {
        console.log('Stats generation completed successfully');
        process.exit(0);
      } else {
        console.error('Stats generation failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Unhandled error in stats generation:', error);
      process.exit(1);
    });
}

module.exports = generateStats;