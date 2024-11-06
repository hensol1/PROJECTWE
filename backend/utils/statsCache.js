// backend/utils/statsCache.js

const User = require('../models/User');
const Match = require('../models/Match');
const UserStatsCache = require('../models/UserStatsCache');

async function updateUserStatsCache(userId) {
  console.log('Starting updateUserStatsCache for user:', userId);
  try {
    const user = await User.findById(userId)
      .select('votes totalVotes finishedVotes correctVotes leagueStats');
    
    if (!user) {
      console.log('User not found:', userId);
      throw new Error('User not found');
    }

    console.log('Found user, fetching matches...');
    
    // Fetch all relevant matches in one query
    const matchIds = user.votes.map(v => v.matchId);
    const matches = await Match.find({ id: { $in: matchIds } });
    console.log('Found matches:', matches.length);

    const matchesMap = matches.reduce((acc, match) => {
      acc[match.id] = match;
      return acc;
    }, {});

    // Prepare vote history
    const voteHistory = user.votes
      .map(vote => {
        const match = matchesMap[vote.matchId];
        if (!match) return null;

        return {
          matchId: vote.matchId,
          vote: vote.vote,
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          score: match.score.fullTime,
          date: match.utcDate,
          status: match.status,
          isCorrect: vote.isCorrect,
          competition: {
            name: match.competition.name,
            emblem: match.competition.emblem,
            id: match.competition.id
          }
        };
      })
      .filter(v => v !== null);

    console.log('Prepared vote history, updating cache...');

    // Create or update cache
    const cacheData = {
      userId,
      totalVotes: user.totalVotes,
      finishedVotes: user.finishedVotes,
      correctVotes: user.correctVotes,
      leagueStats: user.leagueStats,
      voteHistory,
      lastUpdated: new Date()
    };

    await UserStatsCache.findOneAndUpdate(
      { userId },
      cacheData,
      { upsert: true, new: true }
    );

    console.log('Cache update complete');
  } catch (error) {
    console.error('Error in updateUserStatsCache:', error);
    throw error;
  }
}

module.exports = {
  updateUserStatsCache
};