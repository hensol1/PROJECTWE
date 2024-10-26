const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const User = require('../models/User');
const FanPredictionStat = require('../models/FanPredictionStat');
const AIPredictionStat = require('../models/AIPredictionStat');
const { startOfDay, endOfDay, parseISO, isValid, subHours, addHours } = require('date-fns'); // Remove date-fns-tz import
const { recalculateUserStats } = require('../utils/userStats');
const optionalAuth = require('../middleware/optionalAuth');
const auth = require('../middleware/auth');

// Add these helper functions at the top of the file
const checkPredictionCorrect = (prediction, match) => {
  const homeScore = match.score.fullTime.home;
  const awayScore = match.score.fullTime.away;
  
  let actualResult;
  if (homeScore > awayScore) actualResult = 'HOME_TEAM';
  else if (awayScore > homeScore) actualResult = 'AWAY_TEAM';
  else actualResult = 'DRAW';
  
  return prediction === actualResult;
};

const updatePredictionStats = async (modelType, isCorrect) => {
  const today = startOfDay(new Date());
  const StatModel = modelType === 'AI' ? AIPredictionStat : FanPredictionStat;
  
  try {
    let stats = await StatModel.findOne();
    if (!stats) {
      stats = new StatModel();
    }

    // Update total stats
    stats.totalPredictions += 1;
    if (isCorrect) {
      stats.correctPredictions += 1;
    }

    // Find or create today's daily stat
    let dailyStat = stats.dailyStats.find(stat => 
      startOfDay(stat.date).getTime() === today.getTime()
    );

    if (!dailyStat) {
      stats.dailyStats.push({
        date: today,
        totalPredictions: 0,
        correctPredictions: 0
      });
      dailyStat = stats.dailyStats[stats.dailyStats.length - 1];
    }

    // Update daily stats
    dailyStat.totalPredictions += 1;
    if (isCorrect) {
      dailyStat.correctPredictions += 1;
    }

    // Keep last 30 days of daily stats
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    stats.dailyStats = stats.dailyStats.filter(stat => 
      stat.date >= thirtyDaysAgo
    );

    await stats.save();
    return stats;
  } catch (error) {
    console.error(`Error updating ${modelType} prediction stats:`, error);
    throw error;
  }
};

