const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const User = require('../models/User');
const FanPredictionStat = require('../models/FanPredictionStat');
const auth = require('../middleware/auth');

// Updated function to update fan prediction accuracy
const updateFanAccuracy = async (match) => {
  console.log(`Updating fan accuracy for match ${match.id}`);
  console.log(`Match status: ${match.status}`);
  console.log(`Match votes:`, match.votes);
  console.log(`Match score:`, match.score);

  if (match.status === 'FINISHED' && match.votes) {
    const stat = await FanPredictionStat.findOne() || new FanPredictionStat();
    
    stat.totalPredictions += 1;
    
    const { home, draw, away } = match.votes;
    const fanPrediction = home > away ? 'HOME_TEAM' : (away > home ? 'AWAY_TEAM' : 'DRAW');
    
    console.log(`Fan prediction: ${fanPrediction}`);

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

    console.log(`Actual winner: ${actualWinner}`);

    if (fanPrediction === actualWinner) {
      stat.correctPredictions += 1;
      console.log('Prediction was correct');
    } else {
      console.log('Prediction was incorrect');
    }
    
    await stat.save();
    
    match.fanPredictionProcessed = true;
    await match.save();

    console.log(`Updated fan accuracy. Total: ${stat.totalPredictions}, Correct: ${stat.correctPredictions}`);
  } else {
    console.log('Match not eligible for fan accuracy update');
  }
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
    // Reset FanPredictionStat
    await FanPredictionStat.deleteMany({});
    
    const matches = await Match.find().sort({ 'competition.name': 1, utcDate: 1 });

    console.log(`Found ${matches.length} total matches`);

    // Update fan accuracy for all finished matches
    for (const match of matches) {
      if (match.status === 'FINISHED') {
        await updateFanAccuracy(match);
      }
    }

    // Fetch matches for the specific date
    const dateMatches = matches.filter(match => {
      const matchDate = new Date(match.utcDate);
      return matchDate >= queryDate && matchDate < nextDay;
    });

    console.log(`Found ${dateMatches.length} matches for date ${queryDateString}`);

    // Fetch the latest cumulative fan accuracy
    const stat = await FanPredictionStat.findOne();
    const fanAccuracy = stat && stat.totalPredictions > 0
      ? (stat.correctPredictions / stat.totalPredictions) * 100
      : 0;

    console.log('Fan Accuracy Stats:', {
      totalPredictions: stat ? stat.totalPredictions : 0,
      correctPredictions: stat ? stat.correctPredictions : 0,
      fanAccuracy
    });

    res.json({ 
      matches: dateMatches, 
      fanAccuracy, 
      totalPredictions: stat ? stat.totalPredictions : 0,
      correctPredictions: stat ? stat.correctPredictions : 0
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

router.post('/recalculate-fan-accuracy', async (req, res) => {
  try {
    const matches = await Match.find({ status: 'FINISHED' });
    let totalPredictions = 0;
    let correctPredictions = 0;

    for (const match of matches) {
      if (match.votes) {
        totalPredictions++;
        const { home, draw, away } = match.votes;
        const fanPrediction = home > away ? 'HOME_TEAM' : (away > home ? 'AWAY_TEAM' : 'DRAW');
        
        let actualWinner = match.score.winner;
        if (actualWinner === null) {
          const { home: homeScore, away: awayScore } = match.score.fullTime;
          if (homeScore > awayScore) {
            actualWinner = 'HOME_TEAM';
          } else if (awayScore > homeScore) {
            actualWinner = 'AWAY_TEAM';
          } else {
            actualWinner = 'DRAW';
          }
        }

        if (fanPrediction === actualWinner) {
          correctPredictions++;
        }

        match.fanPredictionProcessed = true;
        await match.save();
      }
    }

    const stat = await FanPredictionStat.findOne() || new FanPredictionStat();
    stat.totalPredictions = totalPredictions;
    stat.correctPredictions = correctPredictions;
    await stat.save();

    res.json({ 
      message: 'Fan accuracy recalculated', 
      totalPredictions, 
      correctPredictions,
      accuracy: totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0
    });
  } catch (error) {
    console.error('Error recalculating fan accuracy:', error);
    res.status(500).json({ message: 'Error recalculating fan accuracy', error: error.message });
  }
});


module.exports = router;
module.exports = router;