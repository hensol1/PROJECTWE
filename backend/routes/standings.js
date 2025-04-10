const express = require('express');
const router = express.Router();
const Standing = require('../models/Standing');

// Add this function to determine the correct season based on league type
function getSeasonForLeague(leagueId) {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Array of leagues that run in a calendar year format (Apr-Nov)
    // Scandinavian leagues and others with similar schedules
    const calendarYearLeagues = [103, 113, 188, 119, 135, 327, 169, 13, 11];
    
    if (calendarYearLeagues.includes(leagueId)) {
        // For calendar year leagues (like Norway, Sweden, etc.)
        return currentMonth < 4 ? currentYear - 1 : currentYear;
    } else {
        // For traditional European season format (Aug-May)
        return currentMonth < 8 ? currentYear - 1 : currentYear;
    }
}

// Keep your existing route
router.get('/:leagueId/:season', async (req, res) => {
    const { leagueId, season } = req.params;

    try {
        // Parse the requested league and season
        const parsedLeagueId = parseInt(leagueId);
        const requestedSeason = parseInt(season);
        
        // Get the correct season for this league type
        const correctSeason = getSeasonForLeague(parsedLeagueId);
        
        console.log(`Looking for standings - League: ${parsedLeagueId}, Requested Season: ${requestedSeason}, Correct Season: ${correctSeason}`);
        
        // Use the correct season for this league
        const adjustedSeason = correctSeason;

        const standings = await Standing.findOne({ 
            leagueId: parsedLeagueId,
            season: adjustedSeason
        });

        if (!standings) {
            console.log(`No standings found for league ${parsedLeagueId} season ${adjustedSeason}`);
            
            // Optional: You could add logic here to try to fetch the standings from the API
            // if they don't exist in your database
            
            return res.status(404).json({ 
                message: 'Standings not found for this league and season' 
            });
        }

        console.log(`Returning standings for league ${parsedLeagueId} season ${adjustedSeason}, last updated: ${standings.lastUpdated}`);
        
        res.json(standings);
    } catch (error) {
        console.error('Error retrieving standings:', error);
        res.status(500).json({ 
            message: 'Error retrieving standings',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Add a new route to support queries without explicit season
router.get('/:leagueId', async (req, res) => {
    const { leagueId } = req.params;
    const season = req.query.season; // Allow season to be passed as query param

    try {
        // Parse the requested league
        const parsedLeagueId = parseInt(leagueId);
        
        // Determine season to use - from query param or calculate
        let adjustedSeason;
        if (season) {
            // If season was explicitly provided in query
            adjustedSeason = parseInt(season);
        } else {
            // Otherwise use our automatic season logic
            adjustedSeason = getSeasonForLeague(parsedLeagueId);
        }
        
        console.log(`Looking for standings - League: ${parsedLeagueId}, Adjusted Season: ${adjustedSeason}`);

        const standings = await Standing.findOne({ 
            leagueId: parsedLeagueId,
            season: adjustedSeason
        });

        if (!standings) {
            console.log(`No standings found for league ${parsedLeagueId} season ${adjustedSeason}`);
            return res.status(404).json({ 
                message: 'Standings not found for this league and season' 
            });
        }

        console.log(`Returning standings for league ${parsedLeagueId} season ${adjustedSeason}, last updated: ${standings.lastUpdated}`);
        
        // Log the structure for debugging
        if (standings.standings) {
            console.log(`Returning standings with ${Array.isArray(standings.standings[0]) ? 'multiple tables' : 'single table'} structure`);
            console.log(`Number of tables: ${Array.isArray(standings.standings[0]) ? standings.standings.length : 1}`);
        }
        
        // Return the full standings document without modification
        res.json(standings);
    } catch (error) {
        console.error('Error retrieving standings:', error);
        res.status(500).json({ 
            message: 'Error retrieving standings',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Optional: Add the update route
router.post('/update/:leagueId', async (req, res) => {
    try {
        const { leagueId } = req.params;
        const { season } = req.body;
        
        // Import the standings processor
        const { processStandings } = require('../fetchStandings');
        
        console.log(`Manually triggering standings update for league ${leagueId}, season ${season || 'current'}`);
        
        // Pass the season if provided, otherwise use the current season logic
        const result = await processStandings(parseInt(leagueId), season || getSeasonForLeague(parseInt(leagueId)));
        
        if (result.success) {
            res.status(200).json({
                success: true,
                message: `Standings updated successfully for league ${leagueId}`,
                details: result
            });
        } else {
            res.status(400).json({
                success: false,
                message: `Failed to update standings for league ${leagueId}`,
                error: result.error,
                details: result.details
            });
        }
    } catch (error) {
        console.error('Error in manual standings update:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating standings',
            error: error.message
        });
    }
});

module.exports = router;