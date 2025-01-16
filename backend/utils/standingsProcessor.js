const { processStandings, getCurrentSeason } = require('../fetchStandings');

async function updateStandingsForLeague(leagueId) {
    try {
        console.log(`Updating standings for league ID: ${leagueId}`);
        
        const currentYear = getCurrentSeason();
        const result = await processStandings(leagueId, currentYear);
        
        if (result.success) {
            console.log(`✓ Successfully updated standings for league ${leagueId}`);
            return {
                success: true,
                leagueId,
                message: 'Standings updated successfully'
            };
        } else if (result.error === 'NO_DATA') {
            console.log(`? No standings data available for league ${leagueId}`);
            return {
                success: false,
                leagueId,
                error: 'NO_DATA'
            };
        } else if (result.error === 'LEAGUE_NOT_ALLOWED') {
            console.log(`- League ${leagueId} not allowed for standings updates`);
            return {
                success: false,
                leagueId,
                error: 'LEAGUE_NOT_ALLOWED'
            };
        } else {
            console.log(`✗ Failed to update standings for league ${leagueId}: ${result.error}`);
            return {
                success: false,
                leagueId,
                error: result.error,
                details: result.details
            };
        }
    } catch (error) {
        console.error(`Error updating standings for league ${leagueId}:`, error);
        return {
            success: false,
            leagueId,
            error: 'UNEXPECTED_ERROR',
            details: error.message
        };
    }
}

module.exports = {
    updateStandingsForLeague
};