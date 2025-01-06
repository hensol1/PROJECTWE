// backend/utils/userStats.js
const User = require('../models/User');
const Match = require('../models/Match');
const Vote = require('../models/Vote');
const calculateWilsonScore = require('./wilsonScore');

async function recalculateUserStats(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Get all votes for this user
  const votes = await Vote.find({ userId });
  const matchIds = votes.map(v => v.matchId);

  // Get all finished matches that this user voted on
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
  for (const vote of votes) {
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
      await vote.save();
      
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

async function processUserVoteForMatch(userId, matchId) {
  const [user, match, vote] = await Promise.all([
    User.findById(userId),
    Match.findOne({ id: matchId }),
    Vote.findOne({ userId, matchId })
  ]);
  
  if (!user || !match || !vote) {
    return null;
  }

  // Only process if match is finished
  if (match.status === 'FINISHED') {
    const actualResult = match.score.winner || 
      (match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' : 
       match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW');
    
    const userPrediction = 
      vote.vote === 'home' ? 'HOME_TEAM' :
      vote.vote === 'away' ? 'AWAY_TEAM' : 'DRAW';

    vote.isCorrect = userPrediction === actualResult;
    await vote.save();

    // Recalculate user stats
    await recalculateUserStats(userId);

    const updatedUser = await User.findById(userId);
    return {
      finishedVotes: updatedUser.finishedVotes,
      correctVotes: updatedUser.correctVotes,
      accuracy: updatedUser.accuracy,
      wilsonScore: updatedUser.wilsonScore
    };
  }

  return null;
}

module.exports = {
  processUserVoteForMatch,
  recalculateUserStats
};