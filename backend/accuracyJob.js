const cron = require('node-cron');
const Match = require('./models/Match');
const AccuracyStats = require('./models/AccuracyStats');
const FanPredictionStat = require('./models/FanPredictionStat');
const AIPredictionStat = require('./models/AIPredictionStat');

const calculateAccuracy = async () => {
  const fanStat = await FanPredictionStat.findOne() || new FanPredictionStat();
  const aiStat = await AIPredictionStat.findOne() || new AIPredictionStat();
  
  fanStat.totalPredictions = 0;
  fanStat.correctPredictions = 0;
  aiStat.totalPredictions = 0;
  aiStat.correctPredictions = 0;

  const matches = await Match.find({ status: 'FINISHED' });

  for (const match of matches) {
    if (match.votes) {
      fanStat.totalPredictions += 1;
      const { home, draw, away } = match.votes;
      const fanPrediction = home > away ? 'HOME_TEAM' : (away > home ? 'AWAY_TEAM' : 'DRAW');

      let actualWinner;
      if (match.score.winner === null) {
        const { home: homeScore, away: awayScore } = match.score.fullTime;
        actualWinner = homeScore > awayScore ? 'HOME_TEAM' : (awayScore > homeScore ? 'AWAY_TEAM' : 'DRAW');
      } else {
        actualWinner = match.score.winner;
      }

      if (fanPrediction === actualWinner) {
        fanStat.correctPredictions += 1;
      }
    }

    if (match.aiPrediction) {
      aiStat.totalPredictions += 1;
      let actualWinner;
      if (match.score.winner === null) {
        const { home: homeScore, away: awayScore } = match.score.fullTime;
        actualWinner = homeScore > awayScore ? 'HOME_TEAM' : (awayScore > homeScore ? 'AWAY_TEAM' : 'DRAW');
      } else {
        actualWinner = match.score.winner;
      }

      if (match.aiPrediction === actualWinner) {
        aiStat.correctPredictions += 1;
      }
    }
  }

  await Promise.all([fanStat.save(), aiStat.save()]);

  const fanAccuracy = fanStat.totalPredictions > 0
    ? (fanStat.correctPredictions / fanStat.totalPredictions) * 100
    : 0;

  const aiAccuracy = aiStat.totalPredictions > 0
    ? (aiStat.correctPredictions / aiStat.totalPredictions) * 100
    : 0;

  await AccuracyStats.create({
    fanAccuracy,
    aiAccuracy,
    lastUpdated: new Date()
  });

  console.log('Accuracy stats updated');
};

// Run the job every hour
cron.schedule('0 * * * *', calculateAccuracy);

module.exports = { calculateAccuracy };