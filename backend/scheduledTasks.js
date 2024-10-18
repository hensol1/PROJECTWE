const cron = require('node-cron');
const Match = require('./models/Match');
const User = require('./models/User');
const { recalculateUserStats } = require('./utils/userStats');
const fetchMatches = require('./fetchMatches');

async function updateFinishedMatches() {
  console.log('Running scheduled task: updateFinishedMatches');
  try {
    // Find all matches that are finished but not processed
    const finishedMatches = await Match.find({ status: 'FINISHED', processed: { $ne: true } });

    for (const match of finishedMatches) {
      // Find all users who voted on this match
      const users = await User.find({ 'votes.matchId': match.id });

      for (const user of users) {
        await recalculateUserStats(user);
      }

      // Mark the match as processed
      match.processed = true;
      await match.save();
    }

    console.log(`Processed ${finishedMatches.length} finished matches`);
  } catch (error) {
    console.error('Error in updateFinishedMatches:', error);
  }
}

// Run the task every 15 minutes
cron.schedule('*/15 * * * *', updateFinishedMatches);

// Run updateFinishedMatches every 15 minutes
cron.schedule('*/15 * * * *', updateFinishedMatches);

// Run fetchMatches every 15 minutes from 12 PM to 2 AM
cron.schedule('*/15 12-23,0-2 * * *', () => {
  console.log('Running fetchMatches to update match data');
  fetchMatches().catch(error => {
    console.error('Error in fetchMatches:', error);
  });
});

module.exports = {
  updateFinishedMatches
};
