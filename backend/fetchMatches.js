const axios = require('axios');
const { MongoClient } = require('mongodb');
const { format, subDays } = require('date-fns'); // Add subDays to the imports

// API-Football Configuration
const API_KEY = "5f3eb3a125615327d83d13e16a1a7f77";
const BASE_URL = "https://v3.football.api-sports.io";
const HEADERS = { "x-rapidapi-key": API_KEY, "x-rapidapi-host": "v3.football.api-sports.io" };

// MongoDB Configuration
const MONGO_URI = "mongodb+srv://weknowbetteradmin:dMMZV14rCKTYLJXG@cluster0.sbr1j.mongodb.net/";
const DB_NAME = "test";
const COLLECTION_NAME = "matches";

// List of league IDs to filter
const ALLOWED_LEAGUE_IDS = [253, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 17, 20, 29, 30, 34, 36, 39, 40, 45, 48, 61, 62, 71, 78, 79, 81, 88, 90, 94, 96, 103, 106, 113, 119, 128, 135, 137, 140, 143, 144, 169, 172, 179, 188, 197, 199, 203, 207, 210, 218, 233, 235, 253, 271, 283, 286, 307, 318, 327, 333, 345, 373, 383, 384, 385, 567, 848];

async function fetchMatches(date) {
    // Fetch both current date and previous day to catch ongoing matches
    const currentDateStr = format(date, 'yyyy-MM-dd');
    const previousDateStr = format(subDays(date, 1), 'yyyy-MM-dd');

    try {
        // Fetch matches for both dates
        const [currentDayResponse, previousDayResponse] = await Promise.all([
            axios.get(`${BASE_URL}/fixtures`, { 
                headers: HEADERS, 
                params: { date: currentDateStr } 
            }),
            axios.get(`${BASE_URL}/fixtures`, { 
                headers: HEADERS, 
                params: { date: previousDateStr } 
            })
        ]);

        let matches = [];

        // Process current day matches
        if (currentDayResponse.data.results > 0) {
            matches = matches.concat(currentDayResponse.data.response);
        }

        // Add previous day's IN_PLAY matches only
        if (previousDayResponse.data.results > 0) {
            const liveMatches = previousDayResponse.data.response.filter(match => 
                ['IN_PLAY', 'HALFTIME', 'PAUSED', 'LIVE'].includes(match.fixture.status.short)
            );
            matches = matches.concat(liveMatches);
        }

        console.log(`Found total ${matches.length} matches for ${currentDateStr} (including live from previous day)`);
        return matches;
    } catch (error) {
        console.error(`Error fetching data: ${error.message}`);
        return null;
    }
}


function processMatchData(match) {
    return {
        id: `api2_${match.fixture.id}`,
        source: "API2",
        competition: {
            id: match.league.id,
            name: match.league.name,
            emblem: match.league.logo,
            country: {
                name: match.league.country,
                flag: match.league.flag
            }
        },
        utcDate: match.fixture.date,
        status: mapStatus(match.fixture.status.short),
        minute: match.fixture.status.elapsed,
        matchPeriod: match.fixture.status.long,
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
        return updatedCount;
    } finally {
        await client.close();
    }
}

function filterMatchesByLeague(matches) {
    return matches.filter(match => ALLOWED_LEAGUE_IDS.includes(match.league.id));
}

async function processMatchesForDate(date) {
    console.log(`Processing matches for date: ${format(date, 'yyyy-MM-dd')}`);
    
    const matches = await fetchMatches(date);
    if (matches) {
        const filteredMatches = filterMatchesByLeague(matches);
        console.log(`Filtered ${filteredMatches.length} out of ${matches.length} matches for allowed leagues`);
        const processedMatches = filteredMatches.map(processMatchData);
        const updatedCount = await updateMatchesInMongoDB(processedMatches);
        
        return {
            total: matches.length,
            filtered: filteredMatches.length,
            processed: updatedCount
        };
    }
    
    return {
        total: 0,
        filtered: 0,
        processed: 0
    };
}

// Export both the date-specific function and a default current date function
module.exports = {
    processMatchesForDate,
    default: () => processMatchesForDate(new Date())
};
