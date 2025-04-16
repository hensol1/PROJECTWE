const cron = require('node-cron');
const { startOfDay, endOfDay, parseISO, differenceInMinutes, subHours, addHours } = require('date-fns');
const Match = require('./models/Match');
const { processMatchesForDate, hasActiveMatches, getNextScheduledMatch, ACTIVE_STATUSES } = require('./fetchMatches');
const AIPredictionStat = require('./models/AIPredictionStat');
const AccuracyStats = require('./models/AccuracyStats');
const { fetchAndStoreEvents } = require('./fetchEvents');
const { fetchAndStoreAllLiveEvents } = require('./fetchEvents');
const { recalculateStats } = require('./utils/statsProcessor');
const { updateStandingsForLeague } = require('./utils/standingsProcessor');
const generateAllStatsFile = require('./scripts/generateStatsFile');
const generateTeamStats = require('./scripts/generateTeamStats');
const generateOddsFiles = require('./scripts/generateOddsFile');


// Declare all job variables at the top
let matchFetchingJob = null;
let dailyResetJob = null;
let accuracyStatsJob = null;
let statsGenerationJob = null;
let standingsJob = null;

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
        
        let start = subHours(currentDate, 3);
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
            console.log(`${justFinishedMatches.length} matches just finished. Triggering updates...`);
            
            // Update stats for each finished match individually
            for (const match of justFinishedMatches) {
                try {
                    await updateStatsForMatch(match);
                    // Schedule standings update for this league
                    await scheduleStandingsUpdateAfterMatch(match.competition.id);
                } catch (error) {
                    console.error(`Error updating stats for match ${match.id}:`, error);
                    // Continue with other matches even if one fails
                }
            }        

            // After updating stats, recalculate overall stats
            try {
                const stats = await recalculateStats();
                console.log('Stats recalculation completed:', stats);
                
                if (stats.aiStats) {
                    console.log(`New AI accuracy: ${stats.aiStats.accuracy}%`);
                }
                
                // Generate new stats files after recalculation
                await generateAllStatsFile();
                console.log('Stats files updated successfully');
            } catch (error) {
                console.error('Error updating stats after match completion:', error);
            }
        }
                        
        // Update events for active matches
        const currentActiveMatches = await Match.find({
            status: { $in: ['IN_PLAY', 'PAUSED', 'HALFTIME'] }
        });

        if (currentActiveMatches.length > 0) {
            try {
                await fetchAndStoreAllLiveEvents();
                console.log(`Fetched events for ${currentActiveMatches.length} active matches with one API call`);
            } catch (error) {
                console.error('Error fetching live events:', error);
            }
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
        throw error; // Re-throw to be handled by the caller
    }
}

