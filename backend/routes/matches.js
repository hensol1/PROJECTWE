const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const User = require('../models/User');
const FanPredictionStat = require('../models/FanPredictionStat');
const AIPredictionStat = require('../models/AIPredictionStat');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const { startOfDay, endOfDay, parseISO } = require('date-fns');
const { recalculateUserStats } = require('../utils/userStats');

// Cache for fan accuracy stats
let fanAccuracyCache = null;
let lastCalculationTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

const calculateAccuracy = async () => {
  const fanStat = await FanPredictionStat.findOne() || new FanPredictionStat();
  const aiStat = await AIPredictionStat.findOne() || new AIPredictionStat();
  
  fanStat.totalPredictions = 0;
  fanStat.correctPredictions = 0;
  aiStat.totalPredictions = 0;
  aiStat.correctPredictions = 0;

  const matches = await Match.find({ status: 'FINISHED' });

  for (const match of matches) {
    if (match.votes) {
      fanStat.totalPredictions += 1;
      const { home, draw, away } = match.votes;
      const fanPrediction = home > away ? 'HOME_TEAM' : (away > home ? 'AWAY_TEAM' : 'DRAW');

      let actualWinner;
      if (match.score.winner === null) {
        const { home: homeScore, away: awayScore } = match.score.fullTime;
        actualWinner = homeScore > awayScore ? 'HOME_TEAM' : (awayScore > homeScore ? 'AWAY_TEAM' : 'DRAW');
      } else {
        actualWinner = match.score.winner;
      }

      if (fanPrediction === actualWinner) {
        fanStat.correctPredictions += 1;
      }
    }

    if (match.aiPrediction) {
      aiStat.totalPredictions += 1;
      let actualWinner;
      if (match.score.winner === null) {
        const { home: homeScore, away: awayScore } = match.score.fullTime;
        actualWinner = homeScore > awayScore ? 'HOME_TEAM' : (awayScore > homeScore ? 'AWAY_TEAM' : 'DRAW');
      } else {
        actualWinner = match.score.winner;
      }

      if (match.aiPrediction === actualWinner) {
        aiStat.correctPredictions += 1;
      }
    }
  }

  console.log('AI Stat:', aiStat); // Add this log

  await Promise.all([fanStat.save(), aiStat.save()]);
  return { fanStat, aiStat };
};

const getAIAccuracy = async () => {
  const stat = await AIPredictionStat.findOne() || new AIPredictionStat();
  return stat;
};

// Optional authentication middleware
const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  console.log('Token received in optionalAuth:', token);
  
  if (!token) {
    console.log('No token provided, continuing as unauthenticated user');
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully:', decoded);
    req.user = { id: decoded.userId };
    console.log('User set on request:', req.user);
    next();
  } catch (err) {
    console.error('Error decoding token:', err);
    next();
  }
};

