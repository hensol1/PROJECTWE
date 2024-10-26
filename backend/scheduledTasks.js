const cron = require('node-cron');
const { startOfDay } = require('date-fns');
const Match = require('./models/Match');
const User = require('./models/User');
const { recalculateUserStats } = require('./utils/userStats');
const fetchMatches = require('./fetchMatches');
const FanPredictionStat = require('./models/FanPredictionStat');
const AIPredictionStat = require('./models/AIPredictionStat');
const AccuracyStats = require('./models/AccuracyStats');
const { recalculateAllStats } = require('./utils/statsProcessor');
const { startOfDay, endOfDay, parseISO, addDays, format } = require('date-fns');
const { zonedTimeToUtc, utcToZonedTime } = require('date-fns-tz');

async function updateDailyPredictionStats() {
  try {
    // Get matches for multiple time zones to ensure coverage
    const timeZones = ['UTC', 'Europe/London', 'Asia/Jerusalem', 'America/New_York'];
    let allTodayMatches = new Set();

    for (const timeZone of timeZones) {
      const now = new Date();
      const localDate = utcToZonedTime(now, timeZone);
      const todayStart = zonedTimeToUtc(startOfDay(localDate), timeZone);
      const todayEnd = zonedTimeToUtc(endOfDay(localDate), timeZone);

      console.log(`Checking matches for timezone ${timeZone}:`, {
        localDate: format(localDate, 'yyyy-MM-dd HH:mm:ss'),
        startTime: todayStart.toISOString(),
        endTime: todayEnd.toISOString()
      });

      const matches = await Match.find({
        status: 'FINISHED',
        utcDate: {
          $gte: todayStart.toISOString(),
          $lte: todayEnd.toISOString()
        }
      });

      matches.forEach(match => allTodayMatches.add(match.id));
    }

    // Get all unique matches found
    const todayMatches = await Match.find({
      id: { $in: Array.from(allTodayMatches) },
      status: 'FINISHED'
    });

    console.log(`Found ${todayMatches.length} unique finished matches for today`);
    
    // Log sample matches for verification
    if (todayMatches.length > 0) {
      console.log('Sample matches:', todayMatches.slice(0, 3).map(match => ({
        id: match.id,
        date: match.utcDate,
        teams: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
        score: match.score.fullTime
      })));
    }

    // Initialize stats
    const stats = {
      ai: { total: 0, correct: 0 },
      fans: { total: 0, correct: 0 }
    };

    // Process matches
    todayMatches.forEach(match => {
      // Process AI prediction
      if (match.aiPrediction) {
        stats.ai.total++;
        const homeScore = match.score.fullTime.home;
        const awayScore = match.score.fullTime.away;
        let actualResult = homeScore > awayScore ? 'HOME_TEAM' : (awayScore > homeScore ? 'AWAY_TEAM' : 'DRAW');
        if (match.aiPrediction === actualResult) {
          stats.ai.correct++;
        }
      }

      // Process Fan predictions
      const { home = 0, draw = 0, away = 0 } = match.votes || {};
      const totalVotes = home + draw + away;
      if (totalVotes > 0) {
        const maxVotes = Math.max(home, draw, away);
        let fanPrediction;
        if (home === maxVotes) fanPrediction = 'HOME_TEAM';
        else if (away === maxVotes) fanPrediction = 'AWAY_TEAM';
        else fanPrediction = 'DRAW';

        stats.fans.total++;
        const homeScore = match.score.fullTime.home;
        const awayScore = match.score.fullTime.away;
        let actualResult = homeScore > awayScore ? 'HOME_TEAM' : (awayScore > homeScore ? 'AWAY_TEAM' : 'DRAW');
        if (fanPrediction === actualResult) {
          stats.fans.correct++;
        }
      }
    });

    console.log('Calculated stats:', {
      date: new Date().toISOString(),
      stats,
      matchCount: todayMatches.length
    });

    // Update stats in database
    const [aiStats, fanStats] = await Promise.all([
      AIPredictionStat.findOne(),
      FanPredictionStat.findOne()
    ]);

    // Function to update stats for a specific prediction type
    const updateStatsForType = async (stats, todayStats, type) => {
      // Find or create today's stats for each timezone
      for (const timeZone of timeZones) {
        const localDate = utcToZonedTime(new Date(), timeZone);
        const localToday = startOfDay(localDate);
        
        let zoneDayStats = todayStats.dailyStats.find(stat => 
          startOfDay(utcToZonedTime(new Date(stat.date), timeZone)).getTime() === localToday.getTime()
        );

        if (!zoneDayStats) {
          todayStats.dailyStats.push({
            date: zonedTimeToUtc(localToday, timeZone),
            totalPredictions: stats[type].total,
            correctPredictions: stats[type].correct
          });
        } else {
          zoneDayStats.totalPredictions = stats[type].total;
          zoneDayStats.correctPredictions = stats[type].correct;
        }
      }
      
      await todayStats.save();
    };

    if (aiStats) {
      await updateStatsForType(stats, aiStats, 'ai');
    }

    if (fanStats) {
      await updateStatsForType(stats, fanStats, 'fans');
    }

    console.log('Daily stats updated successfully for all timezones');
  } catch (error) {
    console.error('Error updating daily prediction stats:', error);
  }
}