async function updateStatsForMatch(match) {
    if (match.status === 'FINISHED' && match.aiPrediction) {
      try {
        // Determine if prediction was correct
        const actualResult = match.score.winner || 
            (match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' : 
            match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW');
        const isCorrect = match.aiPrediction === actualResult;
        
        // Get match date (use start of day)
        const matchDate = new Date(match.utcDate);
        matchDate.setHours(0, 0, 0, 0);
        
        // Update AIPredictionStat
        const aiStats = await AIPredictionStat.findOne();
        if (aiStats) {
          // Update total stats
          aiStats.totalPredictions += 1;
          if (isCorrect) {
            aiStats.correctPredictions += 1;
          }
          
          // Find or create the daily stat
          let dayStats = aiStats.dailyStats.find(
            stat => new Date(stat.date).toDateString() === matchDate.toDateString()
          );
          
          if (dayStats) {
            dayStats.totalPredictions += 1;
            if (isCorrect) {
              dayStats.correctPredictions += 1;
            }
          } else {
            aiStats.dailyStats.push({
              date: matchDate,
              totalPredictions: 1,
              correctPredictions: isCorrect ? 1 : 0
            });
          }
          
          await aiStats.save();
          console.log(`Updated stats for match ${match.id}: ${match.homeTeam.name} vs ${match.awayTeam.name} - Prediction ${isCorrect ? 'correct' : 'incorrect'}`);
        }
      } catch (error) {
        console.error(`Error updating stats for match ${match.id}:`, error);
      }
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

        // After updating the daily stats, regenerate the stats files
        try {
            await generateAllStatsFile();
            console.log('Stats files updated after daily prediction stats update');
        } catch (error) {
            console.error('Error generating stats files after daily update:', error);
        }

        return stats;
    } catch (error) {
        console.error('Error updating daily prediction stats:', error);
        throw error;
    }
}

// Initialize the stats generation job
function initializeStatsJob() {
    console.log('Initializing stats file generation job...');
    
    // Generate stats files at 3:00 AM UTC every day (after all matches finished)
    statsGenerationJob = cron.schedule('0 3 * * *', async () => {
        try {
            console.log('Starting daily stats file generation...');
            const result = await generateAllStatsFile();
            
            if (result.success) {
                console.log('Daily stats file generation completed successfully:', result);
                
                // Generate team stats after general stats are updated
                console.log('Generating team stats...');
                try {
                    const teamStatsResult = await generateTeamStats();
                    console.log(`Team stats generated: ${teamStatsResult.totalTeamsAnalyzed} teams analyzed`);
                } catch (teamStatsError) {
                    console.error('Error generating team stats:', teamStatsError);
                }
            } else {
                console.error('Daily stats file generation failed:', result.error);
            }
        } catch (error) {
            console.error('Error in daily stats file generation:', error);
        }
    });
    
    // Add a separate job to update team stats weekly (every Sunday at 4:00 AM)
    // This is a deep analysis that doesn't need to run daily
    const teamStatsJob = cron.schedule('0 4 * * 0', async () => {
        try {
            console.log('Starting weekly team stats generation...');
            const teamStatsResult = await generateTeamStats();
            console.log(`Weekly team stats generated: ${teamStatsResult.totalTeamsAnalyzed} teams analyzed`);
        } catch (error) {
            console.error('Error in weekly team stats generation:', error);
        }
    });
}

function initializeOddsJob() {
    console.log('Initializing odds file generation job...');
    
    // Generate odds files every 3 hours
    const oddsGenerationJob = cron.schedule('0 */3 * * *', async () => {
        try {
            console.log('Starting scheduled odds file generation...');
            const result = await generateOddsFiles();
            
            if (result && result.success) {
                console.log('Odds file generation completed successfully');
            } else {
                console.error('Odds file generation failed:', result?.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error in scheduled odds file generation:', error);
        }
    });
    
    // Also generate odds files after match updates
    // This gets called in the existing handleMatchFetching function
    // after the match fetch is completed
    return oddsGenerationJob;
}

function initializeStandingsJob() {
    console.log('Initializing standings update job...');
    
    // Update standings every 2 hours for active leagues
    standingsJob = cron.schedule('0 */2 * * *', async () => {
        try {
            console.log('Starting periodic standings update...');
            
            // Find all leagues with currently active matches
            const activeMatches = await Match.find({
                status: { $in: ['IN_PLAY', 'PAUSED', 'HALFTIME', 'SCHEDULED'] }
            }, 'competition.id');
            
            const uniqueLeagueIds = [...new Set(activeMatches.map(match => match.competition.id))];
            
            console.log(`Found ${uniqueLeagueIds.length} active leagues to update standings for`);
            
            // Update standings for each active league
            for (const leagueId of uniqueLeagueIds) {
                try {
                    console.log(`Updating standings for league ID: ${leagueId}`);
                    const standingsResult = await updateStandingsForLeague(leagueId);
                    
                    if (standingsResult.success) {
                        console.log(`✓ Successfully updated standings for league ${leagueId}`);
                    } else {
                        console.log(`✗ Failed to update standings for league ${leagueId}: ${standingsResult.error}`);
                    }
                    
                    // Wait 5 seconds between league updates to respect API rate limits
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } catch (error) {
                    console.error(`Error updating standings for league ${leagueId}:`, error);
                    // Continue with other leagues even if one fails
                }
            }
            
            console.log('Periodic standings update completed');
        } catch (error) {
            console.error('Error in periodic standings update:', error);
        }
    });
}

// Add a function to schedule standings update after match completion
async function scheduleStandingsUpdateAfterMatch(leagueId) {
    // Schedule the update for 1 hour after the match finishes
    setTimeout(async () => {
        try {
            console.log(`Updating standings for league ${leagueId} after match completion`);
            const standingsResult = await updateStandingsForLeague(leagueId);
            
            if (standingsResult.success) {
                console.log(`✓ Successfully updated standings for league ${leagueId} after match completion`);
            } else {
                console.log(`✗ Failed to update standings for league ${leagueId} after match completion: ${standingsResult.error}`);
            }
        } catch (error) {
            console.error(`Error updating standings for league ${leagueId} after match completion:`, error);
        }
    }, 60 * 60 * 1000); // 1 hour delay
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
                const stats = await recalculateStats();
                console.log('Backup accuracy stats updated:', stats);
                
                // Generate stats files after recalculation
                try {
                    await generateAllStatsFile();
                    console.log('Stats files generated after hourly backup recalculation');
                } catch (error) {
                    console.error('Error generating stats files after hourly backup:', error);
                }
            }
        } catch (error) {
            console.error('Error in scheduled accuracy recalculation:', error);
        }
    });

    // Initialize the stats generation job
    initializeStatsJob();
    
    // Initialize the odds generation job
    const oddsGenerationJob = initializeOddsJob();
    
    // Initialize the standings job
    initializeStandingsJob();
    
    // Return the new job so we can reference it elsewhere
    return { dailyResetJob, accuracyStatsJob, statsGenerationJob, oddsGenerationJob, standingsJob };
}

