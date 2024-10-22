// utils/statsProcessor.js
const Match = require('../models/Match');
const FanPredictionStat = require('../models/FanPredictionStat');
const AIPredictionStat = require('../models/AIPredictionStat');
const AccuracyStats = require('../models/AccuracyStats');

async function recalculateAllStats() {
  try {
    console.log('Starting stats recalculation...');
    
    // First reset all stats
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
          
          // Determine majority vote
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

    // Save stats to all relevant collections
    await Promise.all([
      fanStat.save(),
      aiStat.save(),
      // Update AccuracyStats collection
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
      // Also clear AccuracyStats
      AccuracyStats.deleteMany({})
    ]);
    console.log('Stats reset successful');
  } catch (error) {
    console.error('Error resetting stats:', error);
    throw error;
  }
}

module.exports = {
  recalculateAllStats,
  resetAllStats
};