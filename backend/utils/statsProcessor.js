// utils/statsProcessor.js
const Match = require('../models/Match');
const FanPredictionStat = require('../models/FanPredictionStat');
const AIPredictionStat = require('../models/AIPredictionStat');
const AccuracyStats = require('../models/AccuracyStats');

async function recalculateAllStats() {
  try {
    console.log('Starting stats recalculation...');
    
    // Get or create stats documents
    const aiStat = await AIPredictionStat.findOne() || new AIPredictionStat();
    const fanStat = await FanPredictionStat.findOne() || new FanPredictionStat();

    // Find only matches after the most recent reset date
    const query = { 
      status: 'FINISHED',
      'score.fullTime': { $exists: true }
    };

    // Add date constraint based on reset dates
    if (aiStat.lastReset || fanStat.lastReset) {
      const latestReset = new Date(Math.max(
        aiStat.lastReset?.getTime() || 0,
        fanStat.lastReset?.getTime() || 0
      ));
      
      console.log('Using reset date for filtering:', latestReset);
      query.utcDate = { $gt: latestReset.toISOString() };
    }

    const matches = await Match.find(query).sort({ utcDate: 1 });
    
    // Initialize stats
    fanStat.totalPredictions = 0;
    fanStat.correctPredictions = 0;
    aiStat.totalPredictions = 0;
    aiStat.correctPredictions = 0;

    if (matches.length === 0) {
      console.log('No matches found after reset date');
      
      // Save empty stats
      await Promise.all([
        fanStat.save(),
        aiStat.save(),
        AccuracyStats.create({
          fanAccuracy: 0,
          aiAccuracy: 0,
          lastUpdated: new Date()
        })
      ]);

      return {
        fans: { total: 0, correct: 0, accuracy: '0%' },
        ai: { total: 0, correct: 0, accuracy: '0%' }
      };
    }

    console.log(`Found ${matches.length} matches after reset date to process`);

    // Process each match after reset
    for (const match of matches) {
      const actualWinner = match.score.winner || (
        match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' :
        match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW'
      );

      // Process fan prediction if has votes
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

        console.log(`Processed fan prediction for match ${match.id}:`, {
          matchDate: match.utcDate,
          prediction: fanPrediction,
          actual: actualWinner,
          correct: fanPrediction === actualWinner
        });
      }

      // Process AI prediction if exists
      if (match.aiPrediction) {
        aiStat.totalPredictions++;
        if (match.aiPrediction === actualWinner) {
          aiStat.correctPredictions++;
        }
        console.log(`Processed AI prediction for match ${match.id}:`, {
          matchDate: match.utcDate,
          prediction: match.aiPrediction,
          actual: actualWinner,
          correct: match.aiPrediction === actualWinner
        });
      }
    }

    // Calculate accuracies
    const fanAccuracy = fanStat.totalPredictions > 0 
      ? (fanStat.correctPredictions / fanStat.totalPredictions) * 100
      : 0;

    const aiAccuracy = aiStat.totalPredictions > 0
      ? (aiStat.correctPredictions / aiStat.totalPredictions) * 100
      : 0;

    console.log('New calculated stats:', {
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

    return {
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

  } catch (error) {
    console.error('Error in recalculateAllStats:', error);
    throw error;
  }
}

async function resetAllStats() {
  try {
    const resetTime = new Date();
    await Promise.all([
      FanPredictionStat.updateOne(
        {},
        { 
          totalPredictions: 0, 
          correctPredictions: 0,
          lastReset: resetTime 
        },
        { upsert: true }
      ),
      AIPredictionStat.updateOne(
        {},
        { 
          totalPredictions: 0, 
          correctPredictions: 0,
          lastReset: resetTime 
        },
        { upsert: true }
      ),
      // Create initial accuracy stats document with zeros
      AccuracyStats.create({
        fanAccuracy: 0,
        aiAccuracy: 0,
        lastUpdated: resetTime
      })
    ]);

    console.log('Stats reset successful at:', resetTime);
  } catch (error) {
    console.error('Error resetting stats:', error);
    throw error;
  }
}

// Make sure to export both functions
module.exports = {
  recalculateAllStats,
  resetAllStats
};