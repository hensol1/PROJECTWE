const axios = require('axios');
const Lineup = require('./models/Lineup');

const API_KEY = "5f3eb3a125615327d83d13e16a1a7f77";
const BASE_URL = "https://v3.football.api-sports.io";
const HEADERS = { 
    "x-rapidapi-key": API_KEY, 
    "x-rapidapi-host": "v3.football.api-sports.io" 
};

async function fetchAndStoreLineups(matchId) {
    try {
        console.log(`Checking lineups for match ${matchId}`);
        
        // First, try to get from database
        const existingLineups = await Lineup.find({ matchId });
        
        // If we have lineups in the database
        if (existingLineups.length > 0) {
            console.log(`Found existing lineups in database for match ${matchId}`);
            return existingLineups;
        }

        // If no lineups in database, fetch from API
        console.log(`No lineups found in database, fetching from API for match ${matchId}`);
        const fixtureId = matchId.replace('api2_', '');
        
        const response = await axios.get(`${BASE_URL}/fixtures/lineups`, {
            headers: HEADERS,
            params: {
                fixture: fixtureId
            }
        });

        if (!response.data || response.data.results === 0) {
            console.log(`No lineups available from API for match ${matchId}`);
            
            // Store an empty lineup record to prevent future API calls for this match
            await Lineup.create({
                matchId,
                noLineupsAvailable: true,
                lastChecked: new Date()
            });
            
            return [];
        }

        const lineups = response.data.response.map(teamLineup => ({
            matchId,
            team: {
                id: teamLineup.team.id,
                name: teamLineup.team.name,
                logo: teamLineup.team.logo,
                colors: teamLineup.team.colors
            },
            formation: teamLineup.formation,
            coach: {
                id: teamLineup.coach.id,
                name: teamLineup.coach.name,
                photo: teamLineup.coach.photo
            },
            startXI: teamLineup.startXI.map(player => ({
                id: player.player.id,
                name: player.player.name,
                number: player.player.number,
                pos: player.player.pos,
                grid: player.player.grid
            })),
            substitutes: teamLineup.substitutes.map(player => ({
                id: player.player.id,
                name: player.player.name,
                number: player.player.number,
                pos: player.player.pos
            })),
            lastChecked: new Date()
        }));

        // Store the lineups in database
        if (lineups.length > 0) {
            await Lineup.insertMany(lineups);
            console.log(`Successfully stored ${lineups.length} lineups for match ${matchId}`);
        }

        return lineups;
    } catch (error) {
        console.error(`Error while handling lineups for match ${matchId}:`, error.response?.data || error.message);
        return [];
    }
}

module.exports = {
    fetchAndStoreLineups
};