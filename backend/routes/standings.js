// routes/standings.js
const express = require('express');
const router = express.Router();
const Standing = require('../models/Standing');
const { processStandings } = require('../fetchStandings');

router.get('/:leagueId/:season', async (req, res) => {
    const { leagueId, season } = req.params;

    try {
        // Try to get standings from MongoDB
        let standings = await Standing.findOne({ 
            leagueId: parseInt(leagueId),
            season: parseInt(season)
        });

        // If no standings found or data is older than 1 hour, fetch new data
        if (!standings || 
            (new Date() - new Date(standings.lastUpdated)) > 3600000) {
            await processStandings(parseInt(leagueId), parseInt(season));
            standings = await Standing.findOne({ 
                leagueId: parseInt(leagueId),
                season: parseInt(season)
            });
        }

        if (!standings) {
            return res.status(404).json({ message: 'No standings data available' });
        }

        res.json(standings);
    } catch (error) {
        console.error('Error fetching standings:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;