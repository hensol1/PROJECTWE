const cron = require('node-cron');
const { startOfDay, endOfDay, parseISO, differenceInMinutes, subHours, addHours } = require('date-fns');
const Match = require('./models/Match');
const { processMatchesForDate, hasActiveMatches, getNextScheduledMatch, ACTIVE_STATUSES } = require('./fetchMatches');
const AIPredictionStat = require('./models/AIPredictionStat');
const AccuracyStats = require('./models/AccuracyStats');
const { fetchAndStoreEvents } = require('./fetchEvents');
const { fetchAndStoreAllLiveEvents } = require('./fetchEvents');
const { processStandings, ALLOWED_LEAGUE_IDS, getCurrentSeason, cleanup: mongoCleanup } = require('./fetchStandings');
const { recalculateStats } = require('./utils/statsProcessor');

// Declare all job variables at the top
let matchFetchingJob = null;
let dailyResetJob = null;
let accuracyStatsJob = null;
let standingsUpdateJob = null;

async function scheduleNextMatchCheck() {
    try {
        console.log('Starting scheduleNextMatchCheck...');
        
        if (typeof hasActiveMatches !== 'function') {
            console.error('hasActiveMatches is not properly imported');
            return;
        }

        // First check if there are any active matches
        const isActive = await hasActiveMatches();
        console.log('Active matches check result:', isActive);
        
        if (isActive) {
            console.log('Active matches found, continuing minute-by-minute updates');
            if (!matchFetchingJob) {
                startMinutePolling();
            }
            return;
        }

        // If no active matches, find the next scheduled match
        const nextMatch = await getNextScheduledMatch();
        if (!nextMatch) {
            console.log('No upcoming matches found');
            stopPolling();
            return;
        }

        const nextMatchTime = parseISO(nextMatch.utcDate);
        const minutesUntilMatch = differenceInMinutes(nextMatchTime, new Date());

        console.log(`Next match (${nextMatch.homeTeam.name} vs ${nextMatch.awayTeam.name}) starts in ${minutesUntilMatch} minutes`);

        if (minutesUntilMatch <= 5) {
            console.log('Match starting soon or should have started, beginning frequent updates');
            startMinutePolling();
        } else {
            console.log(`Scheduling next check in ${minutesUntilMatch - 5} minutes`);
            stopPolling();
            
            setTimeout(() => {
                console.log('Timeout triggered for match check');
                startMinutePolling();
            }, (minutesUntilMatch - 5) * 60 * 1000);
            
            if (matchFetchingJob) {
                matchFetchingJob.stop();
            }
            matchFetchingJob = cron.schedule('*/5 * * * *', async () => {
                const stillActive = await hasActiveMatches();
                if (stillActive) {
                    console.log('Found active match during backup check, switching to minute polling');
                    startMinutePolling();
                }
            });
        }
    } catch (error) {
        console.error('Error in scheduleNextMatchCheck:', error);
        setTimeout(scheduleNextMatchCheck, 60000);
    }
}

function startMinutePolling() {
    if (matchFetchingJob) {
        matchFetchingJob.stop();
    }

    console.log('Starting minute-by-minute match polling');
    matchFetchingJob = cron.schedule('* * * * *', async () => {
        await handleMatchFetching();
        await scheduleNextMatchCheck();
    }, {
        scheduled: true,
        timezone: "UTC"
    });
}

function stopPolling() {
    if (matchFetchingJob) {
        console.log('Stopping match polling');
        matchFetchingJob.stop();
        matchFetchingJob = null;
    }
}

