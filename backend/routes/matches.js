const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const auth = require('../middleware/auth'); // Assuming you have an auth middleware

router.get('/', async (req, res) => {
  const { date } = req.query;
  const queryDate = new Date(date);
  queryDate.setUTCHours(0, 0, 0, 0);
  const nextDay = new Date(queryDate);
  nextDay.setUTCDate(queryDate.getUTCDate() + 1);

  const queryDateString = queryDate.toISOString().split('T')[0];
  const nextDayString = nextDay.toISOString().split('T')[0];

  try {
    console.log('Fetching matches for date:', date);
    console.log('Query start:', queryDateString);
    console.log('Query end:', nextDayString);

    const matches = await Match.find({
      utcDate: {
        $gte: queryDateString,
        $lt: nextDayString
      }
    }).sort({ 'competition.name': 1, utcDate: 1 });

    console.log('Matches found:', matches.length);
    if (matches.length > 0) {
      console.log('Sample match date:', matches[0].utcDate);
    }

    res.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ message: 'Error fetching matches', error: error.message });
  }
});

router.get('/all', async (req, res) => {
  try {
    const matches = await Match.find().limit(10);
    console.log('All matches found:', matches.length);
    if (matches.length > 0) {
      console.log('Sample match date:', matches[0].utcDate);
    }
    res.json(matches);
  } catch (error) {
    console.error('Error fetching all matches:', error);
    res.status(500).json({ message: 'Error fetching all matches', error: error.message });
  }
});

// New route for voting
router.post('/:matchId/vote', auth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { vote } = req.body;

    if (!req.user) {
      console.log('User not authenticated');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = req.user.id;

    console.log(`Received vote request: matchId=${matchId}, vote=${vote}, userId=${userId}`);

    if (!['home', 'draw', 'away'].includes(vote)) {
      return res.status(400).json({ message: 'Invalid vote' });
    }

    const match = await Match.findOne({ id: matchId });

    if (!match) {
      console.log(`Match not found: ${matchId}`);
      return res.status(404).json({ message: 'Match not found' });
    }

    console.log(`Match found: ${match.id}, status: ${match.status}`);

    if (match.status !== 'TIMED' && match.status !== 'SCHEDULED') {
      return res.status(400).json({ message: 'Voting is not allowed for this match' });
    }

    const user = await User.findById(userId);

    if (!user) {
      console.log(`User not found: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`User found: ${user.username}`);

    // Check if user has already voted for this match
    const existingVoteIndex = user.votes.findIndex(v => v.matchId === matchId);

    if (existingVoteIndex !== -1) {
      // Update existing vote
      const oldVote = user.votes[existingVoteIndex].vote;
      match.votes[oldVote]--;
      match.votes[vote]++;
      user.votes[existingVoteIndex].vote = vote;
      console.log(`Updated existing vote for user ${user.username} on match ${matchId}`);
    } else {
      // Add new vote
      match.votes[vote]++;
      match.voters.push(userId);
      user.votes.push({ matchId, vote });
      console.log(`Added new vote for user ${user.username} on match ${matchId}`);
    }

    await match.save();
    await user.save();

    console.log(`Vote recorded successfully for match ${matchId}`);
    res.json({ message: 'Vote recorded successfully', votes: match.votes });
  } catch (error) {
    console.error('Error recording vote:', error);
    res.status(500).json({ message: 'Error recording vote', error: error.message });
  }
});

module.exports = router;