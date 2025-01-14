const cron = require('node-cron');
const { startOfDay, endOfDay, parseISO, differenceInMinutes } = require('date-fns');
const Match = require('./models/Match');
const { processMatchesForDate, hasActiveMatches, getNextScheduledMatch, ACTIVE_STATUSES } = require('./fetchMatches');
const AIPredictionStat = require('./models/AIPredictionStat');
const AccuracyStats = require('./models/AccuracyStats');
const { fetchAndStoreEvents } = require('./fetchEvents');
const { fetchAndStoreAllLiveEvents } = require('./fetchEvents');
const { processStandings, ALLOWED_LEAGUE_IDS, getCurrentSeason, cleanup: mongoCleanup } = require('./fetchStandings');
const { subHours, addHours } = require('date-fns');

let matchFetchingJob = null;

const cleanupStatsCache = async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await UserStatsCache.deleteMany({ lastUpdated: { $lt: thirtyDaysAgo } });
};

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

        // If match should have started or starts very soon, start polling
        if (minutesUntilMatch <= 5) {
            console.log('Match starting soon or should have started, beginning frequent updates');
            startMinutePolling();
        } else {
            // Schedule a one-time check 5 minutes before the match
            console.log(`Scheduling next check in ${minutesUntilMatch - 5} minutes`);
            stopPolling();
            
            // Set both a timeout and a backup cron job
            setTimeout(() => {
                console.log('Timeout triggered for match check');
                startMinutePolling();
            }, (minutesUntilMatch - 5) * 60 * 1000);
            
            // Backup check every 5 minutes in case we miss the timeout
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
        // If there's an error, set a short retry
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
        await scheduleNextMatchCheck(); // Check after each update if we should continue polling
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
        
        // Get any active matches first
        const activeMatches = await Match.find({
            status: { $in: ['IN_PLAY', 'PAUSED', 'HALFTIME'] }
        });

        // Calculate time window for new matches
        const start = subHours(currentDate, 3);  // Look back 3 hours
        const end = addHours(currentDate, 3);    // Look ahead 3 hours

        // If there are active matches, extend the time window to include their start times
        if (activeMatches.length > 0) {
            const matchStartTimes = activeMatches.map(match => new Date(match.utcDate));
            const earliestMatchStart = Math.min(...matchStartTimes);
            if (earliestMatchStart < start) {
                console.log('Extending fetch window to include active matches from earlier');
                start = new Date(earliestMatchStart);
            }
        }

        const results = await processMatchesForDate(currentDate, start, end);
        
        // If there are active matches, fetch all their events with a single API call
        if (activeMatches.length > 0) {
            await fetchAndStoreAllLiveEvents();  // Single API call for all live match events
            console.log(`Fetched events for ${activeMatches.length} active matches with one API call`);
        }
        
        console.log('Match fetching completed:', {
            timestamp: new Date().toISOString(),
            results,
            activeMatches: activeMatches.length,
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
            const votes = await Vote.find({ matchId: match.id });
            console.log(`Found ${votes.length} votes for match ${match.id}`);
            
            const actualResult = match.score.winner || (
                match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' :
                match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW'
            );

            for (const vote of votes) {
                try {
                    const votePrediction = 
                        vote.vote === 'home' ? 'HOME_TEAM' :
                        vote.vote === 'away' ? 'AWAY_TEAM' : 'DRAW';

                    vote.isCorrect = votePrediction === actualResult;
                    await vote.save();

                    // Update user's stats
                    const user = await User.findById(vote.userId);
                    if (user) {
                        // Get all finished votes for this user
                        const userVotes = await Vote.find({
                            userId: user._id,
                            isCorrect: { $ne: null }
                        });

                        const finishedVotes = userVotes.length;
                        const correctVotes = userVotes.filter(v => v.isCorrect).length;

                        // Calculate Wilson score
                        const n = finishedVotes;
                        const p = n > 0 ? correctVotes / n : 0;
                        const z = 1.96;
                        const zsqr = z * z;
                        const wilsonScore = n > 0 ? 
                            (p + zsqr/(2*n) - z * Math.sqrt((p*(1-p) + zsqr/(4*n))/n))/(1 + zsqr/n) : 0;

                        // Update user document
                        await User.findByIdAndUpdate(user._id, {
                            finishedVotes,
                            correctVotes,
                            accuracy: n > 0 ? (correctVotes / n * 100) : 0,
                            wilsonScore
                        });

                        // Force stats cache update
                        await UserStatsCache.findOneAndUpdate(
                            { userId: user._id },
                            { $set: { lastUpdated: new Date(0) } },
                            { upsert: true }
                        );

                        console.log(`Updated stats for user ${user.username}: ${correctVotes}/${finishedVotes} correct`);
                    }
                } catch (error) {
                    console.error(`Error processing vote ${vote._id} for match ${match.id}:`, error);
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

const statsUpdateJob = cron.schedule('*/2 * * * *', async () => {
    try {
        const activeMatches = await Match.find({
            status: { $in: ACTIVE_STATUSES }
        });

        if (activeMatches.length > 0) {
            console.log('Starting scheduled task: Check finished matches');
            const stats = await updateDailyPredictionStats();
            console.log('Daily stats update completed:', stats);
            
            await updateUserStats();
            console.log('User stats update completed');
        }
    } catch (error) {
        console.error('Error in scheduled task:', error);
    }
});

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
        
        // After midnight reset, check for any active matches or schedule next check
        await scheduleNextMatchCheck();
        
        console.log('Daily stats reset completed');
    } catch (error) {
        console.error('Error in daily stats reset:', error);
    }
});

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

// New cron job for events (every 5 minutes)
const eventsUpdateJob = cron.schedule('*/5 * * * *', async () => {
    try {
        console.log('Starting scheduled events update');
        await fetchAndStoreAllLiveEvents();
    } catch (error) {
        console.error('Error in events update job:', error);
    }
});

// Standings update job - runs every day at 23:00 (11 PM)
const standingsUpdateJob = cron.schedule('0 23 * * *', async () => {
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
        
        // Process each allowed league
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
                
                // Respect API rate limits - wait 5 seconds between requests
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
        
        // Log final results
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

        // Clean up MongoDB connection after all operations are complete
        await mongoCleanup();
        
    } catch (error) {
        console.error('Critical error in standings update job:', error);
        await mongoCleanup(); // Ensure cleanup happens even on error
    }
});

// Error handling for the cron jobs
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    scheduleNextMatchCheck();
    statsUpdateJob.start();
    dailyResetJob.start();
    accuracyStatsJob.start();
});

// Initialize the scheduling system
scheduleNextMatchCheck();

module.exports = {
    scheduleNextMatchCheck,
    statsUpdateJob,
    dailyResetJob,
    accuracyStatsJob,
    updateUserStats,
    updateDailyPredictionStats,
    handleMatchFetching,
    eventsUpdateJob,
    standingsUpdateJob
};