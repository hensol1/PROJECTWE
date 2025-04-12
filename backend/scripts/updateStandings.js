/**
 * Script to update standings for a specific league or all allowed leagues
 * 
 * Usage: 
 * - Update specific league: node updateStandings.js --league=103
 * - Update all leagues: node updateStandings.js --all
 */

require('dotenv').config();
const { processStandings, ALLOWED_LEAGUE_IDS, cleanup } = require('../fetchStandings');

// Parse command line arguments
const args = process.argv.slice(2);
const argMap = {};
args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    argMap[key] = value || true;
  }
});

// Consistent season determination logic
function getSeasonForLeague(leagueId) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  // Array of leagues that run in a calendar year format (Apr-Nov)
  const calendarYearLeagues = [103, 113, 188, 119, 135, 327, 169, 13, 11, 253];
  
  if (calendarYearLeagues.includes(leagueId)) {
    // For calendar year leagues (like Norway, Sweden, etc.)
    return currentMonth < 4 ? currentYear - 1 : currentYear;
  } else {
    // For traditional European season format (Aug-May)
    return currentMonth < 8 ? currentYear - 1 : currentYear;
  }
}

async function updateStandings() {
  try {
    console.log('Starting standings update process...');
    
    if (argMap.league) {
      // Update a specific league
      const leagueId = parseInt(argMap.league);
      
      if (isNaN(leagueId)) {
        console.error('Invalid league ID. Please provide a valid number.');
        return;
      }
      
      // Use the same season determination logic as the frontend and backend
      const season = getSeasonForLeague(leagueId);
      
      console.log(`Updating standings for league ID: ${leagueId}, season: ${season}`);
      const result = await processStandings(leagueId, season);
      console.log(`Result: ${result.success ? 'Success' : 'Failed'}`, result);
    } 
    else if (argMap.all) {
      // Update all allowed leagues
      console.log(`Updating standings for all ${ALLOWED_LEAGUE_IDS.length} allowed leagues...`);
      
      // To avoid rate limiting, process one by one with delay
      for (const leagueId of ALLOWED_LEAGUE_IDS) {
        // Use the same season determination logic
        const season = getSeasonForLeague(leagueId);
        
        console.log(`Processing league ID: ${leagueId}, season: ${season}`);
        try {
          const result = await processStandings(leagueId, season);
          console.log(`Result: ${result.success ? 'Success' : 'Failed'}`);
          
          // Add delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error processing league ${leagueId}:`, error.message);
        }
      }
      
      console.log('All leagues processed.');
    }
    else {
      console.log('Please specify either --league=ID or --all');
    }
  } catch (error) {
    console.error('Error in update process:', error);
  } finally {
    // Close MongoDB connection when done
    await cleanup();
  }
}

// Run the function
updateStandings();