// Add this function to handle match completion
const handleMatchCompletion = async (match) => {
  if (match.status === 'FINISHED') {
    try {
      // Get the fan prediction based on votes
      const { home, draw, away } = match.votes;
      const totalVotes = home + draw + away;
      
      if (totalVotes > 0) {
        const maxVotes = Math.max(home, draw, away);
        let fanPrediction;
        if (home === maxVotes) {
          fanPrediction = 'HOME_TEAM';
        } else if (away === maxVotes) {
          fanPrediction = 'AWAY_TEAM';
        } else {
          fanPrediction = 'DRAW';
        }

        // Update Fan stats
        const fanCorrect = checkPredictionCorrect(fanPrediction, match);
        await updatePredictionStats('FAN', fanCorrect);
      }

      // If there's an AI prediction, update AI stats
      if (match.aiPrediction) {
        const aiCorrect = checkPredictionCorrect(match.aiPrediction, match);
        await updatePredictionStats('AI', aiCorrect);
      }

      console.log('Updated prediction stats for match:', match.id);
    } catch (error) {
      console.error('Error updating match completion stats:', error);
      throw error;
    }
  }
};

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
  const { date } = req.query;
  const timeZone = req.headers['x-timezone'] || 'UTC';
  const userId = req.user ? req.user.id : null;
  
  console.log('Match request received:', {
    requestDate: date,
    userTimezone: timeZone,
    userId: userId,
    serverTime: new Date().toISOString()
  });

  if (!date) {
    return res.status(400).json({ message: 'Date is required' });
  }

  try {
    const userDate = parseISO(date);
    if (!isValid(userDate)) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    // Calculate UTC offset in hours from timezone string
    const tzOffset = new Date().getTimezoneOffset() / 60;
    
    // Adjust date range based on timezone offset
    const start = subHours(startOfDay(userDate), tzOffset);
    const end = subHours(endOfDay(userDate), tzOffset);

    console.log('Query parameters:', {
      inputDate: date,
      userTimezone: timeZone,
      startTime: start.toISOString(),
      endTime: end.toISOString()
    });

    // Find matches within the adjusted time range
    const [matches, user] = await Promise.all([
      Match.find({
        $or: [
          // Match starts within the user's day
          { utcDate: { $gte: start.toISOString(), $lte: end.toISOString() } },
          // Include matches that ended up to 8 hours before the start of the day
          {
            status: 'FINISHED',
            utcDate: { 
              $gte: subHours(start, 8).toISOString(),
              $lt: start.toISOString()
            }
          }
        ]
      }).sort({ utcDate: 1 }),
      userId ? User.findById(userId, 'votes') : null
    ]);

    console.log('Found matches:', {
      count: matches.length,
      matchDates: matches.map(m => ({
        id: m.id,
        utcDate: m.utcDate,
        status: m.status
      }))
    });

    const userVotes = user ? user.votes : [];

    const processedMatches = matches.map(match => {
      const matchObj = match.toObject();
      
      // Convert UTC date to local time
      const matchDate = new Date(match.utcDate);
      matchObj.localDate = addHours(matchDate, tzOffset);
      matchObj.voteCounts = match.votes;

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

      const userVote = userVotes.find(v => v.matchId === match.id);
      if (userVote) {
        matchObj.userVote = userVote.vote;
      }

      return matchObj;
    });

    res.json({ matches: processedMatches });
  } catch (error) {
    console.error('Error in matches route:', error);
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
      console.log(`Match not found: ${matchId}`);
      return res.status(404).json({ message: 'Match not found' });
    }

    console.log(`Match status: ${match.status}`);
    console.log(`Match voters:`, match.voters);
    console.log(`Match voterIPs:`, match.voterIPs);

    if (match.status !== 'TIMED' && match.status !== 'SCHEDULED') {
      return res.status(400).json({ message: `Voting is not allowed for this match. Current status: ${match.status}` });
    }

    let isUpdatingVote = false;
    // Check if the user or IP has already voted
    if (userId) {
      if (match.voters.includes(userId)) {
        isUpdatingVote = true;
        console.log(`User ${userId} is updating their vote for match ${matchId}`);
      }
    } else if (match.voterIPs.includes(userIP)) {
      return res.status(400).json({ message: 'You have already voted for this match' });
    }

    // Update or record the vote
    if (isUpdatingVote) {
      // Remove the old vote
      Object.keys(match.votes).forEach(key => {
        if (match.votes[key] > 0) match.votes[key]--;
      });
    } else {
      if (userId) {
        match.voters.push(userId);
      } else {
        match.voterIPs.push(userIP);
      }
    }
    match.votes[vote]++;

    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        const existingVoteIndex = user.votes.findIndex(v => v.matchId === matchId);
        if (existingVoteIndex !== -1) {
          console.log(`Updating existing vote for user ${userId} on match ${matchId}`);
          user.votes[existingVoteIndex].vote = vote;
        } else {
          console.log(`Adding new vote for user ${userId} on match ${matchId}`);
          user.votes.push({ matchId, vote });
          if (!isUpdatingVote) user.totalVotes++; // Increment total votes only for new votes
        }
        await user.save();
      } else {
        console.log(`User ${userId} not found`);
      }
    }

    await match.save();

    res.json({
      message: isUpdatingVote ? 'Vote updated successfully' : 'Vote recorded successfully',
      votes: match.votes,
      userVote: vote
    });
  } catch (error) {
    console.error('Error recording vote:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
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

    const wasFinished = match.status === 'FINISHED';
    match.status = status;
    match.score = score;

    await match.save();

    // If match just finished, update stats
    if (!wasFinished && status === 'FINISHED') {
      await updateStatsForFinishedMatch(matchId);
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

router.post('/update-match-status', async (req, res) => {
  try {
    const { matchId, status, score } = req.body;
    const match = await Match.findById(matchId);
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const wasFinished = match.status === 'FINISHED';
    match.status = status;
    match.score = score;
    await match.save();

    // Only update stats if the match just finished (wasn't finished before)
    if (!wasFinished && status === 'FINISHED') {
      await handleMatchCompletion(match);
    }

    res.json({ message: 'Match updated successfully' });
  } catch (error) {
    console.error('Error updating match:', error);
    res.status(500).json({ message: 'Error updating match' });
  }
});





module.exports = router;
