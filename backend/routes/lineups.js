const express = require('express');
const router = express.Router();
const Lineup = require('../models/Lineup');
const { fetchAndStoreLineups } = require('../fetchLineups');

// Get lineups for a specific match
router.get('/:matchId', async (req, res) => {
    try {
        const { matchId } = req.params;
        
        // Try to get from database first
        let lineups = await Lineup.find({ matchId });
        
        // If no lineups in database, fetch from API
        if (lineups.length === 0) {
            lineups = await fetchAndStoreLineups(matchId);
        }
        
        res.json(lineups);
    } catch (error) {
        console.error('Error fetching lineups:', error);
        res.status(500).json({ message: 'Failed to fetch lineups' });
    }
});

module.exports = router;