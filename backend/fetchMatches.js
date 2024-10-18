const axios = require('axios');
const { MongoClient } = require('mongodb');
const { format, subDays } = require('date-fns');

// API-Football Configuration
const API_KEY = "5f3eb3a125615327d83d13e16a1a7f77";
const BASE_URL = "https://v3.football.api-sports.io";
const HEADERS = { "x-rapidapi-key": API_KEY, "x-rapidapi-host": "v3.football.api-sports.io" };

// MongoDB Configuration
const MONGO_URI = "mongodb+srv://weknowbetteradmin:dMMZV14rCKTYLJXG@cluster0.sbr1j.mongodb.net/";
const DB_NAME = "test";
const COLLECTION_NAME = "matches";

// List of league IDs to filter
const ALLOWED_LEAGUE_IDS = [253, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 17, 20, 29, 30, 34, 39, 40, 46, 61, 62, 71, 78, 79, 81, 88, 94, 103, 106, 113, 119, 128, 135, 140, 143, 144, 169, 172, 179, 188, 197, 203, 207, 210, 218, 235, 253, 271, 283, 286, 318, 327, 333, 345, 373, 383, 848];

async function fetchMatches(date) {
    const url = `${BASE_URL}/fixtures`;
    const params = { date: format(date, 'yyyy-MM-dd') };
    try {
        const response = await axios.get(url, { headers: HEADERS, params });
        console.log(`API request for ${date}: ${response.config.url}`);
        if (response.data.results > 0) {
            console.log(`Found ${response.data.results} matches for ${date}`);
            return response.data.response;
        } else {
            console.log(`No matches found for ${date}`);
        }
    } catch (error) {
        console.error(`Error fetching data for ${date}: ${error.message}`);
    }
    return null;
}

function processMatchData(match) {
    return {
        id: `api2_${match.fixture.id}`,
        source: "API2",
        competition: {
            id: match.league.id,
            name: match.league.name,
            emblem: match.league.logo
        },
        utcDate: match.fixture.date,
        status: mapStatus(match.fixture.status.short),
        homeTeam: {
            id: match.teams.home.id,
            name: match.teams.home.name,
            crest: match.teams.home.logo
        },
        awayTeam: {
            id: match.teams.away.id,
            name: match.teams.away.name,
            crest: match.teams.away.logo
        },
        score: {
            winner: null,
            duration: "REGULAR",
            fullTime: {
                home: match.goals.home,
                away: match.goals.away
            },
            halfTime: {
                home: match.score.halftime.home,
                away: match.score.halftime.away
            }
        },
        lastUpdated: new Date()
    };
}

function mapStatus(status) {
    const statusMap = {
        "TBD": "SCHEDULED",
        "NS": "TIMED",
        "1H": "IN_PLAY",
        "HT": "HALFTIME",
        "2H": "IN_PLAY",
        "ET": "IN_PLAY",
        "P": "IN_PLAY",
        "FT": "FINISHED",
        "AET": "FINISHED",
        "PEN": "FINISHED",
        "BT": "PAUSED",
        "SUSP": "SUSPENDED",
        "INT": "INTERRUPTED",
        "PST": "POSTPONED",
        "CANC": "CANCELLED",
        "ABD": "ABANDONED",
        "AWD": "AWARDED",
        "WO": "WALKOVER",
        "LIVE": "LIVE"
    };
    return statusMap[status] || status;
}

async function updateMatchesInMongoDB(matches) {
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);
        
        let updatedCount = 0;
        for (const match of matches) {
            const result = await collection.updateOne(
                { id: match.id },
                { $set: match },
                { upsert: true }
            );
            if (result.modifiedCount > 0 || result.upsertedCount > 0) {
                updatedCount++;
            }
        }
        
        console.log(`Updated or inserted ${updatedCount} matches in MongoDB`);
    } finally {
        await client.close();
    }
}

function filterMatchesByLeague(matches) {
    return matches.filter(match => ALLOWED_LEAGUE_IDS.includes(match.league.id));
}

async function main() {
    const currentDate = new Date();
    const yesterday = subDays(currentDate, 1);
    
    console.log(`Current date: ${format(currentDate, 'yyyy-MM-dd')}`);
    console.log(`Fetching matches for today (${format(currentDate, 'yyyy-MM-dd')}) and yesterday (${format(yesterday, 'yyyy-MM-dd')})`);
    
    for (const date of [yesterday, currentDate]) {
        const matches = await fetchMatches(date);
        if (matches) {
            const filteredMatches = filterMatchesByLeague(matches);
            console.log(`Filtered ${filteredMatches.length} out of ${matches.length} matches for allowed leagues`);
            const processedMatches = filteredMatches.map(processMatchData);
            await updateMatchesInMongoDB(processedMatches);
        } else {
            console.log(`No matches found for ${format(date, 'yyyy-MM-dd')}`);
        }
    }
}

module.exports = main;