async function handleMatchFetching() {
    console.log(`Starting match fetch at ${new Date().toISOString()}`);
    try {
        const currentDate = new Date();
        
        // Get currently active matches before the update
        const previousActiveMatches = await Match.find({
            status: { $in: ['IN_PLAY', 'PAUSED', 'HALFTIME'] }
        });

        const previousActiveMatchIds = new Set(previousActiveMatches.map(match => match.id));
        
        const start = subHours(currentDate, 3);
        const end = addHours(currentDate, 3);

        if (previousActiveMatches.length > 0) {
            const matchStartTimes = previousActiveMatches.map(match => new Date(match.utcDate));
            const earliestMatchStart = Math.min(...matchStartTimes);
            if (earliestMatchStart < start) {
                console.log('Extending fetch window to include active matches from earlier');
                start = new Date(earliestMatchStart);
            }
        }

        // Process matches and update their status
        const results = await processMatchesForDate(currentDate, start, end);
        
        // Check for newly finished matches
        const updatedMatches = await Match.find({
            id: { $in: Array.from(previousActiveMatchIds) }
        });

        const justFinishedMatches = updatedMatches.filter(match => 
            match.status === 'FINISHED' && previousActiveMatchIds.has(match.id)
        );

        if (justFinishedMatches.length > 0) {
            console.log(`${justFinishedMatches.length} matches just finished. Triggering stats recalculation...`);
            
            justFinishedMatches.forEach(match => {
                console.log(`Match finished: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
                console.log(`Final score: ${match.score.fullTime.home} - ${match.score.fullTime.away}`);
            });
        
            try {
                const stats = await recalculateStats();
                console.log('Stats recalculation completed:', stats);
                
                if (stats.aiStats) {
                    console.log(`New AI accuracy: ${stats.aiStats.accuracy}%`);
                }
            } catch (error) {
                console.error('Error updating stats after match completion:', error);
            }
        }
                
        // Update events for active matches
        const currentActiveMatches = await Match.find({
            status: { $in: ['IN_PLAY', 'PAUSED', 'HALFTIME'] }
        });

        if (currentActiveMatches.length > 0) {
            await fetchAndStoreAllLiveEvents();
            console.log(`Fetched events for ${currentActiveMatches.length} active matches with one API call`);
        }
        
        console.log('Match fetching completed:', {
            timestamp: new Date().toISOString(),
            results,
            previouslyActive: previousActiveMatches.length,
            currentlyActive: currentActiveMatches.length,
            justFinished: justFinishedMatches.length,
            fetchRange: { 
                start: start.toISOString(), 
                end: end.toISOString() 
            }
        });
    } catch (error) {
        console.error('Error in match fetching:', error);
    }
}

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
            ai: { total: 0, correct: 0 }
        };

        todayMatches.forEach(match => {
            if (match.aiPrediction) {
                stats.ai.total++;
                const homeScore = match.score.fullTime.home;
                const awayScore = match.score.fullTime.away;
                let actualResult = homeScore > awayScore ? 'HOME_TEAM' : (awayScore > homeScore ? 'AWAY_TEAM' : 'DRAW');
                if (match.aiPrediction === actualResult) {
                    stats.ai.correct++;
                }
            }
        });

        console.log('Today\'s stats calculated:', stats);

        const aiStats = await AIPredictionStat.findOne();

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

        return stats;
    } catch (error) {
        console.error('Error updating daily prediction stats:', error);
        throw error;
    }
}

function initializeCronJobs() {
    // Daily reset job - runs at midnight UTC
    dailyResetJob = cron.schedule('0 0 * * *', async () => {
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
            ]);
            
            await scheduleNextMatchCheck();
            console.log('Daily stats reset completed');
        } catch (error) {
            console.error('Error in daily stats reset:', error);
        }
    });

    // Hourly backup accuracy stats job
    accuracyStatsJob = cron.schedule('0 * * * *', async () => {
        try {
            const lastAccuracyStats = await AccuracyStats.findOne().sort({ lastUpdated: -1 });
            const lastUpdate = lastAccuracyStats?.lastUpdated || new Date(0);
            
            if (Date.now() - lastUpdate.getTime() > 60 * 60 * 1000) {
                console.log('Running backup accuracy recalculation');
                const stats = await recalculateAllStats();
                console.log('Backup accuracy stats updated:', stats);
            }
        } catch (error) {
            console.error('Error in scheduled accuracy recalculation:', error);
        }
    });

    // Standings update job - runs daily at 23:00 UTC
    standingsUpdateJob = cron.schedule('0 23 * * *', async () => {
        try {
            console.log('Starting daily standings update at', new Date().toISOString());
            
            const currentYear = getCurrentSeason();
            console.log(`Updating standings for season ${currentYear}/${currentYear + 1}`);
            
            const results = {
                successful: [],
                failed: [],
                noData: [],
                skipped: []
            };
            
            for (const leagueId of ALLOWED_LEAGUE_IDS) {
                try {
                    console.log(`\nProcessing league ID: ${leagueId}`);
                    
                    const result = await processStandings(leagueId, currentYear);
                    
                    if (result.success) {
                        results.successful.push(leagueId);
                        console.log(`✓ Successfully updated league ${leagueId}`);
                    } else if (result.error === 'NO_DATA') {
                        results.noData.push(leagueId);
                        console.log(`? No data available for league ${leagueId}`);
                    } else if (result.error === 'LEAGUE_NOT_ALLOWED') {
                        results.skipped.push(leagueId);
                        console.log(`- Skipped league ${leagueId}`);
                    } else {
                        results.failed.push({
                            leagueId,
                            error: result.error,
                            details: result.details
                        });
                        console.log(`✗ Failed to update league ${leagueId}: ${result.error}`);
                    }
                    
                    // Respect API rate limits
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } catch (error) {
                    results.failed.push({
                        leagueId,
                        error: 'UNEXPECTED_ERROR',
                        details: error.message
                    });
                    console.error(`✗ Error processing league ${leagueId}:`, error);
                }
            }
            
            console.log('\n=== Standings Update Summary ===');
            console.log(`Timestamp: ${new Date().toISOString()}`);
            console.log(`Season: ${currentYear}/${currentYear + 1}`);
            console.log(`Total leagues processed: ${ALLOWED_LEAGUE_IDS.length}`);
            console.log(`Successful updates: ${results.successful.length}`);
            console.log(`Failed updates: ${results.failed.length}`);
            console.log(`No data available: ${results.noData.length}`);
            console.log(`Skipped leagues: ${results.skipped.length}`);
            
            if (results.failed.length > 0) {
                console.log('\nFailed Leagues:');
                results.failed.forEach(failure => {
                    console.log(`- League ${failure.leagueId}: ${failure.error} (${failure.details})`);
                });
            }

            await mongoCleanup();
        } catch (error) {
            console.error('Critical error in standings update job:', error);
            await mongoCleanup();
        }
    });
}

// Error handling for the cron jobs
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Restart all jobs on error
    scheduleNextMatchCheck();
    if (dailyResetJob) dailyResetJob.start();
    if (accuracyStatsJob) accuracyStatsJob.start();
    if (standingsUpdateJob) standingsUpdateJob.start();
});

// Initialize everything
initializeCronJobs();
scheduleNextMatchCheck();

// Export all necessary functions and jobs
module.exports = {
    scheduleNextMatchCheck,
    dailyResetJob,
    accuracyStatsJob,
    updateDailyPredictionStats,
    handleMatchFetching,
    standingsUpdateJob
};