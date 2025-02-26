const Match = require('../models/Match');
const AIPredictionStat = require('../models/AIPredictionStat');

async function recalculateStats() {
    const aiStats = await AIPredictionStat.findOne() || new AIPredictionStat();
    aiStats.totalPredictions = 0;
    aiStats.correctPredictions = 0;

    const matches = await Match.find({ 
        status: 'FINISHED',
        aiPrediction: { $exists: true }
    });

    for (const match of matches) {
        if (match.aiPrediction) {
            aiStats.totalPredictions++;
            
            const homeScore = match.score.fullTime.home;
            const awayScore = match.score.fullTime.away;
            const actualResult = homeScore > awayScore ? 'HOME_TEAM' : 
                                awayScore > homeScore ? 'AWAY_TEAM' : 'DRAW';
            
            if (match.aiPrediction === actualResult) {
                aiStats.correctPredictions++;
            }
        }
    }

    await aiStats.save();

    return {
        success: true,
        aiStats: {
            total: aiStats.totalPredictions,
            correct: aiStats.correctPredictions,
            accuracy: aiStats.totalPredictions > 0 
                ? (aiStats.correctPredictions / aiStats.totalPredictions * 100).toFixed(2)
                : 0
        }
    };
}

module.exports = {
    recalculateStats
};