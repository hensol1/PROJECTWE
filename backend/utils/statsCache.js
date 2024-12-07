const User = require('../models/User');
const Match = require('../models/Match');
const UserStatsCache = require('../models/UserStatsCache');

async function updateUserStatsCache(userId) {
  console.log('Starting updateUserStatsCache for user:', userId);
  try {
    const user = await User.findById(userId)
      .select('votes totalVotes finishedVotes correctVotes');
    
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

    // Prepare vote history and calculate league stats simultaneously
    const leagueStatsMap = new Map();
    
    const voteHistory = user.votes
      .map(vote => {
        const match = matchesMap[vote.matchId];
        if (!match) return null;

        // Calculate actual result for finished matches
        let isCorrect = null;
        if (match.status === 'FINISHED' && match.score.fullTime) {
          const homeScore = match.score.fullTime.home;
          const awayScore = match.score.fullTime.away;
          const actualResult = homeScore > awayScore ? 'home' : 
                             awayScore > homeScore ? 'away' : 'draw';
          isCorrect = vote.vote === actualResult;
        }

        // Update league stats if the match is finished
        if (match.status === 'FINISHED' && match.score.fullTime) {
          const leagueId = match.competition.id;
          const currentStats = leagueStatsMap.get(leagueId) || {
            leagueId: match.competition.id,
            leagueName: match.competition.name,
            leagueEmblem: match.competition.emblem,
            totalVotes: 0,
            correctVotes: 0
          };

          currentStats.totalVotes++;
          if (isCorrect) {
            currentStats.correctVotes++;
          }
          leagueStatsMap.set(leagueId, currentStats);
        }

        return {
          matchId: vote.matchId,
          vote: vote.vote,
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          score: match.score.fullTime,
          date: match.utcDate,
          status: match.status,
          isCorrect,
          competition: {
            name: match.competition.name,
            emblem: match.competition.emblem,
            id: match.competition.id
          }
        };
      })
      .filter(v => v !== null);

    // Convert league stats map to array and calculate accuracy
    const leagueStats = Array.from(leagueStatsMap.values())
      .map(league => ({
        ...league,
        accuracy: (league.correctVotes / league.totalVotes) * 100
      }))
      .filter(league => league.totalVotes > 0) // Only include leagues with votes
      .sort((a, b) => b.accuracy - a.accuracy); // Sort by accuracy descending

    console.log('Prepared vote history and league stats, updating cache...');

    // Create or update cache
    const cacheData = {
      userId,
      totalVotes: user.totalVotes,
      finishedVotes: user.finishedVotes,
      correctVotes: user.correctVotes,
      leagueStats,
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
