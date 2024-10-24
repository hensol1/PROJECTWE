// backend/utils/userStats.js
const User = require('../models/User');
const Match = require('../models/Match');
const calculateWilsonScore = require('./wilsonScore');

// Define the function before exporting it
async function processUserVoteForMatch(userId, matchId) {
  const user = await User.findById(userId);
  const match = await Match.findOne({ id: matchId });
  
  if (!user || !match) {
    return null;
  }

  const vote = user.votes.find(v => v.matchId === matchId);
  if (!vote) {
    return null;
  }

  // Only process if match is finished
  if (match.status === 'FINISHED') {
    const actualResult = match.score.winner || 
      (match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' : 
       match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW');
    
    vote.isCorrect = (
      (vote.vote === 'home' && actualResult === 'HOME_TEAM') ||
      (vote.vote === 'away' && actualResult === 'AWAY_TEAM') ||
      (vote.vote === 'draw' && actualResult === 'DRAW')
    );

    // Update user's total stats
    const finishedVotes = user.votes.filter(v => v.isCorrect !== null).length;
    const correctVotes = user.votes.filter(v => v.isCorrect === true).length;
    const accuracy = finishedVotes > 0 ? (correctVotes / finishedVotes) * 100 : 0;
    const wilsonScore = calculateWilsonScore(correctVotes, finishedVotes);

    await User.findByIdAndUpdate(userId, {
      $set: {
        finishedVotes,
        correctVotes,
        accuracy,
        wilsonScore,
        'votes.$[vote]': vote
      }
    }, {
      arrayFilters: [{ 'vote.matchId': matchId }],
      new: true
    });

    return { finishedVotes, correctVotes, accuracy, wilsonScore };
  }

  return null;
}

async function updateStatsForFinishedMatch(matchId) {
  const match = await Match.findOne({ 
    id: matchId, 
    status: 'FINISHED',
    processed: false 
  });

  if (!match) return;

  // Get all users who voted on this match
  const users = await User.find({ 'votes.matchId': matchId });
  
  // Process each user's vote
  const updatePromises = users.map(user => processUserVoteForMatch(user._id, matchId));
  await Promise.all(updatePromises);

  // Mark match as processed
  match.processed = true;
  await match.save();
}

async function recalculateUserStats(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Get all finished matches that this user voted on
  const matchIds = user.votes.map(v => v.matchId);
  const matches = await Match.find({
    id: { $in: matchIds },
    status: 'FINISHED'
  });

  // Create a map of matches for quick lookup
  const matchesMap = matches.reduce((acc, match) => {
    acc[match.id] = match;
    return acc;
  }, {});

  // Reset user stats
  let finishedVotes = 0;
  let correctVotes = 0;
  const leagueStats = {};

  // Process each vote
  for (const vote of user.votes) {
    const match = matchesMap[vote.matchId];
    if (match && match.status === 'FINISHED') {
      finishedVotes++;

      const actualResult = match.score.winner || (
        match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' :
        match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW'
      );

      const userPrediction = 
        vote.vote === 'home' ? 'HOME_TEAM' :
        vote.vote === 'away' ? 'AWAY_TEAM' : 'DRAW';

      vote.isCorrect = userPrediction === actualResult;
      
      if (vote.isCorrect) {
        correctVotes++;
      }

      // Update league stats
      const leagueId = match.competition.id.toString();
      if (!leagueStats[leagueId]) {
        leagueStats[leagueId] = {
          leagueId,
          leagueName: match.competition.name,
          totalVotes: 0,
          correctVotes: 0
        };
      }
      leagueStats[leagueId].totalVotes++;
      if (vote.isCorrect) {
        leagueStats[leagueId].correctVotes++;
      }
    }
  }

  // Calculate Wilson score
  const wilsonScore = calculateWilsonScore(correctVotes, finishedVotes);

  // Update user document
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        votes: user.votes,
        finishedVotes,
        correctVotes,
        wilsonScore,
        leagueStats: Object.values(leagueStats)
      }
    },
    { new: true }
  );

  return updatedUser;
}

// Export all functions after they're defined
module.exports = {
  processUserVoteForMatch,
  updateStatsForFinishedMatch,
  recalculateUserStats
};