async function updateUserStats() {
  try {
    const matches = await Match.find({ 
      status: 'FINISHED',
      processed: false
    });

    if (matches.length === 0) {
      console.log('No new matches to process for user stats');
      return;
    }

    console.log(`Processing ${matches.length} new finished matches for user stats`);

    for (const match of matches) {
      // Find users who voted on this match
      const users = await User.find({ 'votes.matchId': match.id });
      console.log(`Found ${users.length} users who voted on match ${match.id}`);
      
      const actualResult = match.score.winner || (
        match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' :
        match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW'
      );

      // Process each user who voted on this match
      for (const user of users) {
        const vote = user.votes.find(v => v.matchId === match.id);
        if (vote) {
          const userPrediction = 
            vote.vote === 'home' ? 'HOME_TEAM' :
            vote.vote === 'away' ? 'AWAY_TEAM' : 'DRAW';

          // Update vote correctness
          vote.isCorrect = userPrediction === actualResult;

          // Recalculate user's total stats
          const allUserVotes = await Match.find({
            id: { $in: user.votes.map(v => v.matchId) },
            status: 'FINISHED'
          });

          const finishedVotes = allUserVotes.length;
          const correctVotes = allUserVotes.reduce((count, match) => {
            const vote = user.votes.find(v => v.matchId === match.id);
            if (!vote) return count;

            const matchResult = match.score.winner || (
              match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' :
              match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW'
            );
            const userPred = 
              vote.vote === 'home' ? 'HOME_TEAM' :
              vote.vote === 'away' ? 'AWAY_TEAM' : 'DRAW';

            return count + (matchResult === userPred ? 1 : 0);
          }, 0);

          // Calculate Wilson score
          const n = finishedVotes;
          const p = n > 0 ? correctVotes / n : 0;
          const z = 1.96;
          const zsqr = z * z;
          const wilsonScore = n > 0 ? 
            (p + zsqr/(2*n) - z * Math.sqrt((p*(1-p) + zsqr/(4*n))/n))/(1 + zsqr/n) : 0;

          // Update user document
          await User.findByIdAndUpdate(user._id, {
            $set: {
              finishedVotes,
              correctVotes,
              accuracy: n > 0 ? (correctVotes / n * 100) : 0,
              wilsonScore,
              votes: user.votes
            }
          });

          console.log(`Updated stats for user ${user.username}: ${correctVotes}/${finishedVotes} correct`);
        }
      }

      // Mark match as processed
      match.processed = true;
      await match.save();
      console.log(`Marked match ${match.id} as processed`);
    }
  } catch (error) {
    console.error('Error in updateUserStats:', error);
  }
}

// Schedule match fetching every 15 minutes (at XX:01, XX:16, XX:31, XX:46) during match hours
cron.schedule('1,16,31,46 12-23,0-2 * * *', () => {
  console.log('Scheduled task triggered: fetchMatches');
  fetchMatches().catch(error => {
    console.error('Error in fetchMatches:', error);
  });
});

// Additional run at 09:00
cron.schedule('0 9 * * *', () => {
  console.log('Scheduled task triggered: fetchMatches (morning run)');
  fetchMatches().catch(error => {
    console.error('Error in fetchMatches:', error);
  });
});

// Check for finished matches and update stats every 2 minutes
cron.schedule('*/2 * * * *', async () => {
  try {
    console.log('Checking for finished matches...');
    await updateDailyPredictionStats();
    await updateUserStats();
  } catch (error) {
    console.error('Error in finished matches check:', error);
  }
});

// Reset daily stats at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Starting daily stats reset...');
    const today = startOfDay(new Date());
    
    // Initialize new day's stats in both collections
    await Promise.all([
      AIPredictionStat.findOneAndUpdate(
        {},
        {
          $push: {
            dailyStats: {
              date: today,
              totalPredictions: 0,
              correctPredictions: 0
            }
          }
        },
        { upsert: true }
      ),
      FanPredictionStat.findOneAndUpdate(
        {},
        {
          $push: {
            dailyStats: {
              date: today,
              totalPredictions: 0,
              correctPredictions: 0
            }
          }
        },
        { upsert: true }
      )
    ]);
    
    console.log('Daily stats reset completed');
  } catch (error) {
    console.error('Error in daily stats reset:', error);
  }
});

// Accuracy stats recalculation
cron.schedule('*/10 * * * *', async () => {
  try {
    const lastAccuracyStats = await AccuracyStats.findOne().sort({ lastUpdated: -1 });
    const lastUpdate = lastAccuracyStats?.lastUpdated || new Date(0);
    
    if (Date.now() - lastUpdate.getTime() > 10 * 60 * 1000) {
      console.log('Running scheduled accuracy recalculation');
      const stats = await recalculateAllStats();
      console.log('Accuracy stats updated:', stats);
    }
  } catch (error) {
    console.error('Error in scheduled accuracy recalculation:', error);
  }
});

module.exports = {
  updateUserStats,
  updateDailyPredictionStats
};