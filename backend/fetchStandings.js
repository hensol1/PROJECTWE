const axios = require('axios');
const mongoose = require('mongoose');
const Standing = require('./models/Standing');
require('dotenv').config();

const API_KEY = "5f3eb3a125615327d83d13e16a1a7f77";
const BASE_URL = "https://v3.football.api-sports.io";
const HEADERS = { 
    "x-rapidapi-key": API_KEY, 
    "x-rapidapi-host": "v3.football.api-sports.io"
};

// Use the MONGODB_URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

// MongoDB Connection function
async function connectToMongoDB() {
    if (mongoose.connection.readyState === 1) {
        console.log('MongoDB already connected');
        return;
    }
    
    try {
        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }
        
        mongoose.set('strictQuery', false);
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

const ALLOWED_LEAGUE_IDS = [253, 2, 3, 4, 5, 9, 11, 12, 13, 17, 20, 39, 40, 61, 62, 71, 78, 79, 88, 94, 103, 106, 113, 119, 128, 135, 140, 144, 169, 172, 179, 188, 197, 203, 207, 210, 218, 233, 235, 253, 271, 283, 286, 307, 318, 327, 333, 345, 373, 383, 848];

function getCurrentSeason() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    return currentMonth < 8 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
}

async function fetchStandings(leagueId, season = getCurrentSeason()) {
    // Ensure MongoDB is connected
    await connectToMongoDB();

    if (!ALLOWED_LEAGUE_IDS.includes(leagueId)) {
        console.log(`League ${leagueId} is not in the allowed leagues list. Skipping.`);
        return {
            success: false,
            error: 'LEAGUE_NOT_ALLOWED',
            details: 'League is not in the allowed leagues list'
        };
    }

    try {
        console.log(`Fetching standings for league ${leagueId} season ${season}`);

        const response = await axios.get(`${BASE_URL}/standings`, {
            headers: HEADERS,
            params: {
                league: leagueId,
                season: season
            },
            timeout: 10000
        });

        console.log(`Raw API response for league ${leagueId}:`, {
            status: response.status,
            hasData: !!response.data,
            results: response.data?.results,
            responseLength: response.data?.response?.length
        });

        if (response.data?.errors && Object.keys(response.data.errors).length > 0) {
            throw new Error(`API returned errors: ${JSON.stringify(response.data.errors)}`);
        }

        if (!response.data || response.data.results === 0 || !response.data.response[0]) {
            console.log(`No standings data available for league ${leagueId} season ${season}`);
            return {
                success: false,
                error: 'NO_DATA',
                details: 'No standings data available'
            };
        }

        const standingsData = response.data.response[0].league;
        
        if (!standingsData.standings || !standingsData.standings[0]) {
            throw new Error(`Invalid standings data structure for league ${leagueId}`);
        }

        const currentTime = new Date();

        // Delete existing document if it exists
        await Standing.deleteOne({ leagueId, season });
        console.log(`Deleted existing standings for league ${leagueId}`);

        // Create new document
        const newStanding = new Standing({
            leagueId,
            season,
            leagueName: standingsData.name,
            standings: standingsData.standings[0],
            lastUpdated: currentTime,
            lastSuccessfulFetch: currentTime,
            noStandingsAvailable: false
        });

        // Save the new document
        await newStanding.save();
        console.log(`Saved new standings for league ${leagueId}`);

        // Verify the save
        const verifiedDoc = await Standing.findOne({ leagueId, season });
        if (!verifiedDoc) {
            throw new Error('Standing verification failed - document not found after save');
        }

        console.log(`Successfully updated standings for league ${leagueId} season ${season}`);
        console.log(`Verified document updated at: ${verifiedDoc.lastUpdated}`);

        return {
            success: true,
            leagueId,
            season,
            updatedAt: currentTime
        };

    } catch (error) {
        const errorDetails = {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            apiErrors: error.response?.data?.errors,
            timestamp: new Date().toISOString()
        };

        console.error(`Error fetching standings for league ${leagueId} season ${season}:`, errorDetails);

        // Create error document if needed
        await Standing.findOneAndUpdate(
            { leagueId, season },
            {
                $push: {
                    fetchErrors: {
                        timestamp: new Date(),
                        error: errorDetails
                    }
                }
            },
            { upsert: true }
        );

        return {
            success: false,
            error: error.response?.status === 403 ? 'API_PERMISSION_DENIED' : 'FETCH_ERROR',
            details: errorDetails
        };
    }
}

// Cleanup function to close MongoDB connection
async function cleanup() {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    }
}

module.exports = {
    processStandings: fetchStandings,
    ALLOWED_LEAGUE_IDS,
    getCurrentSeason,
    cleanup
};