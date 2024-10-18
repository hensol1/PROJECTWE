const User = require('../models/User');
const Match = require('../models/Match');
const calculateWilsonScore = require('./wilsonScore');

async function recalculateUserStats(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const votes = user.votes;
  let totalVotes = 0;
  let correctVotes = 0;
  let finishedVotes = 0;
  const leagueStats = {};

  for (const vote of votes) {
    const match = await Match.findOne({ id: vote.matchId });
    if (!match) continue;

    totalVotes++;
    if (match.status === 'FINISHED') {
      finishedVotes++;
      const actualResult = match.score.winner || 
        (match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' : 
         match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW');
      
      vote.isCorrect = (
        (vote.vote === 'home' && actualResult === 'HOME_TEAM') ||
        (vote.vote === 'away' && actualResult === 'AWAY_TEAM') ||
        (vote.vote === 'draw' && actualResult === 'DRAW')
      );

      if (vote.isCorrect) {
        correctVotes++;
      }

      // Update league stats
      if (!leagueStats[match.competition.id]) {
        leagueStats[match.competition.id] = {
          leagueId: match.competition.id,
          leagueName: match.competition.name,
          totalVotes: 0,
          correctVotes: 0
        };
      }
      leagueStats[match.competition.id].totalVotes++;
      if (vote.isCorrect) {
        leagueStats[match.competition.id].correctVotes++;
      }
    } else {
      vote.isCorrect = null;
    }
  }

  const wilsonScore = calculateWilsonScore(correctVotes, finishedVotes);

  const updatedUser = await User.findOneAndUpdate(
    { _id: userId },
    {
      $set: {
        totalVotes,
        finishedVotes,
        correctVotes,
        leagueStats: Object.values(leagueStats),
        wilsonScore,
        votes
      }
    },
    { new: true, runValidators: true }
  );

  return updatedUser;
}

async function safelyUpdateUser(userId, updateData) {
  const updatedUser = await User.findOneAndUpdate(
    { _id: userId },
    { $set: updateData },
    { new: true, runValidators: true }
  );
  return updatedUser;
}

module.exports = {
  recalculateUserStats,
  safelyUpdateUser
};