// Add a cleanup function for jobs
function cleanupJobs() {
    if (matchFetchingJob) {
        matchFetchingJob.stop();
        matchFetchingJob = null;
    }
    if (dailyResetJob) {
        dailyResetJob.stop();
        dailyResetJob = null;
    }
    if (accuracyStatsJob) {
        accuracyStatsJob.stop();
        accuracyStatsJob = null;
    }
    if (statsGenerationJob) {
        statsGenerationJob.stop();
        statsGenerationJob = null;
    }
    if (standingsJob) {
        standingsJob.stop();
        standingsJob = null;
    }
}

// Error handling for the cron jobs
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Clean up existing jobs
    cleanupJobs();
    // Restart all jobs
    initializeCronJobs();
    scheduleNextMatchCheck();
});

// Initialize everything
function initialize() {
    try {
        cleanupJobs(); // Clean up any existing jobs
        initializeCronJobs();
        scheduleNextMatchCheck();

        // Generate initial stats files
        generateAllStatsFile().then(result => {
            if (result.success) {
                console.log('Initial stats files generated successfully on server start');
            } else {
                console.error('Failed to generate initial stats files:', result.error);
            }
        }).catch(error => {
            console.error('Error generating initial stats files:', error);
        });
    } catch (error) {
        console.error('Error during initialization:', error);
        // Attempt to restart after a delay
        setTimeout(initialize, 60000);
    }
}

// Start the application
initialize();

// Export all necessary functions and jobs
module.exports = {
    scheduleNextMatchCheck,
    dailyResetJob,
    accuracyStatsJob,
    statsGenerationJob,
    standingsJob,
    updateDailyPredictionStats,
    handleMatchFetching,
    generateAllStatsFile,
    initializeStatsJob,
    generateOddsFiles,
    cleanupJobs,
    initialize
};
