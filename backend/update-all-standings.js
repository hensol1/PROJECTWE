const { processStandings, ALLOWED_LEAGUE_IDS, getCurrentSeason, cleanup } = require('./fetchStandings');

async function updateAllStandings() {
    try {
        const currentSeason = getCurrentSeason();
        console.log(`Updating all standings for season ${currentSeason}/${currentSeason + 1}`);
        
        const results = {
            successful: [],
            failed: [],
            skipped: []
        };

        // Process each league with a delay between requests
        for (const leagueId of ALLOWED_LEAGUE_IDS) {
            try {
                console.log(`\nProcessing league ID: ${leagueId}`);
                
                const result = await processStandings(leagueId, currentSeason);
                
                if (result.success) {
                    results.successful.push(leagueId);
                    console.log(`✓ Successfully updated league ${leagueId}`);
                } else {
                    results.failed.push({
                        leagueId,
                        error: result.error,
                        details: result.details
                    });
                    console.log(`✗ Failed to update league ${leagueId}: ${result.error}`);
                }

                // Wait 5 seconds between requests to respect API rate limits
                await new Promise(resolve => setTimeout(resolve, 5000));
            } catch (error) {
                results.failed.push({
                    leagueId,
                    error: 'UNEXPECTED_ERROR',
                    details: error.message
                });
                console.log(`✗ Error processing league ${leagueId}: ${error.message}`);
            }
        }

        // Print summary
        console.log('\n=== Update Summary ===');
        console.log(`Total leagues processed: ${ALLOWED_LEAGUE_IDS.length}`);
        console.log(`Successful updates: ${results.successful.length}`);
        console.log(`Failed updates: ${results.failed.length}`);
        
        if (results.failed.length > 0) {
            console.log('\nFailed Leagues:');
            results.failed.forEach(failure => {
                console.log(`- League ${failure.leagueId}: ${failure.error} (${failure.details})`);
            });
        }

        return results;
    } catch (error) {
        console.error('Critical error:', error);
        throw error;
    } finally {
        // Ensure MongoDB connection is properly closed
        await cleanup();
    }
}

// Run the update if this file is run directly
if (require.main === module) {
    updateAllStandings()
        .then(() => {
            console.log('Update completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('Update failed:', error);
            process.exit(1);
        });
}

module.exports = { updateAllStandings };