const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const User = require('../models/User');
const FanPredictionStat = require('../models/FanPredictionStat');
const AIPredictionStat = require('../models/AIPredictionStat');
const auth = require('../middleware/auth');

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


router.get('/', async (req, res) => {
  const { date } = req.query;
  const userId = req.user ? req.user.id : null; // Get user ID if logged in
  const queryDate = new Date(date);
  queryDate.setUTCHours(0, 0, 0, 0);
  const nextDay = new Date(queryDate);
  nextDay.setUTCDate(queryDate.getUTCDate() + 1);
  const queryDateString = queryDate.toISOString().split('T')[0];
  const nextDayString = nextDay.toISOString().split('T')[0];

  try {
    const [matches, stats] = await Promise.all([
      Match.find({
        utcDate: {
          $gte: queryDateString,
          $lt: nextDayString
        }
      }),
      calculateAccuracy()
    ]);

    console.log(`Found ${matches.length} matches for date ${queryDateString}`);

    let userVotes = null;
    if (userId) {
      const user = await User.findById(userId, 'votes');
      userVotes = user ? user.votes : null;
    }

    // Define the order of statuses
    const statusOrder = ['IN_PLAY', 'HALFTIME', 'LIVE', 'TIMED', 'SCHEDULED', 'FINISHED'];

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

      // Check if the user has voted for this match
      if (userVotes) {
        const userVote = userVotes.find(v => v.matchId === match.id);
        if (userVote) {
          matchObj.userVote = userVote.vote;
        }
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
router.post('/:matchId/vote', auth, async (req, res) => {
  console.log('Vote route called, user:', req.user);

  try {
    const { matchId } = req.params;
    const { vote } = req.body;
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
    const hasVoted = match.voters.includes(userId);

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
      if (!hasVoted) {
        match.voters.push(userId);
      }
      user.votes.push({ matchId, vote });
      console.log(`Added new vote for user ${user.username} on match ${matchId}`);
    }

    user.totalVotes = user.votes.length;
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

    await Promise.all([user.save(), match.save()]);

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
