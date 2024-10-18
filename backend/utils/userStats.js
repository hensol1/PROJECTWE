const User = require('../models/User');
const Match = require('../models/Match');
const calculateWilsonScore = require('./wilsonScore');

async function recalculateUserStats(user) {
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

  user.totalVotes = totalVotes;
  user.finishedVotes = finishedVotes;
  user.correctVotes = correctVotes;
  user.leagueStats = Object.values(leagueStats);

  // Recalculate Wilson score based on finished votes only
  const wilsonScore = calculateWilsonScore(correctVotes, finishedVotes);
  user.wilsonScore = wilsonScore;

  user.increment();
  await user.save({ validateBeforeSave: false });

  return user;
}

module.exports = {
  recalculateUserStats
};