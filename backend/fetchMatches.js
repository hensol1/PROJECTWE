const axios = require('axios');
const { MongoClient } = require('mongodb');
const { format, subDays, addDays } = require('date-fns');

// API-Football Configuration
const API_KEY = "5f3eb3a125615327d83d13e16a1a7f77";
const BASE_URL = "https://v3.football.api-sports.io";
const HEADERS = { "x-rapidapi-key": API_KEY, "x-rapidapi-host": "v3.football.api-sports.io" };

// MongoDB Configuration
const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = "test";
const COLLECTION_NAME = "matches";

// Add the delay function at the top level
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// List of league IDs to filter
const ALLOWED_LEAGUE_IDS = [253, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 17, 20, 29, 30, 34, 36, 39, 40, 45, 48, 61, 62, 78, 79, 81, 88, 90, 94, 96, 103, 106, 113, 119, 135, 137, 140, 143, 144, 169, 172, 179, 188, 197, 199, 203, 207, 210, 218, 233, 235, 253, 271, 283, 286, 307, 318, 327, 333, 345, 373, 383, 384, 385, 848];

// Active match statuses
const ACTIVE_STATUSES = ['IN_PLAY', 'HALFTIME', 'PAUSED', 'LIVE'];

async function fetchMatches(date) {
    console.log('Fetching matches for dates:');
    const currentDateStr = format(date, 'yyyy-MM-dd');
    const previousDateStr = format(subDays(date, 1), 'yyyy-MM-dd');
    const nextDateStr = format(addDays(date, 1), 'yyyy-MM-dd');

    console.log(`Previous day: ${previousDateStr}`);
    console.log(`Current day: ${currentDateStr}`);
    console.log(`Next day: ${nextDateStr}`);

    try {
        // Fetch matches for all three days in parallel
        const [previousDayResponse, currentDayResponse, nextDayResponse] = await Promise.all([
            axios.get(`${BASE_URL}/fixtures`, { 
                headers: HEADERS, 
                params: { date: previousDateStr } 
            }),
            axios.get(`${BASE_URL}/fixtures`, { 
                headers: HEADERS, 
                params: { date: currentDateStr } 
            }),
            axios.get(`${BASE_URL}/fixtures`, { 
                headers: HEADERS, 
                params: { date: nextDateStr } 
            })
        ]);

        let matches = [];

        // Process current day matches
        if (currentDayResponse.data.results > 0) {
            console.log(`Found ${currentDayResponse.data.results} matches for current day`);
            matches = matches.concat(currentDayResponse.data.response);
        }

        // Add previous day's unfinished matches (not just active)
        if (previousDayResponse.data.results > 0) {
            const unfinishedMatches = previousDayResponse.data.response.filter(match => {
                const isUnfinished = !['FINISHED', 'CANCELLED', 'POSTPONED', 'ABANDONED'].includes(match.fixture.status.short);
                if (isUnfinished) {
                    console.log(`Found unfinished match from previous day: ${match.league.name} - ${match.teams.home.name} vs ${match.teams.away.name} (Status: ${match.fixture.status.short})`);
                }
                return isUnfinished;
            });
            matches = matches.concat(unfinishedMatches);
        }

        // Add next day's early started matches
        if (nextDayResponse.data.results > 0) {
            const activeMatches = nextDayResponse.data.response.filter(match => {
                const isActive = ACTIVE_STATUSES.includes(match.fixture.status.short);
                if (isActive) {
                    console.log(`Found active match from next day: ${match.league.name} - ${match.teams.home.name} vs ${match.teams.away.name} (Status: ${match.fixture.status.short})`);
                }
                return isActive;
            });
            matches = matches.concat(activeMatches);
        }

        console.log(`Found total ${matches.length} matches for ${currentDateStr} (including matches from adjacent days)`);
        return matches;
    } catch (error) {
        console.error(`Error fetching data: ${error.message}`);
        return null;
    }
}

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

        // Collect all Match Winner odds for harmonic mean calculation
        const allMatchWinnerOdds = {
            home: [],
            draw: [],
            away: []
        };

        // Format odds data for storage, filtering only Match Winner and To Qualify bets
        const formattedOdds = {
            update: new Date(oddsData.update),
            bookmakers: []
        };

        for (const bookmaker of oddsData.bookmakers) {
            // Filter only the bets we want
            const desiredBets = bookmaker.bets.filter(bet => 
                bet.name === "Match Winner" || bet.name === "To Qualify"
            );

            // Collect Match Winner odds for harmonic mean
            const matchWinnerBet = bookmaker.bets.find(bet => bet.name === "Match Winner");
            if (matchWinnerBet) {
                matchWinnerBet.values.forEach(value => {
                    const odd = parseFloat(value.odd);
                    if (value.value.toLowerCase() === "home") {
                        allMatchWinnerOdds.home.push(odd);
                    } else if (value.value.toLowerCase() === "draw") {
                        allMatchWinnerOdds.draw.push(odd);
                    } else if (value.value.toLowerCase() === "away") {
                        allMatchWinnerOdds.away.push(odd);
                    }
                });
            }

            // Only include bookmaker if it has any of our desired bets
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

        // Calculate harmonic means
        const calculateHarmonicMean = (numbers) => {
            if (numbers.length === 0) return null;
            const sum = numbers.reduce((acc, val) => acc + (1 / val), 0);
            return numbers.length / sum;
        };

        // Add harmonic means to the response
        formattedOdds.harmonicMeanOdds = {
            home: calculateHarmonicMean(allMatchWinnerOdds.home),
            draw: calculateHarmonicMean(allMatchWinnerOdds.draw),
            away: calculateHarmonicMean(allMatchWinnerOdds.away)
        };

        // Calculate implied probabilities from harmonic means
        const total = (1/formattedOdds.harmonicMeanOdds.home) + 
                     (1/formattedOdds.harmonicMeanOdds.draw) + 
                     (1/formattedOdds.harmonicMeanOdds.away);

        formattedOdds.impliedProbabilities = {
            home: ((1/formattedOdds.harmonicMeanOdds.home) / total * 100).toFixed(2),
            draw: ((1/formattedOdds.harmonicMeanOdds.draw) / total * 100).toFixed(2),
            away: ((1/formattedOdds.harmonicMeanOdds.away) / total * 100).toFixed(2)
        };

        console.log(`Successfully processed odds for fixture ${fixtureId}:`);
        console.log(`Harmonic mean odds - Home: ${formattedOdds.harmonicMeanOdds.home.toFixed(2)}, Draw: ${formattedOdds.harmonicMeanOdds.draw.toFixed(2)}, Away: ${formattedOdds.harmonicMeanOdds.away.toFixed(2)}`);
        console.log(`Implied probabilities - Home: ${formattedOdds.impliedProbabilities.home}%, Draw: ${formattedOdds.impliedProbabilities.draw}%, Away: ${formattedOdds.impliedProbabilities.away}%`);

        return formattedOdds;

    } catch (error) {
        console.error(`Error fetching odds for fixture ${fixtureId}:`, error.message);
        return null;
    }
}

