const axios = require('axios');
const { MongoClient } = require('mongodb');

// API-Football Configuration
const API_KEY = "5f3eb3a125615327d83d13e16a1a7f77";
const BASE_URL = "https://v3.football.api-sports.io";
const HEADERS = { "x-rapidapi-key": API_KEY, "x-rapidapi-host": "v3.football.api-sports.io" };

// MongoDB Configuration
const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = "test";
const COLLECTION_NAME = "matches";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchOdds(fixtureId) {
    try {
        console.log(`\nFetching odds for fixture ${fixtureId}...`);
        
        const response = await axios.get(`${BASE_URL}/odds`, {
            headers: HEADERS,
            params: {
                fixture: fixtureId
            }
        });

        if (!response.data || response.data.results === 0) {
            console.log(`No odds data returned for fixture ${fixtureId}`);
            return null;
        }

        const oddsData = response.data.response[0];
        if (!oddsData || !oddsData.bookmakers || oddsData.bookmakers.length === 0) {
            console.log(`No bookmakers data found for fixture ${fixtureId}`);
            return null;
        }

        const allMatchWinnerOdds = { home: [], draw: [], away: [] };
        const formattedOdds = {
            update: new Date(oddsData.update),
            bookmakers: []
        };

        for (const bookmaker of oddsData.bookmakers) {
            const desiredBets = bookmaker.bets.filter(bet => 
                bet.name === "Match Winner" || bet.name === "To Qualify"
            );

            const matchWinnerBet = bookmaker.bets.find(bet => bet.name === "Match Winner");
            if (matchWinnerBet) {
                matchWinnerBet.values.forEach(value => {
                    const odd = parseFloat(value.odd);
                    if (value.value.toLowerCase() === "home") allMatchWinnerOdds.home.push(odd);
                    else if (value.value.toLowerCase() === "draw") allMatchWinnerOdds.draw.push(odd);
                    else if (value.value.toLowerCase() === "away") allMatchWinnerOdds.away.push(odd);
                });
            }

            if (desiredBets.length > 0) {
                formattedOdds.bookmakers.push({
                    id: bookmaker.id,
                    name: bookmaker.name,
                    bets: desiredBets.map(bet => ({
                        id: bet.id,
                        name: bet.name,
                        values: bet.values.map(value => ({
                            value: value.value,
                            odd: parseFloat(value.odd)
                        }))
                    }))
                });
            }
        }

        const calculateHarmonicMean = (numbers) => {
            if (numbers.length === 0) return null;
            const sum = numbers.reduce((acc, val) => acc + (1 / val), 0);
            return numbers.length / sum;
        };

        formattedOdds.harmonicMeanOdds = {
            home: calculateHarmonicMean(allMatchWinnerOdds.home),
            draw: calculateHarmonicMean(allMatchWinnerOdds.draw),
            away: calculateHarmonicMean(allMatchWinnerOdds.away)
        };

        const total = (1/formattedOdds.harmonicMeanOdds.home) + 
                     (1/formattedOdds.harmonicMeanOdds.draw) + 
                     (1/formattedOdds.harmonicMeanOdds.away);

        formattedOdds.impliedProbabilities = {
            home: ((1/formattedOdds.harmonicMeanOdds.home) / total * 100).toFixed(2),
            draw: ((1/formattedOdds.harmonicMeanOdds.draw) / total * 100).toFixed(2),
            away: ((1/formattedOdds.harmonicMeanOdds.away) / total * 100).toFixed(2)
        };

        return formattedOdds;
    } catch (error) {
        console.error(`Error fetching odds for fixture ${fixtureId}:`, error.message);
        return null;
    }
}

async function processOddsForDate(date) {
    console.log(`Processing odds for date: ${date}`);
    const client = new MongoClient(MONGO_URI);
    
    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        // Get all upcoming matches for the date that don't have odds
        const matches = await collection.find({
            utcDate: { $regex: `^${date}` },
            status: { $in: ['TIMED', 'SCHEDULED'] }
        }).toArray();

        console.log(`Found ${matches.length} matches to process odds for`);
        let updatedCount = 0;

        for (const match of matches) {
            await delay(1000); // Respect API rate limits
            const fixtureId = match.id.replace('api2_', '');
            const odds = await fetchOdds(fixtureId);
            
            if (odds) {
                const result = await collection.updateOne(
                    { id: match.id },
                    { $set: { odds: odds } }
                );
                
                if (result.modifiedCount > 0) {
                    updatedCount++;
                    console.log(`Updated odds for match ${match.id}`);
                }
            }
        }

        return {
            total: matches.length,
            updated: updatedCount
        };
    } finally {
        await client.close();
    }
}

module.exports = {
    processOddsForDate
};