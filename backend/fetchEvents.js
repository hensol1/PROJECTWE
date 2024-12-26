 //backend/fetchEvents.js
const axios = require('axios');
const Event = require('./models/Event');

const API_KEY = "5f3eb3a125615327d83d13e16a1a7f77";
const BASE_URL = "https://v3.football.api-sports.io";
const HEADERS = { 
    "x-rapidapi-key": API_KEY, 
    "x-rapidapi-host": "v3.football.api-sports.io" 
};

// Function to fetch events for a single match (for individual API calls)
async function fetchAndStoreEvents(matchId) {
    try {
        console.log(`Fetching events for match ${matchId}`);
        
        const fixtureId = matchId.replace('api2_', '');
        
        const response = await axios.get(`${BASE_URL}/fixtures/events`, {
            headers: HEADERS,
            params: {
                fixture: fixtureId
            }
        });

        if (!response.data || response.data.results === 0) {
            console.log(`No events found for match ${matchId}`);
            return [];
        }

        const events = response.data.response.map(event => ({
            matchId,
            time: {
                elapsed: event.time.elapsed,
                extra: event.time.extra
            },
            team: {
                id: event.team.id,
                name: event.team.name,
                logo: event.team.logo
            },
            player: event.player ? {
                id: event.player.id,
                name: event.player.name
            } : null,
            assist: event.assist ? {
                id: event.assist.id,
                name: event.assist.name
            } : null,
            type: event.type,
            detail: event.detail,
            comments: event.comments
        }));

        await Event.deleteMany({ matchId });
        if (events.length > 0) {
            await Event.insertMany(events);
        }

        console.log(`Successfully stored ${events.length} events for match ${matchId}`);
        return events;
    } catch (error) {
        console.error(`Error fetching events:`, error.response?.data || error.message);
        return [];
    }
}

// Function to fetch events for all live matches in one call
async function fetchAndStoreAllLiveEvents() {
    try {
        console.log('Fetching events for all live matches');
        
        const response = await axios.get(`${BASE_URL}/fixtures`, {
            headers: HEADERS,
            params: {
                live: 'all'
            }
        });

        console.log(`API Response: Found ${response.data.results} live matches`);

        if (!response.data || response.data.results === 0) {
            console.log('No live matches found');
            return [];
        }

        for (const fixture of response.data.response) {
            const matchId = `api2_${fixture.fixture.id}`;
            const events = fixture.events?.map(event => ({
                matchId,
                time: {
                    elapsed: event.time.elapsed,
                    extra: event.time.extra
                },
                team: {
                    id: event.team.id,
                    name: event.team.name,
                    logo: event.team.logo
                },
                player: event.player ? {
                    id: event.player.id,
                    name: event.player.name
                } : null,
                assist: event.assist ? {
                    id: event.assist.id,
                    name: event.assist.name
                } : null,
                type: event.type,
                detail: event.detail,
                comments: event.comments
            })) || [];

            await Event.deleteMany({ matchId });
            if (events.length > 0) {
                await Event.insertMany(events);
                console.log(`Stored ${events.length} events for match ${matchId}`);
            }
        }

        return true;
    } catch (error) {
        console.error('Error fetching live events:', error.response?.data || error.message);
        return false;
    }
}

module.exports = {
    fetchAndStoreEvents,         // For individual match events
    fetchAndStoreAllLiveEvents   // For bulk live events
};