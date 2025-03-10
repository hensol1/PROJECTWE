// backend/routes/teamStats.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const generateTeamStats = require('../scripts/generateTeamStats');
const { withCache } = require('../middleware/cacheMiddleware');

/**
 * GET /api/team-stats
 * Retrieves team performance statistics
 */
router.get('/', withCache('team-stats', 300), async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../data/teamStats.json');
    console.log('Looking for team stats file at:', filePath);
    
    // Check if stats file exists and is recent (less than 24 hours old)
    let stats = null;
    let shouldGenerateNewStats = true;
    
    if (fs.existsSync(filePath)) {
      console.log('Team stats file exists');
      const fileStats = fs.statSync(filePath);
      const fileAgeHours = (Date.now() - fileStats.mtime) / (1000 * 60 * 60);
      const fileSize = fileStats.size;
      
      console.log(`Team stats file age: ${fileAgeHours.toFixed(2)} hours, size: ${fileSize} bytes`);
      
      // Only use the file if it has actual content and is less than 24 hours old
      if (fileAgeHours < 24 && fileSize > 10) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        try {
          stats = JSON.parse(fileContent);
          shouldGenerateNewStats = false;
          console.log('Successfully parsed team stats file');
        } catch (parseError) {
          console.error('Error parsing team stats file:', parseError);
          shouldGenerateNewStats = true;
        }
      }
    } else {
      console.log('Team stats file does not exist yet');
    }
    
    // Generate new stats if needed
    if (shouldGenerateNewStats) {
      console.log('Generating new team stats...');
      try {
        stats = await generateTeamStats();
        console.log('Team stats generated successfully');
      } catch (genError) {
        console.error('Error generating team stats on the fly:', genError);
        // If we can't generate stats, create an empty default structure
        stats = {
          topTeams: [],
          bottomTeams: [],
          lastUpdated: new Date().toISOString(),
          totalTeamsAnalyzed: 0,
          error: 'Failed to generate team stats'
        };
      }
    }
    
    res.json(stats);
  } catch (error) {
    console.error('Error serving team stats:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve team statistics',
      message: error.message 
    });
  }
});

/**
 * GET /api/team-stats/all
 * Retrieves all teams performance statistics, not just top/bottom
 */
router.get('/all', withCache('all-team-stats', 300), async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../data/teamStats.json');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'Team stats file not found',
        message: 'Team statistics have not been generated yet'
      });
    }
    
    // Read the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    try {
      // Parse the JSON
      const fullData = JSON.parse(fileContent);
      
      // Access the full data array (this should be hidden in the file)
      if (fullData.allTeams) {
        // If the allTeams property already exists, use it directly
        return res.json({ teams: fullData.allTeams });
      } else {
        // We need to read all teams from the database directly
        const Match = require('../models/Match');
        
        // Get all unique teams from match data
        const teams = await getTeamsWithStats();
        
        return res.json({ teams });
      }
    } catch (parseError) {
      console.error('Error parsing team stats file:', parseError);
      return res.status(500).json({ 
        error: 'Error processing team statistics',
        message: parseError.message
      });
    }
  } catch (error) {
    console.error('Error serving all team stats:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve all team statistics',
      message: error.message 
    });
  }
});

/**
 * POST /api/team-stats/refresh
 * Force refresh of team performance statistics
 * (Admin only endpoint)
 */
router.post('/refresh', async (req, res) => {
  try {
    // Here you would normally check for admin authentication
    // For your existing application, the auth middleware will handle this
    console.log('Admin requested team stats refresh');
    
    const stats = await generateTeamStats();
    console.log('Team stats refreshed successfully');
    
    res.json({ 
      success: true, 
      message: 'Team statistics refreshed successfully',
      lastUpdated: stats.lastUpdated,
      totalTeamsAnalyzed: stats.totalTeamsAnalyzed
    });
  } catch (error) {
    console.error('Error refreshing team stats:', error);
    res.status(500).json({ 
      error: 'Failed to refresh team statistics',
      message: error.message 
    });
  }
});

/**
 * POST /api/team-stats/force-refresh
 * Completely regenerate team stats by clearing all caches first
 * (Admin only endpoint)
 */
