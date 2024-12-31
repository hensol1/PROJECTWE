const axios = require('axios');
const Standing = require('./models/Standing');

const API_KEY = "5f3eb3a125615327d83d13e16a1a7f77";
const BASE_URL = "https://v3.football.api-sports.io";
const HEADERS = { "x-rapidapi-key": API_KEY, "x-rapidapi-host": "v3.football.api-sports.io" };

async function fetchStandings(leagueId, season) {
    try {
        console.log(`Updating standings for league ${leagueId} season ${season}`);
        
        const response = await axios.get(`${BASE_URL}/standings`, {
            headers: HEADERS,
            params: {
                league: leagueId,
                season: season
            }
        });

        if (!response.data || response.data.results === 0 || !response.data.response[0]) {
            console.log(`No standings data received from API for league ${leagueId} season ${season}`);
            return false;
        }

        const standingsData = response.data.response[0].league;
        
        // Update existing standings or create new if doesn't exist
        await Standing.findOneAndUpdate(
            { leagueId, season },
            {
                leagueId,
                season,
                leagueName: standingsData.name,
                standings: standingsData.standings[0],
                lastUpdated: new Date()
            },
            { upsert: true, new: true }
        );

        console.log(`Successfully updated standings for league ${leagueId} season ${season}`);
        return true;
    } catch (error) {
        console.error(`Error updating standings for league ${leagueId} season ${season}:`, error);
        return false;
    }
}

module.exports = {
    processStandings: fetchStandings
};