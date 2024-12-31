const express = require('express');
const router = express.Router();
const Standing = require('../models/Standing');

router.get('/:leagueId/:season', async (req, res) => {
    const { leagueId, season } = req.params;

    try {
        // Parse the requested league and season
        const parsedLeagueId = parseInt(leagueId);
        const requestedSeason = parseInt(season);
        
        // For future dates (2025), fallback to current season (2024)
        const currentSeason = 2024; // Current season
        const adjustedSeason = requestedSeason > currentSeason ? currentSeason : requestedSeason;

        console.log(`Looking for standings - League: ${parsedLeagueId}, Requested Season: ${requestedSeason}, Adjusted Season: ${adjustedSeason}`);

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
        
        res.json(standings);
    } catch (error) {
        console.error('Error retrieving standings:', error);
        res.status(500).json({ 
            message: 'Error retrieving standings',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;