router.post('/force-refresh', async (req, res) => {
  try {
    console.log('Admin requested FORCED team stats refresh');
    
    // Delete existing files to force complete regeneration
    const dataFilePath = path.join(__dirname, '../data/teamStats.json');
    const publicFilePath = path.join(__dirname, '../public/stats/team-stats.json');
    
    // Delete data file if it exists
    if (fs.existsSync(dataFilePath)) {
      fs.unlinkSync(dataFilePath);
      console.log('Deleted existing team stats data file');
    }
    
    // Delete public file if it exists
    if (fs.existsSync(publicFilePath)) {
      fs.unlinkSync(publicFilePath);
      console.log('Deleted existing team stats public file');
    }
    
    // Clear any caches
    // This assumes your caching middleware has a reset function
    // Adjust according to your actual caching implementation
    if (req.app.locals.cache && req.app.locals.cache.del) {
      req.app.locals.cache.del('team-stats');
      console.log('Cleared team stats cache');
    }
    
    // Generate fresh stats
    const stats = await generateTeamStats();
    console.log('Team stats regenerated from scratch');
    
    res.json({ 
      success: true, 
      message: 'Team statistics completely regenerated from scratch',
      lastUpdated: stats.lastUpdated,
      totalTeamsAnalyzed: stats.totalTeamsAnalyzed
    });
  } catch (error) {
    console.error('Error in forced team stats refresh:', error);
    res.status(500).json({ 
      error: 'Failed to regenerate team statistics',
      message: error.message 
    });
  }
});

// Also add a route to serve the file directly for development debugging
router.get('/file', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../data/teamStats.json');
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: 'Team stats file not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error accessing team stats file' });
  }
});

// Helper function to get all teams with their stats from the database
async function getTeamsWithStats() {
  const Match = require('../models/Match');
  
  try {
    // Get all finished matches with AI predictions
    const matches = await Match.find({
      status: 'FINISHED',
      aiPrediction: { $exists: true, $ne: null }
    }).lean();
    
    // Process each match to extract team stats
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
    
    // Calculate accuracy for each team
    const processedTeams = Object.values(teamStats).map(team => {
      team.accuracy = (team.correctPredictions / team.totalMatches) * 100;
      return team;
    });
    
    // Sort by accuracy descending
    return processedTeams.sort((a, b) => b.accuracy - a.accuracy);
  } catch (error) {
    console.error('Error getting all teams with stats:', error);
    return [];
  }
}

/**
 * GET /api/team-stats/:teamId
 * Retrieves match history and predictions for a specific team
 */
router.get('/:teamId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    console.log(`Fetching match history for team ID: ${teamId}`);
    
    if (isNaN(teamId)) {
      return res.status(400).json({ 
        error: 'Invalid team ID',
        message: 'Team ID must be a number'
      });
    }
    
    // Get the Match model
    const Match = require('../models/Match');
    
    // Find all matches where this team played (either home or away)
    const matches = await Match.find({
      $or: [
        { 'homeTeam.id': teamId },
        { 'awayTeam.id': teamId }
      ],
      status: 'FINISHED',
      aiPrediction: { $exists: true, $ne: null }
    }).sort({ utcDate: -1 }) // Sort by date, newest first
      .lean();
    
    console.log(`Found ${matches.length} matches for team ID ${teamId}`);
    
    // Process matches to add whether prediction was correct
    const processedMatches = matches.map(match => {
      let actualResult = null;
      
      // Determine actual match result
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
        actualResult = match.score.winner;
      }
      
      // Check if prediction was correct
      const predictionCorrect = match.aiPrediction === actualResult;
      
      // Find the team name for easier display
      const teamName = match.homeTeam.id === teamId ? match.homeTeam.name : match.awayTeam.name;
      
      // Mark if team is home or away
      const isHomeTeam = match.homeTeam.id === teamId;
      
      return {
        id: match.id,
        date: match.utcDate,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        score: match.score,
        prediction: match.aiPrediction,
        actualResult,
        predictionCorrect,
        teamIsHome: isHomeTeam,
        competition: match.competition
      };
    });
    
    // Calculate overall stats
    const correctPredictions = processedMatches.filter(m => m.predictionCorrect).length;
    const totalMatches = processedMatches.length;
    const accuracy = totalMatches > 0 ? (correctPredictions / totalMatches) * 100 : 0;
    
    // Get team details from first match
    const team = processedMatches.length > 0 ? 
      (processedMatches[0].teamIsHome ? processedMatches[0].homeTeam : processedMatches[0].awayTeam) : 
      { id: teamId, name: 'Unknown Team' };
    
    const result = {
      team,
      stats: {
        correctPredictions,
        totalMatches,
        accuracy
      },
      matches: processedMatches
    };
    
    console.log(`Sending match history for ${team.name} (ID: ${teamId}), ${processedMatches.length} matches`);
    res.json(result);
  } catch (error) {
    console.error('Error retrieving team match history:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve team match history',
      message: error.message 
    });
  }
});

module.exports = router;