// In routes/lineups.js
const express = require('express');
const router = express.Router();
const Lineup = require('../models/Lineup');
const { fetchAndStoreLineups } = require('../fetchLineups');

router.get('/:matchId', async (req, res) => {
    try {
        const { matchId } = req.params;
        console.log('Route hit - Fetching lineups for match:', matchId);
        
        // Try to get from database first
        let lineups = await Lineup.find({ matchId });
        console.log('Found in DB:', lineups.length, 'lineups');
        
        // Filter out invalid lineup records
        lineups = lineups.filter(lineup => lineup.team && !lineup.noLineupsAvailable);
        
        // If we have valid lineups, return them
        if (lineups.length > 0) {
            console.log('Returning valid lineups');
            return res.json(lineups);
        }

        // If no valid lineups, try to fetch from API
        console.log('No valid lineups in DB, fetching from API...');
        lineups = await fetchAndStoreLineups(matchId);
        
        // If we got lineups from the API, return them
        if (lineups && lineups.length > 0) {
            return res.json(lineups);
        }

        // If no lineups available, return empty array
        console.log('No lineups available for match:', matchId);
        return res.json([]);
        
    } catch (error) {
        console.error('Error in lineups route:', error);
        res.status(500).json({ 
            message: 'Failed to fetch lineups',
            error: error.message 
        });
    }
});

module.exports = router;