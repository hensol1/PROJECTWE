// scheduledTasks.js
const cron = require('node-cron');
const Match = require('./models/Match');
const User = require('./models/User');
const { recalculateUserStats } = require('./utils/userStats');
const fetchMatches = require('./fetchMatches');
const FanPredictionStat = require('./models/FanPredictionStat');
const AIPredictionStat = require('./models/AIPredictionStat');
const AccuracyStats = require('./models/AccuracyStats');

async function recalculateAllStats() {
  try {
    console.log('Starting stats recalculation...');
    
    // Reset stats
    await resetAllStats();

    // Get all finished matches
    const matches = await Match.find({ 
      status: 'FINISHED',
      'score.fullTime': { $exists: true }
    });

    console.log(`Found ${matches.length} finished matches to process`);

    // Get or create stats documents
    const fanStat = await FanPredictionStat.findOne() || new FanPredictionStat();
    const aiStat = await AIPredictionStat.findOne() || new AIPredictionStat();

    // Reset counters
    fanStat.totalPredictions = 0;
    fanStat.correctPredictions = 0;
    aiStat.totalPredictions = 0;
    aiStat.correctPredictions = 0;

    // Process each match
    for (const match of matches) {
      try {
        // Get actual winner
        const actualWinner = match.score.winner || (
          match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' :
          match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW'
        );

        // Process fan prediction if votes exist
        if (match.votes && (match.votes.home > 0 || match.votes.draw > 0 || match.votes.away > 0)) {
          fanStat.totalPredictions++;
          
          const maxVotes = Math.max(
            match.votes.home || 0,
            match.votes.draw || 0,
            match.votes.away || 0
          );
          
          const fanPrediction = 
            maxVotes === match.votes.home ? 'HOME_TEAM' :
            maxVotes === match.votes.away ? 'AWAY_TEAM' : 'DRAW';

          if (fanPrediction === actualWinner) {
            fanStat.correctPredictions++;
          }

          console.log(`Match ${match.id} - Fans predicted: ${fanPrediction}, Actual: ${actualWinner}`);
        }

        // Process AI prediction if it exists
        if (match.aiPrediction) {
          aiStat.totalPredictions++;
          if (match.aiPrediction === actualWinner) {
            aiStat.correctPredictions++;
          }
          console.log(`Match ${match.id} - AI predicted: ${match.aiPrediction}, Actual: ${actualWinner}`);
        }

        // Update user stats for this match
        const users = await User.find({ 'votes.matchId': match.id });
        for (const user of users) {
          try {
            const vote = user.votes.find(v => v.matchId === match.id);
            if (vote) {
              let userVoteResult = 
                vote.vote === 'home' ? 'HOME_TEAM' :
                vote.vote === 'away' ? 'AWAY_TEAM' : 'DRAW';
              
              vote.isCorrect = userVoteResult === actualWinner;
              await recalculateUserStats(user);
            }
          } catch (userError) {
            console.error(`Error processing user ${user._id} for match ${match.id}:`, userError);
          }
        }

      } catch (matchError) {
        console.error(`Error processing match ${match.id}:`, matchError);
      }
    }

    // Calculate accuracies
    const fanAccuracy = fanStat.totalPredictions > 0 
      ? (fanStat.correctPredictions / fanStat.totalPredictions) * 100
      : 0;

    const aiAccuracy = aiStat.totalPredictions > 0
      ? (aiStat.correctPredictions / aiStat.totalPredictions) * 100
      : 0;

    // Save all stats
    await Promise.all([
      fanStat.save(),
      aiStat.save(),
      AccuracyStats.create({
        fanAccuracy,
        aiAccuracy,
        lastUpdated: new Date()
      })
    ]);

    const stats = {
      fans: {
        total: fanStat.totalPredictions,
        correct: fanStat.correctPredictions,
        accuracy: fanAccuracy.toFixed(2) + '%'
      },
      ai: {
        total: aiStat.totalPredictions,
        correct: aiStat.correctPredictions,
        accuracy: aiAccuracy.toFixed(2) + '%'
      }
    };

    console.log('Final stats:', stats);
    return stats;

  } catch (error) {
    console.error('Error in recalculateAllStats:', error);
    throw error;
  }
}

async function resetAllStats() {
  try {
    await Promise.all([
      FanPredictionStat.updateOne(
        {},
        { totalPredictions: 0, correctPredictions: 0 },
        { upsert: true }
      ),
      AIPredictionStat.updateOne(
        {},
        { totalPredictions: 0, correctPredictions: 0 },
        { upsert: true }
      ),
      AccuracyStats.deleteMany({})
    ]);
    console.log('Stats reset successful');
  } catch (error) {
    console.error('Error resetting stats:', error);
    throw error;
  }
}

async function updateUserStats() {
  try {
    // Find only unprocessed finished matches
    const matches = await Match.find({ 
      status: 'FINISHED',
      processed: false
    });

    if (matches.length === 0) {
      return;
    }

    console.log(`Processing ${matches.length} unprocessed finished matches`);

    for (const match of matches) {
      // Find users who voted on this match
      const users = await User.find({ 'votes.matchId': match.id });
      console.log(`Found ${users.length} users who voted on match ${match.id}`);
      
      // Calculate actual match result
      const actualResult = match.score.winner || (
        match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' :
        match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW'
      );

      // Process each user who voted on this match
      for (const user of users) {
        // Find this user's vote for this match
        const vote = user.votes.find(v => v.matchId === match.id);
        if (vote) {
          // Convert user's vote to match result format
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
              votes: user.votes // Update all votes
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

// Scheduled tasks
// Run fetchMatches every 30 minutes during match hours
cron.schedule('*/30 12-23,0-2 * * *', () => {
  console.log('Scheduled task triggered: fetchMatches');
  fetchMatches().catch(error => {
    console.error('Error in fetchMatches:', error);
  });
});

// Run recalculateAllStats every hour
cron.schedule('*/15 * * * *', async () => {
  console.log('Scheduled task triggered: recalculateAllStats at:', new Date().toISOString());
  try {
    // Get the latest reset dates
    const aiStat = await AIPredictionStat.findOne();
    const fanStat = await FanPredictionStat.findOne();

    // Only recalculate if there are no reset dates or if it's been more than 5 minutes since reset
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if ((!aiStat?.lastReset && !fanStat?.lastReset) || 
        (aiStat?.lastReset < fiveMinutesAgo && fanStat?.lastReset < fiveMinutesAgo)) {
      const stats = await recalculateAllStats();
      console.log('Successfully updated accuracy stats:', stats);
    } else {
      console.log('Skipping recalculation due to recent reset');
    }
  } catch (error) {
    console.error('Error in scheduled recalculateAllStats:', error);
  }
});

// Run user stats update every 5 minutes
cron.schedule('*/15 * * * *', () => {
  console.log('Running user stats update');
  updateUserStats().catch(error => {
    console.error('Error in scheduled updateUserStats:', error);
  });
});


module.exports = {
  recalculateAllStats,
  resetAllStats
};