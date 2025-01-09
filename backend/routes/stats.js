const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Vote = require('../models/Vote');

  
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

      // Get all matches for today
      const matches = await Match.find({
          utcDate: {
              $gte: today.toISOString(),
              $lt: tomorrow.toISOString()
          }
      });

      console.log('Found matches:', matches.length);

      // Get total votes for these matches from Vote collection
      let totalVotes = 0;
      if (matches.length > 0) {
          const matchIds = matches.map(match => match.id);
          const voteCount = await Vote.countDocuments({
              matchId: { $in: matchIds }
          });
          totalVotes = voteCount;
      }

      console.log('Total votes calculated:', totalVotes);

      const stats = {
          totalMatches: matches.length,
          totalVotes: totalVotes,
          matchDetails: matches.map(match => {
              // Get vote counts from match document
              const votes = match.votes || { home: 0, draw: 0, away: 0 };
              return {
                  id: match.id,
                  votes: votes,
                  matchTime: match.utcDate
              };
          })
      };

      res.json(stats);
  } catch (error) {
      console.error('Error fetching daily predictions:', error);
      res.status(500).json({ error: 'Failed to fetch daily predictions' });
  }
});

module.exports = router;