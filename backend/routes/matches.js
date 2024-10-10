const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const User = require('../models/User');
const FanPredictionStat = require('../models/FanPredictionStat');
const auth = require('../middleware/auth');

// Cache for fan accuracy stats
let fanAccuracyCache = null;
let lastCalculationTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

const calculateFanAccuracy = async () => {
  const stat = await FanPredictionStat.findOne() || new FanPredictionStat();
  stat.totalPredictions = 0;
  stat.correctPredictions = 0;

  const matches = await Match.find({ status: 'FINISHED' });

  for (const match of matches) {
    if (match.votes) {
      stat.totalPredictions += 1;
      const { home, draw, away } = match.votes;
      const fanPrediction = home > away ? 'HOME_TEAM' : (away > home ? 'AWAY_TEAM' : 'DRAW');

      let actualWinner;
      if (match.score.winner === null) {
        const { home: homeScore, away: awayScore } = match.score.fullTime;
        if (homeScore > awayScore) {
          actualWinner = 'HOME_TEAM';
        } else if (awayScore > homeScore) {
          actualWinner = 'AWAY_TEAM';
        } else {
          actualWinner = 'DRAW';
        }
      } else {
        actualWinner = match.score.winner;
      }

      if (fanPrediction === actualWinner) {
        stat.correctPredictions += 1;
      }
    }
  }

  await stat.save();
  return stat;
};

const getFanAccuracy = async () => {
  const currentTime = Date.now();
  if (!fanAccuracyCache || currentTime - lastCalculationTime > CACHE_DURATION) {
    fanAccuracyCache = await calculateFanAccuracy();
    lastCalculationTime = currentTime;
  }
  return fanAccuracyCache;
};

router.get('/', async (req, res) => {
  const { date } = req.query;
  const queryDate = new Date(date);
  queryDate.setUTCHours(0, 0, 0, 0);
  const nextDay = new Date(queryDate);
  nextDay.setUTCDate(queryDate.getUTCDate() + 1);
  const queryDateString = queryDate.toISOString().split('T')[0];
  const nextDayString = nextDay.toISOString().split('T')[0];

  try {
    const [matches, stat] = await Promise.all([
      Match.find({
        utcDate: {
          $gte: queryDateString,
          $lt: nextDayString
        }
      }).sort({ 'competition.name': 1, utcDate: 1 }),
      getFanAccuracy()
    ]);

    console.log(`Found ${matches.length} matches for date ${queryDateString}`);

    const processedMatches = await Promise.all(matches.map(async (match) => {
      const matchObj = match.toObject();
      
      // Count votes for this match
      const voteCount = await User.aggregate([
        { $unwind: "$votes" },
        { $match: { "votes.matchId": match.id } },
        { $group: {
            _id: "$votes.vote",
            count: { $sum: 1 }
          }
        }
      ]);

      // Initialize vote counts
      matchObj.voteCounts = { home: 0, draw: 0, away: 0 };
      voteCount.forEach(vote => {
        matchObj.voteCounts[vote._id] = vote.count;
      });

      // Calculate fan prediction based on majority votes
      const totalVotes = matchObj.voteCounts.home + matchObj.voteCounts.draw + matchObj.voteCounts.away;
      if (totalVotes > 0) {
        const maxVotes = Math.max(matchObj.voteCounts.home, matchObj.voteCounts.draw, matchObj.voteCounts.away);
        if (matchObj.voteCounts.home === maxVotes) {
          matchObj.fanPrediction = 'HOME_TEAM';
        } else if (matchObj.voteCounts.away === maxVotes) {
          matchObj.fanPrediction = 'AWAY_TEAM';
        } else {
          matchObj.fanPrediction = 'DRAW';
        }
      } else {
        matchObj.fanPrediction = null;
      }

      if (match.status === 'FINISHED') {
        let actualResult;
        if (match.score.winner === null) {
          const { home: homeScore, away: awayScore } = match.score.fullTime;
          if (homeScore > awayScore) {
            actualResult = 'HOME_TEAM';
          } else if (awayScore > homeScore) {
            actualResult = 'AWAY_TEAM';
          } else {
            actualResult = 'DRAW';
          }
        } else {
          actualResult = match.score.winner;
        }
        
        matchObj.fanPredictionCorrect = matchObj.fanPrediction === actualResult;
        
        if (match.aiPrediction) {
          matchObj.aiPredictionCorrect = match.aiPrediction === actualResult;
        }
      }

      return matchObj;
    }));

    const fanAccuracy = stat.totalPredictions > 0
      ? (stat.correctPredictions / stat.totalPredictions) * 100
      : 0;

    console.log('Fan Accuracy Stats:', {
      totalPredictions: stat.totalPredictions,
      correctPredictions: stat.correctPredictions,
      fanAccuracy
    });

    res.json({ 
      matches: processedMatches, 
      fanAccuracy
    });
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

// Updated route for voting with improved error handling
router.post('/:matchId/vote', auth, async (req, res) => {
  console.log('Vote route called, user:', req.user);

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

  user.totalVotes++;
  let leagueStat = user.leagueStats.find(stat => stat.leagueId === match.competition.id);
  if (!leagueStat) {
    leagueStat = {
      leagueId: match.competition.id,
      leagueName: match.competition.name,
      totalVotes: 0,
      correctVotes: 0
    };
    user.leagueStats.push(leagueStat);
  }
  leagueStat.totalVotes++;

  // If the match is finished, update the correctness of the vote
  if (match.status === 'FINISHED') {
    const isCorrect = (
      (vote === 'home' && match.score.winner === 'HOME_TEAM') ||
      (vote === 'away' && match.score.winner === 'AWAY_TEAM') ||
      (vote === 'draw' && match.score.winner === 'DRAW')
    );
    
    user.votes[user.votes.length - 1].isCorrect = isCorrect;
    if (isCorrect) {
      user.correctVotes++;
      leagueStat.correctVotes++;
    }
  }

  await user.save();

    // Calculate percentages
    const totalVotes = match.votes.home + match.votes.draw + match.votes.away;
    const percentages = {
      home: totalVotes > 0 ? Math.round((match.votes.home / totalVotes) * 100) : 0,
      draw: totalVotes > 0 ? Math.round((match.votes.draw / totalVotes) * 100) : 0,
      away: totalVotes > 0 ? Math.round((match.votes.away / totalVotes) * 100) : 0
    };

    console.log(`Vote recorded successfully for match ${matchId}`);
    res.json({
      message: 'Vote recorded successfully',
      votes: match.votes,
      percentages: percentages
    });
  } catch (error) {
    console.error('Error recording vote:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add a new route to manually trigger fan accuracy recalculation
router.post('/recalculate-accuracy', auth, async (req, res) => {
  try {
    const stat = await calculateFanAccuracy();
    fanAccuracyCache = stat;
    lastCalculationTime = Date.now();
    res.json({ message: 'Fan accuracy recalculated', stat });
  } catch (error) {
    console.error('Error recalculating fan accuracy:', error);
    res.status(500).json({ message: 'Error recalculating fan accuracy', error: error.message });
  }
});


module.exports = router;
