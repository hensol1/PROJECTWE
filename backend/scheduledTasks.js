const cron = require('node-cron');
const { startOfDay, endOfDay } = require('date-fns');
const Match = require('./models/Match');
const User = require('./models/User');
const { recalculateUserStats } = require('./utils/userStats');
const { processMatchesForDate } = require('./fetchMatches');
const FanPredictionStat = require('./models/FanPredictionStat');
const AIPredictionStat = require('./models/AIPredictionStat');
const AccuracyStats = require('./models/AccuracyStats');
const { recalculateAllStats } = require('./utils/statsProcessor');

// Helper to check if time is within match hours (12:00 - 02:59)
const isMatchHour = () => {
    const hour = new Date().getHours();
    return (hour >= 12 && hour <= 23) || (hour >= 0 && hour <= 2);
};

const cleanup = async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await UserStatsCache.deleteMany({ lastUpdated: { $lt: thirtyDaysAgo } });
};

async function updateDailyPredictionStats() {
    try {
        const today = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());

        console.log('Processing matches for date range:', {
            start: today.toISOString(),
            end: todayEnd.toISOString()
        });

        const todayMatches = await Match.find({
            status: 'FINISHED',
            utcDate: {
                $gte: today.toISOString(),
                $lte: todayEnd.toISOString()
            }
        });

        console.log(`Found ${todayMatches.length} finished matches for today`);

        const stats = {
            ai: { total: 0, correct: 0 },
            fans: { total: 0, correct: 0 }
        };

        todayMatches.forEach(match => {
            console.log('Processing match:', {
                id: match.id,
                date: match.utcDate,
                teams: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
                score: match.score.fullTime
            });

            if (match.aiPrediction) {
                stats.ai.total++;
                const homeScore = match.score.fullTime.home;
                const awayScore = match.score.fullTime.away;
                let actualResult = homeScore > awayScore ? 'HOME_TEAM' : (awayScore > homeScore ? 'AWAY_TEAM' : 'DRAW');
                if (match.aiPrediction === actualResult) {
                    stats.ai.correct++;
                }
            }

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

        console.log('Today\'s stats calculated:', stats);

        const [aiStats, fanStats] = await Promise.all([
            AIPredictionStat.findOne(),
            FanPredictionStat.findOne()
        ]);

        if (aiStats) {
            let todayAiStats = aiStats.dailyStats.find(
                stat => startOfDay(new Date(stat.date)).getTime() === today.getTime()
            );

            if (todayAiStats) {
                todayAiStats.totalPredictions = stats.ai.total;
                todayAiStats.correctPredictions = stats.ai.correct;
            } else {
                aiStats.dailyStats.push({
                    date: today,
                    totalPredictions: stats.ai.total,
                    correctPredictions: stats.ai.correct
                });
            }
            await aiStats.save();
        }

        if (fanStats) {
            let todayFanStats = fanStats.dailyStats.find(
                stat => startOfDay(new Date(stat.date)).getTime() === today.getTime()
            );

            if (todayFanStats) {
                todayFanStats.totalPredictions = stats.fans.total;
                todayFanStats.correctPredictions = stats.fans.correct;
            } else {
                fanStats.dailyStats.push({
                    date: today,
                    totalPredictions: stats.fans.total,
                    correctPredictions: stats.fans.correct
                });
            }
            await fanStats.save();
        }

        const verifyStats = await FanPredictionStat.findOne();
        const todayFanStats = verifyStats?.dailyStats?.find(
            stat => startOfDay(new Date(stat.date)).getTime() === today.getTime()
        );
        
        console.log('Verification - Today\'s stats in database:', {
            date: today.toISOString(),
            stats: todayFanStats
        });

        return stats;
    } catch (error) {
        console.error('Error updating daily prediction stats:', error);
        throw error;
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
            const users = await User.find({ 'votes.matchId': match.id });
            console.log(`Found ${users.length} users who voted on match ${match.id}`);
            
            const actualResult = match.score.winner || (
                match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' :
                match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW'
            );

            for (const user of users) {
                const vote = user.votes.find(v => v.matchId === match.id);
                if (vote) {
                    const userPrediction = 
                        vote.vote === 'home' ? 'HOME_TEAM' :
                        vote.vote === 'away' ? 'AWAY_TEAM' : 'DRAW';

                    vote.isCorrect = userPrediction === actualResult;

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

                    const n = finishedVotes;
                    const p = n > 0 ? correctVotes / n : 0;
                    const z = 1.96;
                    const zsqr = z * z;
                    const wilsonScore = n > 0 ? 
                        (p + zsqr/(2*n) - z * Math.sqrt((p*(1-p) + zsqr/(4*n))/n))/(1 + zsqr/n) : 0;

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

            match.processed = true;
            await match.save();
            console.log(`Marked match ${match.id} as processed`);
        }
    } catch (error) {
        console.error('Error in updateUserStats:', error);
    }
}

// Main match fetching function
async function handleMatchFetching() {
    if (!isMatchHour()) {
        console.log('Outside match hours, skipping fetch');
        return;
    }

    console.log(`Starting scheduled match fetch at ${new Date().toISOString()}`);
    try {
        const currentDate = new Date();
        const results = await processMatchesForDate(currentDate);
        
        // Also fetch next day's matches during late hours
        if (currentDate.getHours() >= 22) {
            const tomorrow = new Date(currentDate);
            tomorrow.setDate(tomorrow.getDate() + 1);
            await processMatchesForDate(tomorrow);
        }

        console.log('Match fetching completed:', {
            timestamp: new Date().toISOString(),
            results
        });
    } catch (error) {
        console.error('Error in match fetching:', {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack
        });
    }
}

// Schedule match fetching every 15 minutes
const matchFetchingJob = cron.schedule('*/15 * * * *', async () => {
    if (isMatchHour()) {
        console.log('Scheduled task triggered: fetchMatches');
        await handleMatchFetching().catch(error => {
            console.error('Error in fetchMatches:', error);
        });
    }
}, {
    scheduled: true,
    timezone: "UTC"
});

// Check for finished matches and update stats every 2 minutes
const statsUpdateJob = cron.schedule('*/2 * * * *', async () => {
    try {
        console.log('Starting scheduled task: Check finished matches');
        const stats = await updateDailyPredictionStats();
        console.log('Daily stats update completed:', stats);
        
        await updateUserStats();
        console.log('User stats update completed');
    } catch (error) {
        console.error('Error in scheduled task:', {
            message: error.message,
            stack: error.stack
        });
    }
});

// Reset daily stats at midnight
const dailyResetJob = cron.schedule('0 0 * * *', async () => {
    try {
        console.log('Starting daily stats reset...');
        const today = startOfDay(new Date());
        
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
const accuracyStatsJob = cron.schedule('*/10 * * * *', async () => {
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

// Error handling for the cron jobs
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Attempt to restart the jobs
    matchFetchingJob.start();
    statsUpdateJob.start();
    dailyResetJob.start();
    accuracyStatsJob.start();
});

module.exports = {
    matchFetchingJob,
    statsUpdateJob,
    dailyResetJob,
    accuracyStatsJob,
    updateUserStats,
    updateDailyPredictionStats,
    handleMatchFetching
};