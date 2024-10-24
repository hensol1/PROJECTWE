// utils/statsProcessor.js
const Match = require('../models/Match');
const FanPredictionStat = require('../models/FanPredictionStat');
const AIPredictionStat = require('../models/AIPredictionStat');
const AccuracyStats = require('../models/AccuracyStats');

async function recalculateAllStats() {
  try {
    console.log('Starting stats recalculation...');
    
    // Get existing stats
    const aiStat = await AIPredictionStat.findOne() || new AIPredictionStat();
    const fanStat = await FanPredictionStat.findOne() || new FanPredictionStat();

    // Find only matches after the most recent reset date
    const query = { 
      status: 'FINISHED',
      'score.fullTime': { $exists: true }
    };

    // Add date constraint based on reset dates
    if (aiStat.lastReset || fanStat.lastReset) {
      // Use the most recent reset date
      const latestReset = new Date(Math.max(
        aiStat.lastReset?.getTime() || 0,
        fanStat.lastReset?.getTime() || 0
      ));
      
      console.log('Using reset date for filtering:', latestReset);
      query.utcDate = { $gt: latestReset.toISOString() };
    }

    const matches = await Match.find(query).sort({ utcDate: 1 });
    
    if (matches.length === 0) {
      console.log('No matches found after reset date');
      return {
        fans: {
          total: fanStat.totalPredictions,
          correct: fanStat.correctPredictions,
          accuracy: fanStat.totalPredictions > 0 
            ? (fanStat.correctPredictions / fanStat.totalPredictions * 100).toFixed(2) + '%'
            : '0%'
        },
        ai: {
          total: aiStat.totalPredictions,
          correct: aiStat.correctPredictions,
          accuracy: aiStat.totalPredictions > 0 
            ? (aiStat.correctPredictions / aiStat.totalPredictions * 100).toFixed(2) + '%'
            : '0%'
        }
      };
    }

    console.log(`Found ${matches.length} matches after reset date to process`);

    // Process each match after reset
    for (const match of matches) {
      const actualWinner = match.score.winner || (
        match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' :
        match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW'
      );

      // Process fan prediction
      if (!fanStat.lastReset || new Date(match.utcDate) > fanStat.lastReset) {
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
      }

      // Process AI prediction
      if (match.aiPrediction && (!aiStat.lastReset || new Date(match.utcDate) > aiStat.lastReset)) {
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
        accuracy: fanAccuracy.toFixed(2) + '%',
        lastReset: fanStat.lastReset
      },
      ai: {
        total: aiStat.totalPredictions,
        correct: aiStat.correctPredictions,
        accuracy: aiAccuracy.toFixed(2) + '%',
        lastReset: aiStat.lastReset
      }
    });

    // Save updated stats
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
