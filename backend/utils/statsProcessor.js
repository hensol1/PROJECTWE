// utils/statsProcessor.js
const Match = require('../models/Match');
const FanPredictionStat = require('../models/FanPredictionStat');
const AIPredictionStat = require('../models/AIPredictionStat');
const AccuracyStats = require('../models/AccuracyStats');

async function recalculateAllStats() {
  try {
    console.log('Starting stats recalculation...');
    
    // Get the last reset dates
    const aiStat = await AIPredictionStat.findOne() || new AIPredictionStat();
    const fanStat = await FanPredictionStat.findOne() || new FanPredictionStat();
    
    // Get all finished matches
    const matches = await Match.find({ 
      status: 'FINISHED',
      'score.fullTime': { $exists: true }
    }).sort({ utcDate: 1 });

    console.log(`Found ${matches.length} finished matches to process`);

    // Reset counters
    fanStat.totalPredictions = 0;
    fanStat.correctPredictions = 0;
    aiStat.totalPredictions = 0;
    aiStat.correctPredictions = 0;

    // Process each match
    for (const match of matches) {
      try {
        const matchDate = new Date(match.lastUpdated || match.utcDate);

        // Get actual winner
        const actualWinner = match.score.winner || (
          match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' :
          match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW'
        );

        // Process fan prediction if votes exist and no fan reset or match is after fan reset
        if (!fanStat.lastReset || matchDate > fanStat.lastReset) {
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
          }
        }

        // Process AI prediction if it exists and no AI reset or match is after AI reset
        if (match.aiPrediction && (!aiStat.lastReset || matchDate > aiStat.lastReset)) {
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

    console.log('Processing stats:', {
      ai: {
        total: aiStat.totalPredictions,
        correct: aiStat.correctPredictions,
        lastReset: aiStat.lastReset
      },
      fans: {
        total: fanStat.totalPredictions,
        correct: fanStat.correctPredictions,
        lastReset: fanStat.lastReset
      }
    });

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