async function updateCorrectVotes(match) {
  const actualResult = match.score.winner || 
    (match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' : 
     match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW');

  const voters = await User.find({ 'votes.matchId': match.id });
  
  for (const user of voters) {
    const vote = user.votes.find(v => v.matchId === match.id);
    if (vote) {
      const isCorrect = (
        (vote.vote === 'home' && actualResult === 'HOME_TEAM') ||
        (vote.vote === 'away' && actualResult === 'AWAY_TEAM') ||
        (vote.vote === 'draw' && actualResult === 'DRAW')
      );
      
      if (isCorrect) {
        user.correctVotes++;
        vote.isCorrect = true;
      } else {
        vote.isCorrect = false;
      }
      
      await user.save();
    }
  }
}


router.get('/', optionalAuth, async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const userId = req.user ? req.user.id : null;
  console.log('User ID from request:', userId);

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Both startDate and endDate are required' });
  }

  try {
    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const [matches, stats, user] = await Promise.all([
      Match.find({
        utcDate: {
          $gte: start.toISOString(),
          $lte: end.toISOString()
        }
      }),
      calculateAccuracy(),
      userId ? User.findById(userId, 'votes') : null
    ]);

    console.log(`Found ${matches.length} matches from ${startDate} to ${endDate}`);
    console.log('User retrieved from database:', user);

    const userVotes = user ? user.votes : [];
    console.log('User votes:', userVotes);

    // Define the order of statuses
    const statusOrder = ['IN_PLAY', 'PAUSED', 'HALFTIME', 'LIVE', 'TIMED', 'SCHEDULED', 'FINISHED'];

    // Sort the matches
    const sortedMatches = matches.sort((a, b) => {
      const statusA = statusOrder.indexOf(a.status);
      const statusB = statusOrder.indexOf(b.status);
      
      if (statusA === statusB) {
        // If statuses are the same, sort by utcDate
        return new Date(a.utcDate) - new Date(b.utcDate);
      }
      
      // If status is not in the list, put it at the end
      if (statusA === -1) return 1;
      if (statusB === -1) return -1;
      
      return statusA - statusB;
    });

    const processedMatches = sortedMatches.map(match => {
      const matchObj = match.toObject();
      
      // Use the votes stored in the match document
      matchObj.voteCounts = match.votes;

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
      
      // Update fan prediction to include team information
      if (matchObj.fanPrediction) {
        matchObj.fanPredictionTeam = matchObj.fanPrediction === 'HOME_TEAM' ? matchObj.homeTeam : 
                                     matchObj.fanPrediction === 'AWAY_TEAM' ? matchObj.awayTeam : null;
      }

      // Update AI prediction to include team information
      if (matchObj.aiPrediction) {
        matchObj.aiPredictionTeam = matchObj.aiPrediction === 'HOME_TEAM' ? matchObj.homeTeam : 
                                    matchObj.aiPrediction === 'AWAY_TEAM' ? matchObj.awayTeam : null;
      }

      // Add user's vote to the match object
      const userVote = userVotes.find(v => v.matchId === match.id);
      if (userVote) {
        matchObj.userVote = userVote.vote;
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

      // Add user's vote to the match object if user is logged in
      if (userId) {
        const userVote = userVotes.find(v => v.matchId === match.id);
        if (userVote) {
          matchObj.userVote = userVote.vote;
          console.log(`User vote for match ${match.id}:`, userVote.vote);
        } else {
          console.log(`No user vote found for match ${match.id}`);
        }
      }

      return matchObj;
    });

    const fanAccuracy = stats.fanStat.totalPredictions > 0
      ? (stats.fanStat.correctPredictions / stats.fanStat.totalPredictions) * 100
      : 0;

    const aiAccuracy = stats.aiStat.totalPredictions > 0
      ? (stats.aiStat.correctPredictions / stats.aiStat.totalPredictions) * 100
      : 0;

    res.json({ 
      matches: processedMatches, 
      fanAccuracy,
      aiAccuracy
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
router.post('/:matchId/vote', optionalAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { vote } = req.body;
    const userId = req.user ? req.user.id : null;
    const userIP = req.ip;

    console.log('Vote attempt:', { matchId, vote, userId, userIP });

    if (!['home', 'draw', 'away'].includes(vote)) {
      return res.status(400).json({ message: 'Invalid vote' });
    }

    const match = await Match.findOne({ id: matchId });
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.status !== 'TIMED' && match.status !== 'SCHEDULED') {
      return res.status(400).json({ message: 'Voting is not allowed for this match' });
    }

    // Check if the user or IP has already voted
    if (userId) {
      if (match.voters.includes(userId)) {
        return res.status(400).json({ message: 'You have already voted for this match' });
      }
    } else if (match.voterIPs.includes(userIP)) {
      return res.status(400).json({ message: 'You have already voted for this match' });
    }

    // Record the vote
    match.votes[vote]++;
    if (userId) {
      match.voters.push(userId);
      const user = await User.findById(userId);
      if (user) {
        user.votes.push({ matchId, vote });
        user.totalVotes++; // Increment total votes
        await user.save();
      }
    } else {
      match.voterIPs.push(userIP);
    }

    await match.save();

    res.json({
      message: 'Vote recorded successfully',
      votes: match.votes,
      userVote: vote
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

// Add this new route to update match results and trigger correct votes update
router.put('/:matchId/update-result', auth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { status, score } = req.body;

    const match = await Match.findOne({ id: matchId });
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    match.status = status;
    match.score = score;

    await match.save();

    if (status === 'FINISHED') {
      await updateCorrectVotes(match);
    }

    res.json({ message: 'Match result updated successfully', match });
  } catch (error) {
    console.error('Error updating match result:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add this admin route to update all correct votes
router.post('/update-all-correct-votes', async (req, res) => {
  try {
    const users = await User.find({});
    let updatedCount = 0;

    for (const user of users) {
      await recalculateUserStats(user);
      updatedCount++;
    }

    res.json({ message: `Updated stats for ${updatedCount} users` });
  } catch (error) {
    console.error('Error updating all correct votes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add this new route
router.post('/update-all-user-stats', auth, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    const users = await User.find({});
    
    for (const user of users) {
      await recalculateUserStats(user);
    }

    res.json({ message: `Updated stats for ${users.length} users` });
  } catch (error) {
    console.error('Error updating all user stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});




module.exports = router;
