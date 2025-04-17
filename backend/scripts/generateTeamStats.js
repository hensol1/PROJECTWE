// backend/scripts/generateTeamStats.js
const mongoose = require('mongoose');
const Match = require('../models/Match');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Ensure dotenv is loaded to read environment variables

/**
 * Analyzes finished matches and calculates prediction accuracy by team
 */
async function generateTeamStats() {
  // Get the MongoDB URI from environment variable
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/football-predictions';

  // Check if already connected to MongoDB
  let needToConnect = mongoose.connection.readyState !== 1;
  
  try {
    // Connect to MongoDB if not already connected
    if (needToConnect) {
      console.log(`Connecting to MongoDB at ${MONGODB_URI.split('@')[1] || '[hidden]'}`);
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('Connected to MongoDB');
    } else {
      console.log('Already connected to MongoDB, reusing connection');
    }
    
    console.log('Analyzing team performance...');
    
    // Fetch all finished matches with AI predictions
    const matches = await Match.find({
      status: 'FINISHED',
      aiPrediction: { $exists: true, $ne: null }
    }).lean();
    
    console.log(`Found ${matches.length} finished matches to analyze`);
    
    // Initialize team stats tracking objects
    const teamStats = {};
    
    // Process each match
    matches.forEach(match => {
      const homeTeamId = match.homeTeam?.id;
      const awayTeamId = match.awayTeam?.id;
      const homeTeamName = match.homeTeam?.name;
      const awayTeamName = match.awayTeam?.name;
      
      // Skip if team data is missing
      if (!homeTeamId || !awayTeamId || !homeTeamName || !awayTeamName) return;
      
      // Determine actual match result
      let actualResult = null;
      if (match.score && match.score.fullTime) {
        const homeScore = match.score.fullTime.home;
        const awayScore = match.score.fullTime.away;
        
        if (homeScore > awayScore) {
          actualResult = 'HOME_TEAM';
        } else if (awayScore > homeScore) {
          actualResult = 'AWAY_TEAM';
        } else {
          actualResult = 'DRAW';
        }
      } else if (match.score && match.score.winner) {
        // Fallback to winner field if available
        actualResult = match.score.winner;
      } else {
        // Skip matches without clear result
        return;
      }
      
      // Check if prediction was correct
      const predictionCorrect = match.aiPrediction === actualResult;
      
      // Process home team stats
      if (!teamStats[homeTeamId]) {
        teamStats[homeTeamId] = {
          id: homeTeamId,
          name: homeTeamName,
          crest: match.homeTeam.crest,
          totalMatches: 0,
          correctPredictions: 0,
          accuracy: 0
        };
      }
      
      teamStats[homeTeamId].totalMatches++;
      if (predictionCorrect) teamStats[homeTeamId].correctPredictions++;
      
      // Process away team stats
      if (!teamStats[awayTeamId]) {
        teamStats[awayTeamId] = {
          id: awayTeamId,
          name: awayTeamName,
          crest: match.awayTeam.crest,
          totalMatches: 0,
          correctPredictions: 0,
          accuracy: 0
        };
      }
      
      teamStats[awayTeamId].totalMatches++;
      if (predictionCorrect) teamStats[awayTeamId].correctPredictions++;
    });
    
    // Calculate accuracy percentages and filter out teams with too few matches
    const minMatchesThreshold = 5; // Teams must have at least 5 matches to be included
    const processedTeams = Object.values(teamStats)
      .filter(team => team.totalMatches >= minMatchesThreshold)
      .map(team => {
        team.accuracy = (team.correctPredictions / team.totalMatches) * 100;
        return team;
      });
    
    // Sort teams by accuracy
    const sortedTeams = processedTeams.sort((a, b) => b.accuracy - a.accuracy);
    
    // Prepare result object with top and bottom teams
    const result = {
      topTeams: sortedTeams.slice(0, 20),
      bottomTeams: sortedTeams.slice(-20).reverse(),
      lastUpdated: new Date().toISOString(),
      totalTeamsAnalyzed: processedTeams.length,
      allTeams: processedTeams // Include all teams for searching
    };
    
    // Make sure the data directory exists
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      console.log('Creating data directory:', dataDir);
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Save to a JSON file
    const filePath = path.join(dataDir, 'teamStats.json');
    try {
      fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
      console.log(`Successfully wrote teamStats.json to ${filePath}`);
    } catch (error) {
      console.error(`Error writing teamStats.json: ${error.message}`);
      throw error;
    }
    
    // Also create a file for public access to all teams
    const publicDir = path.join(__dirname, '../public/stats');
    try {
      if (!fs.existsSync(publicDir)) {
        console.log('Creating public stats directory:', publicDir);
        fs.mkdirSync(publicDir, { recursive: true });
      }
      
      // Write team-stats.json for the main stats page
      const teamStatsPath = path.join(publicDir, 'team-stats.json');
      console.log(`Attempting to write team-stats.json to ${teamStatsPath}`);
      fs.writeFileSync(teamStatsPath, JSON.stringify(result, null, 2));
      console.log(`Successfully wrote team-stats.json to ${teamStatsPath}`);
      
      // Write all-teams.json for the search functionality
      const publicFilePath = path.join(publicDir, 'all-teams.json');
      console.log(`Attempting to write all-teams.json to ${publicFilePath}`);
      
      // Format the teams data to match the expected structure
      const formattedTeams = processedTeams.map(team => ({
        _id: team.id,
        name: team.name,
        crest: team.crest,
        id: team.id,
        totalMatches: team.totalMatches,
        correctPredictions: team.correctPredictions,
        accuracy: team.accuracy
      }));
      
      fs.writeFileSync(publicFilePath, JSON.stringify(formattedTeams, null, 2));
      console.log(`Successfully wrote all-teams.json to ${publicFilePath}`);
    } catch (error) {
      console.error(`Error writing public stats files: ${error.message}`);
      throw error;
    }
    
    console.log(`Team stats generated and saved: ${processedTeams.length} teams analyzed`);
    
    if (processedTeams.length > 0) {
      console.log(`Top performing team: ${result.topTeams[0]?.name} (${result.topTeams[0]?.accuracy.toFixed(2)}%)`);
      console.log(`Bottom performing team: ${result.bottomTeams[0]?.name} (${result.bottomTeams[0]?.accuracy.toFixed(2)}%)`);
    } else {
      console.log('No teams met the minimum match threshold');
    }
    
    // Disconnect from MongoDB only if we connected in this function
    if (needToConnect) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
    
    return result;
  } catch (error) {
    console.error('Error generating team stats:', error);
    // Ensure we disconnect from MongoDB only if we connected in this function
    if (needToConnect && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB after error');
    }
    throw error;
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  generateTeamStats().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = generateTeamStats;