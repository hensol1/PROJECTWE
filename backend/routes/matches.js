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
const UserStatsCache = require('../models/UserStatsCache');

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

const determineAutoVote = async (match) => {
  // Weights based on typical football statistics
  const weights = {
    home: 0.45,  // 45% chance for home win
    draw: 0.25,  // 25% chance for draw
    away: 0.30   // 30% chance for away win
  };
  
  // Generate a random number between 0 and 1
  const random = Math.random();

  // Determine vote based on probability ranges
  if (random < weights.home) {
    return 'home';
  } else if (random < weights.home + weights.draw) {
    return 'draw';
  } else {
    return 'away';
  }
};

// Auto-vote route
router.post('/auto-vote', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get the user's current date
    const userTimeZone = req.headers['x-timezone'] || 'UTC';
    const userDate = new Date();
    const startOfDay = new Date(userDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(userDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get only matches for the current date
    const matches = await Match.find({
      status: { $in: ['TIMED', 'SCHEDULED'] },
      utcDate: {
        $gte: startOfDay.toISOString(),
        $lte: endOfDay.toISOString()
      }
    });

    // Get user's existing votes
    const userVotedMatchIds = user.votes.map(vote => vote.matchId);

    // Filter out matches that user has already voted on
    const unvotedMatches = matches.filter(match => 
      !userVotedMatchIds.includes(match.id)
    );

    if (unvotedMatches.length === 0) {
      return res.json({ 
        message: 'No matches available for auto-voting today',
        votedMatches: [] 
      });
    }

    // Process each unvoted match
    const votedMatches = [];
    for (const match of unvotedMatches) {
      try {
        const autoVote = await determineAutoVote(match);
        
        // Record the vote
        match.votes[autoVote]++;
        await match.save();

        // Update user's votes
        user.votes.push({
          matchId: match.id,
          vote: autoVote,
          date: new Date()
        });
        user.totalVotes++;

        votedMatches.push({
          matchId: match.id,
          vote: autoVote,
          votes: match.votes
        });
      } catch (error) {
        console.error(`Error auto-voting for match ${match.id}:`, error);
      }
    }

    // Save user's votes
    await user.save();

    // Clear user stats cache to force refresh
    await UserStatsCache.findOneAndUpdate(
      { userId: user._id },
      { $set: { lastUpdated: new Date(0) } },
      { upsert: true }
    );

    res.json({
      message: `Successfully auto-voted for ${votedMatches.length} matches`,
      votedMatches
    });

  } catch (error) {
    console.error('Error in auto-vote:', error);
    res.status(500).json({ message: 'Error processing auto-votes' });
  }
});

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
  try {
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

    const userDate = parseISO(date);
    if (!isValid(userDate)) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    // Calculate UTC offset in hours from timezone string
    const tzOffset = new Date().getTimezoneOffset() / 60;
    
    // Adjust date range based on timezone offset
    const start = subHours(startOfDay(userDate), tzOffset + 12); // Look back 12 hours
    const end = subHours(endOfDay(userDate), tzOffset);

    console.log('Query parameters:', {
      inputDate: date,
      userTimezone: timeZone,
      startTime: start.toISOString(),
      endTime: end.toISOString()
    });

    // Modified query to include live matches regardless of date
    const matches = await Match.find({
      $or: [
        // Regular date-based matches within the selected timeframe
        { 
          utcDate: { 
            $gte: start.toISOString(), 
            $lte: end.toISOString() 
          }
        },
        // Include live matches from previous day that might still be ongoing
        {
          status: { 
            $in: ['IN_PLAY', 'HALFTIME', 'PAUSED', 'LIVE'] 
          },
          utcDate: { 
            $gte: subHours(start, 24).toISOString(), // Look back up to 24 hours for live matches
            $lt: start.toISOString() 
          }
        }
      ]
    }).sort({ utcDate: 1 });

    console.log('Found matches:', {
      count: matches.length,
      matchDates: matches.map(m => ({
        id: m.id,
        utcDate: m.utcDate,
        status: m.status
      }))
    });

    const [processedMatches, user] = await Promise.all([
      Promise.all(matches.map(async match => {
        const matchObj = match.toObject();
        const matchDate = new Date(match.utcDate);
        matchObj.localDate = addHours(matchDate, tzOffset);
        matchObj.voteCounts = match.votes;

        // Add fan prediction
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

        return matchObj;
      })),
      userId ? User.findById(userId, 'votes') : null
    ]);

    // Add user votes if user is logged in
    if (user) {
      processedMatches.forEach(match => {
        const userVote = user.votes.find(v => v.matchId === match.id);
        if (userVote) {
          match.userVote = userVote.vote;
        }
      });
    }

    res.json({ matches: processedMatches });
  } catch (error) {
    console.error('Error in matches route:', error);
    res.status(500).json({ 
      message: 'Error fetching matches', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
      return res.status(400).json({ 
        message: `Voting is not allowed for this match. Current status: ${match.status}` 
      });
    }

    // Handle vote recording for the match
    match.votes[vote]++;
    await match.save();

    // Handle user vote recording if user is authenticated
    if (userId) {
      try {
        await Promise.all([
          User.findOneAndUpdate(
            { _id: userId },
            { 
              $push: { 
                votes: { 
                  matchId, 
                  vote,
                  date: new Date() 
                } 
              },
              $inc: { totalVotes: 1 }
            },
            { runValidators: false }
          ),
          UserStatsCache.findOneAndUpdate(
            { userId },
            { $set: { lastUpdated: new Date(0) } }, // Force cache refresh
            { upsert: true }
          )
        ]);

        console.log(`Vote recorded successfully for user ${userId} on match ${matchId}`);
      } catch (userUpdateError) {
        console.error('Error updating user vote:', userUpdateError);
        // Even if user update fails, we don't want to roll back the match vote
        // Just log the error and continue
      }
    }

    res.json({
      message: 'Vote recorded successfully',
      votes: match.votes,
      userVote: vote
    });

  } catch (error) {
    console.error('Error recording vote:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
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

router.get('/live', async (req, res) => {
  try {
    // Fetch all matches that are currently live
    const liveMatches = await Match.find({
      status: { 
        $in: ['IN_PLAY', 'HALFTIME', 'PAUSED', 'LIVE']
      }
    });

    res.json({
      success: true,
      matches: liveMatches
    });
  } catch (error) {
    console.error('Error fetching live matches:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching live matches'
    });
  }
});






module.exports = router;
