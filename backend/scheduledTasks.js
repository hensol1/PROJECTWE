// scheduledTasks.js
const cron = require('node-cron');
const Match = require('./models/Match');
const User = require('./models/User');
const { recalculateUserStats } = require('./utils/userStats');
const fetchMatches = require('./fetchMatches');
const FanPredictionStat = require('./models/FanPredictionStat');
const AIPredictionStat = require('./models/AIPredictionStat');
const AccuracyStats = require('./models/AccuracyStats');
const { recalculateAllStats } = require('./utils/statsProcessor');

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

// Schedule accuracy stats recalculation every hour
cron.schedule('0 * * * *', async () => {
  try {
    // Get the latest accuracy stats
    const lastAccuracyStats = await AccuracyStats.findOne().sort({ lastUpdated: -1 });
    const lastUpdate = lastAccuracyStats?.lastUpdated || new Date(0);
    
    // Only recalculate if it's been more than an hour since last update
    if (Date.now() - lastUpdate.getTime() > 60 * 60 * 1000) {
      console.log('Running scheduled accuracy recalculation');
      const stats = await recalculateAllStats();
      console.log('Accuracy stats updated:', stats);
    } else {
      console.log('Skipping accuracy recalculation - last update was too recent');
    }
  } catch (error) {
    console.error('Error in scheduled accuracy recalculation:', error);
  }
});

// Schedule user stats update every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('Running scheduled user stats update');
  updateUserStats().catch(error => {
    console.error('Error in scheduled user stats update:', error);
  });
});

module.exports = {
  updateUserStats
};