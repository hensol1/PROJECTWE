const cron = require('node-cron');
const Match = require('./models/Match');
const { processMatchesForDate } = require('./fetchMatches');

class DynamicMatchScheduler {
    constructor() {
        this.currentJob = null;
        this.ACTIVE_STATUSES = ['IN_PLAY', 'HALFTIME', 'PAUSED', 'LIVE'];
        this.polling = false;
    }

    async checkAndScheduleMatches() {
        try {
            // Check for any active matches
            const activeMatches = await Match.find({
                status: { $in: this.ACTIVE_STATUSES }
            }).sort({ utcDate: 1 });

            if (activeMatches.length > 0) {
                // There are active matches, ensure polling is running
                this.startPolling();
                return;
            }

            // No active matches, find the next scheduled match
            const nextMatch = await Match.findOne({
                status: { $in: ['TIMED', 'SCHEDULED'] },
                utcDate: { $gt: new Date().toISOString() }
            }).sort({ utcDate: 1 });

            if (!nextMatch) {
                this.stopPolling();
                console.log('No upcoming matches found');
                return;
            }

            const matchStartTime = new Date(nextMatch.utcDate);
            const timeUntilMatch = matchStartTime - new Date();

            // If match starts in less than 5 minutes, start polling
            if (timeUntilMatch <= 5 * 60 * 1000) {
                this.startPolling();
                return;
            }

            // Schedule the next check for 5 minutes before the match
            this.scheduleNextCheck(timeUntilMatch - 5 * 60 * 1000);

            console.log(`Next match (${nextMatch.homeTeam.name} vs ${nextMatch.awayTeam.name}) starts in ${Math.floor(timeUntilMatch / 60000)} minutes`);
        } catch (error) {
            console.error('Error in checkAndScheduleMatches:', error);
        }
    }

    startPolling() {
        if (this.polling) return;

        console.log('Starting match polling');
        this.polling = true;
        
        // Clear any existing scheduled job
        if (this.currentJob) {
            this.currentJob.stop();
        }

        // Create new polling job that runs every minute
        this.currentJob = cron.schedule('* * * * *', async () => {
            console.log('Polling for match updates...');
            await processMatchesForDate(new Date());
            // Recheck scheduling after each update
            await this.checkAndScheduleMatches();
        });
    }

    stopPolling() {
        if (!this.polling) return;

        console.log('Stopping match polling');
        this.polling = false;
        
        if (this.currentJob) {
            this.currentJob.stop();
            this.currentJob = null;
        }
    }

    scheduleNextCheck(timeUntilMatch) {
        if (this.currentJob) {
            this.currentJob.stop();
        }

        console.log(`Scheduling next check in ${Math.floor(timeUntilMatch / 60000)} minutes`);
        
        // Schedule a one-time check
        setTimeout(() => {
            this.checkAndScheduleMatches();
        }, timeUntilMatch);
    }

    // Initialize the scheduler
    async initialize() {
        console.log('Initializing dynamic match scheduler');
        await this.checkAndScheduleMatches();
    }
}

module.exports = DynamicMatchScheduler;