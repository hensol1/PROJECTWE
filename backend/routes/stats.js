const express = require('express');
const router = express.Router();
const Match = require('../models/Match');

router.get('/daily-predictions', async (req, res) => {
    try {
        // Get today's date range in UTC
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

        console.log('Querying for date range:', {
            start: today.toISOString(),
            end: tomorrow.toISOString()
        });

        // First get all matches for today
        const matches = await Match.find({
            utcDate: {
                $gte: today.toISOString(),
                $lt: tomorrow.toISOString()
            }
        });

        console.log('Found matches:', matches.length);

        // Calculate total votes
        let totalVotes = 0;
        matches.forEach(match => {
            const votes = match.votes || {};
            totalVotes += (votes.home || 0) + (votes.draw || 0) + (votes.away || 0);
        });

        console.log('Total votes calculated:', totalVotes);

        const stats = {
            totalMatches: matches.length,
            totalVotes: totalVotes,
            matchDetails: matches.map(match => ({
                id: match.id,
                votes: match.votes,
                matchTime: match.utcDate
            }))
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching daily predictions:', error);
        res.status(500).json({ error: 'Failed to fetch daily predictions' });
    }
});

module.exports = router;