async function processMatchData(match) {
    try {
        await delay(1000);

        // First check if we already have this match with odds in MongoDB
        const client = new MongoClient(MONGO_URI);
        try {
            await client.connect();
            const db = client.db(DB_NAME);
            const collection = db.collection(COLLECTION_NAME);
            const existingMatch = await collection.findOne({ id: `api2_${match.fixture.id}` });
            
            const processedMatch = {
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
                    winner: match.teams.home.winner ? 'HOME_TEAM' : 
                           match.teams.away.winner ? 'AWAY_TEAM' : 
                           null,
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

            // Only fetch odds if:
            // 1. Match is upcoming (TIMED or SCHEDULED)
            // 2. We don't already have odds stored
            // 3. Match date is within 14 days
            const isUpcoming = ['TIMED', 'SCHEDULED'].includes(processedMatch.status);
            const hasStoredOdds = existingMatch?.odds != null;
            const matchDate = new Date(match.fixture.date);
            const daysUntilMatch = Math.ceil((matchDate - new Date()) / (1000 * 60 * 60 * 24));
            const isWithinOddsWindow = daysUntilMatch <= 14 && daysUntilMatch >= -7;

            const shouldFetchOdds = isUpcoming && !hasStoredOdds && isWithinOddsWindow;

            if (shouldFetchOdds) {
                console.log(`Fetching odds for upcoming match ${match.fixture.id} (no existing odds found)`);
                const odds = await fetchOdds(match.fixture.id);
                if (odds) {
                    processedMatch.odds = odds;
                    console.log(`Successfully added odds for match ${match.fixture.id}`);
                }
            } else {
                // Preserve existing odds if they exist
                if (existingMatch?.odds) {
                    processedMatch.odds = existingMatch.odds;
                    console.log(`Using existing odds for match ${match.fixture.id}`);
                }
            }

            return processedMatch;
        } finally {
            await client.close();
        }
    } catch (error) {
        console.error(`Error processing match data:`, error);
        return null;
    }
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
            const existingMatch = await collection.findOne({ id: match.id });
            
            // Merge the new data with existing data
            const updatedMatch = {
                ...match,
                votes: existingMatch?.votes || { home: 0, draw: 0, away: 0 },
                voters: existingMatch?.voters || [],
                voterIPs: existingMatch?.voterIPs || [],
                aiPrediction: existingMatch?.aiPrediction || null,
                processed: existingMatch?.processed || false,
                // Preserve existing odds if new ones weren't fetched
                odds: match.odds || existingMatch?.odds || null
            };

            const result = await collection.updateOne(
                { id: match.id },
                { $set: updatedMatch },
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
    const filteredMatches = matches.filter(match => {
        const isAllowed = ALLOWED_LEAGUE_IDS.includes(match.league.id);
        console.log(`Match: ${match.teams.home.name} vs ${match.teams.away.name}`);
        console.log(`  League ID: ${match.league.id} (${match.league.name})`);
        console.log(`  Status: ${match.fixture.status.short}`);
        console.log(`  Date: ${match.fixture.date}`);
        console.log(`  Included: ${isAllowed ? 'Yes' : 'No'}`);
        console.log('---');
        return isAllowed;
    });
    return filteredMatches;
}

async function processMatchesForDate(date) {
    console.log(`\n=== Processing matches for date: ${format(date, 'yyyy-MM-dd')} ===`);
    
    const matches = await fetchMatches(date);
    if (!matches) {
        console.log('No matches found');
        return { total: 0, filtered: 0, processed: 0 };
    }

    const filteredMatches = filterMatchesByLeague(matches);
    console.log(`Filtered ${filteredMatches.length} out of ${matches.length} matches for allowed leagues`);
    
    const processedMatches = [];
    for (const match of filteredMatches) {
        const processedMatch = await processMatchData(match);
        if (processedMatch) {
            processedMatches.push(processedMatch);
        }
    }

    const updatedCount = await updateMatchesInMongoDB(processedMatches);
    
    return {
        total: matches.length,
        filtered: filteredMatches.length,
        processed: updatedCount
    };
}

async function hasActiveMatches() {
    console.log('Checking for active matches...');
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);
        
        const now = new Date();
        const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

        const potentiallyActiveMatches = await collection.find({
            $or: [
                { status: { $in: ACTIVE_STATUSES } },
                {
                    utcDate: { 
                        $gte: threeHoursAgo.toISOString(),
                        $lte: now.toISOString()
                    },
                    status: { 
                        $nin: ['FINISHED', 'CANCELLED', 'POSTPONED', 'ABANDONED'] 
                    }
                }
            ]
        }).toArray();

        if (potentiallyActiveMatches.length > 0) {
            for (const match of potentiallyActiveMatches) {
                const matchTime = new Date(match.utcDate);
                const minutesSinceStart = Math.floor((now - matchTime) / (1000 * 60));
                console.log(`Found potentially active match:`);
                console.log(`- ${match.homeTeam.name} vs ${match.awayTeam.name}`);
                console.log(`  Status: ${match.status}`);
                console.log(`  Minutes since start: ${minutesSinceStart}`);

                // If match should have started but still shows as TIMED
                if (minutesSinceStart > 0 && ['TIMED', 'SCHEDULED'].includes(match.status)) {
                    // Check the actual status from API
                    try {
                        const response = await axios.get(`${BASE_URL}/fixtures`, {
                            headers: HEADERS,
                            params: { id: match.id.replace('api2_', '') }
                        });

                        if (response.data.results > 0) {
                            const actualMatch = response.data.response[0];
                            const isActive = ACTIVE_STATUSES.includes(actualMatch.fixture.status.short);
                            if (isActive) {
                                return true;
                            }
                        }
                    } catch (error) {
                        console.error(`Error checking match status: ${error.message}`);
                    }
                    // Even if API check fails, if match should have started, consider it active
                    return true;
                }

                // If match is already marked as active
                if (ACTIVE_STATUSES.includes(match.status)) {
                    return true;
                }
            }
        }

        return false;
    } catch (error) {
        console.error('Error in hasActiveMatches:', error);
        return false;
    } finally {
        await client.close();
    }
}

async function getNextScheduledMatch() {
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);
        
        return await collection.findOne({
            status: { $in: ['TIMED', 'SCHEDULED'] },
            utcDate: { $gt: new Date().toISOString() }
        }, {
            sort: { utcDate: 1 }
        });
    } finally {
        await client.close();
    }
}

module.exports = {
    processMatchesForDate,
    hasActiveMatches,
    getNextScheduledMatch,
    ACTIVE_STATUSES,
    default: () => processMatchesForDate(new Date())
};
