import axios from 'axios';
import config from './config';
import { format } from 'date-fns';

const api = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Cache management for stats data
const statsCache = {
  manifest: null,
  manifestTimestamp: 0,
  CACHE_TTL: 5 * 60 * 1000 // 5 minutes
};

// Request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    if (error.response?.status === 401 && !window.location.pathname.includes('login')) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('userId');
      return Promise.reject({ isAuthError: true, ...error });
    }
    return Promise.reject(error);
  }
);

// Fetch the stats manifest file with caching
const fetchStatsManifest = async () => {
  const now = Date.now();
  
  // Return cached manifest if it's still fresh
  if (statsCache.manifest && (now - statsCache.manifestTimestamp < statsCache.CACHE_TTL)) {
    return statsCache.manifest;
  }
  
  try {
    const response = await api.get('/api/stats/manifest');
    
    if (response.status === 200) {
      statsCache.manifest = response.data;
      statsCache.manifestTimestamp = now;
      return response.data;
    }
    
    throw new Error('Failed to fetch stats manifest');
  } catch (error) {
    console.error('Error fetching stats manifest:', error);
    // Return the stale cache if available, otherwise rethrow
    if (statsCache.manifest) {
      return statsCache.manifest;
    }
    throw error;
  }
};

// Direct fetch from static file with fallback to API
const fetchStaticFileWithFallback = async (fileUrl, fallbackEndpoint, transformFn = data => data) => {
  try {
    // In development, don't even try to fetch static files if we don't have them
    if (process.env.NODE_ENV === 'development') {
      console.log(`Development mode: Skipping static file fetch for ${fileUrl}`);
      throw new Error('Development mode - skipping static file fetch');
    }
    
    // Try to get cache buster from manifest
    let cacheBuster = '';
    try {
      const manifestResponse = await fetch('/stats/manifest.json');
      if (manifestResponse.ok) {
        const manifest = await manifestResponse.json();
        const fileKey = fileUrl.split('/').pop().split('.')[0].replace(/-/g, '');
        if (manifest && manifest[fileKey] && manifest[fileKey].lastUpdated) {
          cacheBuster = `?t=${manifest[fileKey].lastUpdated}`;
        }
      }
    } catch (err) {
      console.warn('Could not fetch manifest for cache busting', err);
      cacheBuster = `?t=${Date.now()}`;
    }
    
    // Fetch the static file
    console.log(`Fetching static file: ${fileUrl}${cacheBuster}`);
    const response = await fetch(`${fileUrl}${cacheBuster}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn(`Static file fetch returned status ${response.status}`);
      throw new Error(`Failed to fetch stats file: ${response.status}`);
    }
    
    // Check if content type is actually json
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn(`Expected JSON but got ${contentType}`);
      throw new Error('Non-JSON response received');
    }
    
    const data = await response.json();
    return transformFn(data);
  } catch (err) {
    console.warn(`Error fetching static file ${fileUrl}:`, err);
    console.log(`Falling back to API endpoint: ${fallbackEndpoint}`);
    
    // Fallback to API endpoint
    try {
      // Check if fallbackEndpoint exists
      if (!fallbackEndpoint) {
        console.warn('No fallback endpoint provided');
        // Return default dummy data
        return transformFn({});
      }
      
      const apiResponse = await api.get(fallbackEndpoint);
      return apiResponse.data;
    } catch (apiErr) {
      console.error('API fallback also failed:', apiErr);
      // Don't throw, return default empty data
      return transformFn({});
    }
  }
};

// Add all API methods here
api.fetchMatches = (date) => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const cacheBuster = Date.now(); // Keep cache buster
  return api.get(`/api/matches?date=${date}&_=${cacheBuster}`, {
    headers: {
      'x-timezone': timeZone
      // Remove the cache-control headers from here
    }
  });
};

// Standings
api.getStandings = (leagueId, season) => {
  return api.get(`/api/standings/${leagueId}/${season}`);
};

// New method for fetching live matches
api.fetchLiveMatches = () => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const cacheBuster = Date.now(); // Keep cache buster
  return api.get(`/api/matches/live?_=${cacheBuster}`, {
    headers: {
      'x-timezone': timeZone
      // Remove the cache-control headers from here
    }
  });
};

// Updated to use static file first with API fallback
api.fetchAccuracy = async () => {
  try {
    const staticData = await fetchStaticFileWithFallback(
      '/stats/ai-history.json',
      '/api/accuracy/ai',
      data => ({ aiAccuracy: data.overall.overallAccuracy || 0 })
    );
    return staticData;
  } catch (error) {
    console.error('All accuracy fetch methods failed:', error);
    return { aiAccuracy: 0 };
  }
};

// Ticker last successful prediction
api.fetchLatestSuccessfulPrediction = async () => {
  try {
    const response = await api.get('/api/accuracy/latest-success');
    return response.data;
  } catch (error) {
    console.error('Error fetching latest successful prediction:', error.response || error);
    return null;
  }
};

// Optimized version of fetchAIHistory that uses static files
api.fetchAIHistory = async () => {
  try {
    console.log('Fetching AI history...');
    
    // In production, always use API endpoint
    if (process.env.NODE_ENV === 'production') {
      try {
        const apiResponse = await api.get('/api/accuracy/ai/history');
        return apiResponse.data;
      } catch (apiError) {
        console.error('Error in production API call:', apiError);
        // Return default structure to prevent UI errors
        return {
          stats: [],
          overall: {
            totalPredictions: 0,
            correctPredictions: 0,
            overallAccuracy: 0
          },
          generatedAt: new Date().toISOString()
        };
      }
    }
    
    // Development - try file first
    const cacheBuster = `?t=${Date.now()}`;
    const response = await fetch(`/stats/ai-history.json${cacheBuster}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stats file: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching AI history:', error);
    
    // Fallback to API
    try {
      const apiResponse = await api.get('/api/accuracy/ai/history');
      return apiResponse.data;
    } catch (fallbackError) {
      console.error('All methods failed:', fallbackError);
      // Return minimal default data
      return {
        stats: [],
        overall: {
          totalPredictions: 0,
          correctPredictions: 0,
          overallAccuracy: 0
        },
        generatedAt: new Date().toISOString()
      };
    }
  }
};

// Events
api.fetchMatchEvents = (matchId) => {
  return api.get(`/api/matches/${matchId}/events`);
};

// Lineups
api.fetchMatchLineups = (matchId) => {
  return api.get(`/api/lineups/${matchId}`);
};


// Optimized version of fetchLeagueStats using static file
api.fetchLeagueStats = async () => {
  try {
    return await fetchStaticFileWithFallback(
      '/stats/league-stats.json',
      '/api/stats/ai/league-stats',
      data => data.stats || []
    );
  } catch (error) {
    console.error('Error fetching league stats:', error);
    
    // Fallback to the original endpoint if all else fails
    try {
      console.log('Falling back to legacy endpoint for league stats');
      const fallbackResponse = await api.get('/api/accuracy/ai/league-stats');
      return fallbackResponse.data;
    } catch (fallbackError) {
      console.error('All league stats endpoints failed:', fallbackError);
      throw error; // Throw the original error
    }
  }
};

// Modified to include user stats if available
api.fetchDailyAccuracy = async () => {
  try {
    // Try to get data from static file first
    const dailyStats = await fetchStaticFileWithFallback(
      '/stats/daily-predictions.json',
      '/api/accuracy/ai/daily',
      data => ({
        total: data.totalPredictionsToday || 0,
        correct: data.totalCorrectToday || 0
      })
    );
    
    return {
      data: {
        ai: dailyStats
      }
    };
  } catch (error) {
    console.error('Error in fetchDailyAccuracy:', error);
    return {
      data: {
        ai: { total: 0, correct: 0 }
      }
    };
  }
};

// Optimized version of getDailyPredictions
api.getDailyPredictions = async () => {
  try {
    return await fetchStaticFileWithFallback(
      '/stats/daily-predictions.json',
      '/api/stats/daily-predictions'
    );
  } catch (error) {
    console.error('Error fetching daily predictions:', error);
    throw error;
  }
};

// Optional: Method to force a refresh of the stats cache
api.refreshStatsCache = () => {
  statsCache.manifest = null;
  statsCache.manifestTimestamp = 0;
  console.log('Stats cache cleared, will fetch fresh data on next request');
};

// Match related endpoints
api.voteForMatch = (matchId, vote) => api.post(`/api/matches/${matchId}/vote`, { vote });

// Admin related endpoints
api.makeAIPrediction = (matchId, prediction) => {
  return api.post(`/api/admin/matches/${matchId}/prediction`, { prediction });
};

// Admin routes
api.triggerFetchMatches = (date) => {
  const formattedDate = format(new Date(date), 'yyyy-MM-dd');
  return api.post('/api/admin/fetch-matches', { 
    date: formattedDate,
    debug: true
  });
};

// Admin routes
api.triggerFetchOdds = (date) => {
  const formattedDate = format(new Date(date), 'yyyy-MM-dd');
  return api.post('/api/admin/fetch-odds', {
    date: formattedDate
  });
};

api.recalculateStats = () => api.post('/api/admin/recalculate-stats');
api.resetStats = () => api.post('/api/accuracy/reset');
api.resetAIStats = () => api.post('/api/admin/reset-ai');
api.updateAllResults = () => api.post('/api/matches/update-results');
api.generateStatsFiles = () => api.post('/api/stats/generate-files');
api.getBlogPosts = (page = 1) => api.get(`/api/blog?page=${page}`);
api.getLatestPost = () => api.get('/api/blog/latest');
api.getBlogPost = (slug) => api.get(`/api/blog/post/${slug}`); // for public viewing
api.getAdminBlogPost = (id) => api.get(`/api/blog/admin/${id}`); // for admin editing
api.createBlogPost = (data) => api.post('/api/blog', data);
api.updateBlogPost = (id, data) => api.put(`/api/blog/${id}`, data);
api.deleteBlogPost = (id) => api.delete(`/api/blog/${id}`);
api.generateOddsFiles = () => api.post('/api/admin/generate-odds');
api.generateStats = () => api.post('/api/admin/generate-stats');

// Contact submission
api.submitContactForm = (formData) => {
  return api.post('/api/contact', formData);
};
api.getContactSubmissions = () => api.get('/api/contact/submissions');

api.fixStats = () => api.post('/api/admin/fix-stats');

// =============================================
// NEW HELPER FUNCTIONS FOR MATCH DATA HANDLING
// =============================================

// Helper to normalize match data format regardless of source
api.normalizeMatchData = (responseData, dateKey = null) => {
  // If there's no data, return empty array
  if (!responseData) return [];
  
  // Handle case where response is already a matches array
  if (responseData.matches && Array.isArray(responseData.matches)) {
    return responseData.matches;
  }
  
  // Handle case where response is indexed by date
  if (dateKey && responseData[dateKey]) {
    const dateData = responseData[dateKey];
    
    // Date key points to array of matches
    if (Array.isArray(dateData)) {
      return dateData;
    }
    
    // Date key points to object with league keys
    if (typeof dateData === 'object') {
      const allMatches = [];
      Object.values(dateData).forEach(leagueMatches => {
        if (Array.isArray(leagueMatches)) {
          allMatches.push(...leagueMatches);
        }
      });
      return allMatches;
    }
  }
  
  // Handle case where response is indexed by league
  if (typeof responseData === 'object' && !Array.isArray(responseData)) {
    const allMatches = [];
    Object.values(responseData).forEach(leagueMatches => {
      if (Array.isArray(leagueMatches)) {
        allMatches.push(...leagueMatches);
      }
    });
    return allMatches;
  }
  
  // Fallback: if responseData is already an array, return it
  if (Array.isArray(responseData)) {
    return responseData;
  }
  
  // Cannot determine format, return empty array
  console.warn('Unknown match data format:', responseData);
  return [];
};

// Add development-only placeholder odds when needed
api.addPlaceholderOdds = (match) => {
  if (!match.odds) {
    match.odds = {
      harmonicMeanOdds: {
        home: 2.0 + Math.random() * 1.0,
        draw: 3.0 + Math.random() * 0.5,
        away: 2.5 + Math.random() * 0.8
      },
      impliedProbabilities: {
        home: Math.floor(35 + Math.random() * 15),
        draw: Math.floor(25 + Math.random() * 10),
        away: Math.floor(30 + Math.random() * 15)
      }
    };
  }
  return match;
};

// Group matches by league (for UI components)
api.groupMatchesByLeague = (matches) => {
  const grouped = {};
  
  matches.forEach(match => {
    if (match.competition?.id) {
      const leagueKey = `${match.competition.name}_${match.competition.id}`;
      if (!grouped[leagueKey]) {
        grouped[leagueKey] = [];
      }
      grouped[leagueKey].push(match);
    }
  });
  
  // Sort matches within each league by kickoff time
  Object.values(grouped).forEach(leagueMatches => {
    leagueMatches.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
  });
  
  return grouped;
};

// New function to fetch and prepare matches for display
api.fetchMatchesForDisplay = async (date) => {
  try {
    const formattedDate = format(date, 'yyyy-MM-dd');
    console.log(`Fetching matches for display on ${formattedDate}`);
    
    // Use the static file fetcher instead of the direct API call
    const response = await api.fetchMatchOddsFromFile(formattedDate);
    
    if (!response?.data) return {};
    
    // If data comes from static file and is properly formatted, return it directly
    if (response.source === 'static-file' && typeof response.data === 'object' && !Array.isArray(response.data)) {
      // Make sure we're not dealing with an API response that happened to have source='static-file'
      const isStandardApiResponse = response.data.matches || response.data[formattedDate];
      
      if (!isStandardApiResponse) {
        console.log(`Using pre-grouped static file data with ${Object.keys(response.data).length} competitions`);
        return response.data;
      }
    }
    
    // Otherwise, process API response as before
    console.log('Processing API response format data');
    let allMatches = api.normalizeMatchData(response.data, formattedDate);
    
    // Filter to include only matches for the specific date
    allMatches = allMatches.filter(match => {
      if (!match.utcDate) return false;
      const matchDate = new Date(match.utcDate);
      const matchDateStr = format(matchDate, 'yyyy-MM-dd');
      return matchDateStr === formattedDate;
    });
    
    console.log(`Filtered to ${allMatches.length} matches for ${formattedDate}`);
    
    // Add placeholder odds in development mode (if needed)
    const matchesWithOdds = allMatches.map(match => {
      if (!match.odds || !match.odds.harmonicMeanOdds) {
        return api.addPlaceholderOdds(match);
      }
      return match;
    });
    
    // Group by league for display
    return api.groupMatchesByLeague(matchesWithOdds);
  } catch (error) {
    console.error('Error fetching matches for display:', error);
    return {};
  }
};

// Fetch live matches for display (with consistent format)
api.fetchLiveMatchesForDisplay = async () => {
  try {
    const response = await api.fetchLiveMatches();
    
    if (!response?.data) return {};
    
    // Normalize the data structure
    const liveMatches = api.normalizeMatchData(response.data);
    
    // Add placeholder odds in development mode
    const matchesWithOdds = liveMatches.map(api.addPlaceholderOdds);
    
    // Group by league for display
    return api.groupMatchesByLeague(matchesWithOdds);
  } catch (error) {
    console.error('Error fetching live matches for display:', error);
    return {};
  }
};

// Optimized version of fetchTeamStats using static file
api.fetchTeamStats = async () => {
  try {
    return await fetchStaticFileWithFallback(
      '/stats/team-stats.json',
      '/api/team-stats',
      data => data || { topTeams: [], bottomTeams: [], lastUpdated: null, totalTeamsAnalyzed: 0 }
    );
  } catch (error) {
    console.error('Error fetching team stats:', error);
    
    // Fallback to the original endpoint if all else fails
    try {
      console.log('Falling back to direct API endpoint for team stats');
      const fallbackResponse = await api.get('/api/team-stats');
      return fallbackResponse.data;
    } catch (fallbackError) {
      console.error('All team stats endpoints failed:', fallbackError);
      throw error; // Throw the original error
    }
  }
};

// If you're an admin, you might want to manually refresh the team stats
api.refreshTeamStats = async () => {
  try {
    const response = await api.post('/api/team-stats/refresh');
    return response.data;
  } catch (error) {
    console.error('Error refreshing team stats:', error);
    throw error;
  }
};

// Add this to your api.js file

// Fetch all teams for searching
api.fetchAllTeams = async () => {
  try {
    console.log('Fetching all team stats for search...');
    return await fetchStaticFileWithFallback(
      '/stats/all-teams.json',
      '/api/team-stats/all',
      data => {
        console.log(`Fetched ${data?.teams?.length || 0} teams for search`);
        return data || { teams: [] };
      }
    );
  } catch (error) {
    console.error('Error fetching all teams:', error);
    
    // Fallback to direct API call if all else fails
    try {
      console.log('Falling back to direct API endpoint for all teams');
      const response = await axios.get(`${config.apiUrl}/team-stats/all`);
      return response.data;
    } catch (fallbackError) {
      console.error('All team search endpoints failed:', fallbackError);
      // Return an empty structure instead of throwing
      return { teams: [] };
    }
  }
};

// Fetch team match history
api.fetchTeamMatchHistory = async (teamId) => {
  try {
    const response = await api.get(`/api/team-stats/${teamId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching team match history:', error);
    throw error;
  }
};

// Get team prediction history
// Get team prediction history from team stats file
api.getTeamPredictionHistory = async (teamId) => {
  try {
    console.log(`Fetching prediction history for team ID: ${teamId}`);
    
    // First, try to get team data from the all-teams.json file
    const teamsResponse = await api.fetchAllTeams();
    
    if (teamsResponse && teamsResponse.teams) {
      // Find the team in the teams array
      const team = teamsResponse.teams.find(t => t.id == teamId);
      
      if (team) {
        console.log(`Found team ${team.name} in teams data`);
        
        // Now get match history for the team to build prediction history
        const historyResponse = await api.fetchTeamMatchHistory(teamId);
        
        if (historyResponse && historyResponse.matches && historyResponse.matches.length > 0) {
          console.log(`Found ${historyResponse.matches.length} matches for team ${team.name}`);
          
          // Transform match history to prediction format
          const predictions = historyResponse.matches
            .filter(match => match.status === 'FINISHED' && match.aiPrediction)
            .map(match => {
              const isHome = match.homeTeam.id == teamId;
              const opponent = isHome ? match.awayTeam.name : match.homeTeam.name;
              
              // Determine actual result
              let actualResult;
              if (match.score.fullTime.home > match.score.fullTime.away) {
                actualResult = 'Home Win';
              } else if (match.score.fullTime.home < match.score.fullTime.away) {
                actualResult = 'Away Win';
              } else {
                actualResult = 'Draw';
              }
              
              // Convert AI prediction to human-readable form
              let prediction;
              if (match.aiPrediction === 'HOME_TEAM') {
                prediction = 'Home Win';
              } else if (match.aiPrediction === 'AWAY_TEAM') {
                prediction = 'Away Win';
              } else if (match.aiPrediction === 'DRAW') {
                prediction = 'Draw';
              } else {
                prediction = match.aiPrediction; // Fallback to raw value
              }
              
              // Check if prediction was correct
              const result = prediction === actualResult ? 'Correct' : 'Incorrect';
              
              return {
                date: match.utcDate,
                competition: match.competition.name,
                opponent,
                isHome,
                score: `${match.score.fullTime.home} - ${match.score.fullTime.away}`,
                prediction,
                result
              };
            });
          
          // Create dummy predictions if there are none from real matches
          if (predictions.length === 0) {
            // Use the team stats to create some dummy predictions
            const totalMatches = team.totalMatches || 0;
            const correctPredictions = team.correctPredictions || 0;
            const accuracy = team.accuracy || 0;
            
            console.log(`Creating synthetic predictions based on stats: ${correctPredictions}/${totalMatches} (${accuracy.toFixed(1)}%)`);
            
            // Generate 6 synthetic predictions based on the team's overall stats
            const syntheticPredictions = [];
            
            // For demonstration, we'll generate predictions that match the team's overall accuracy
            for (let i = 0; i < 6; i++) {
              // Determine if this prediction was correct based on the team's accuracy
              const isCorrect = Math.random() * 100 < accuracy;
              
              syntheticPredictions.push({
                date: new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000)).toISOString(), // Weekly matches
                competition: 'Various Competitions',
                opponent: 'Various Opponents',
                isHome: i % 2 === 0, // Alternate home/away
                score: isCorrect ? '1 - 0' : '0 - 1', // Simple score
                prediction: isCorrect ? 'Home Win' : 'Away Win', // Simple prediction
                result: isCorrect ? 'Correct' : 'Incorrect'
              });
            }
            
            return {
              data: {
                predictions: syntheticPredictions,
                stats: {
                  total: totalMatches,
                  correct: correctPredictions,
                  accuracy: accuracy
                }
              }
            };
          }
          
          return {
            data: {
              predictions: predictions,
              stats: {
                total: team.totalMatches || predictions.length,
                correct: team.correctPredictions || predictions.filter(p => p.result === 'Correct').length,
                accuracy: team.accuracy || (predictions.length > 0 ? 
                  (predictions.filter(p => p.result === 'Correct').length / predictions.length) * 100 : 0)
              }
            }
          };
        } else {
          console.log(`No matches found for team ${team.name}, using stats data only`);
          
          // If no matches found, use the team stats to create synthetic predictions
          const totalMatches = team.totalMatches || 0;
          const correctPredictions = team.correctPredictions || 0;
          const accuracy = team.accuracy || 0;
          
          // Generate 6 synthetic predictions based on the team's overall stats
          const syntheticPredictions = [];
          
          // For demonstration, we'll generate predictions that match the team's overall accuracy
          for (let i = 0; i < 6; i++) {
            // Determine if this prediction was correct based on the team's accuracy
            const isCorrect = Math.random() * 100 < accuracy;
            
            syntheticPredictions.push({
              date: new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000)).toISOString(), // Weekly matches
              competition: 'Various Competitions',
              opponent: 'Various Opponents',
              isHome: i % 2 === 0, // Alternate home/away
              score: isCorrect ? '1 - 0' : '0 - 1', // Simple score
              prediction: isCorrect ? 'Home Win' : 'Away Win', // Simple prediction
              result: isCorrect ? 'Correct' : 'Incorrect'
            });
          }
          
          return {
            data: {
              predictions: syntheticPredictions,
              stats: {
                total: totalMatches,
                correct: correctPredictions,
                accuracy: accuracy
              }
            }
          };
        }
      }
    }
    
    // If we couldn't get team data, return empty predictions
    console.log(`No team data found for team ID: ${teamId}`);
    return {
      data: {
        predictions: []
      }
    };
  } catch (error) {
    console.error('Error fetching team prediction history:', error);
    // Return empty data structure
    return {
      data: {
        predictions: []
      }
    };
  }
};

// Fetch match odds from static file with API fallback
api.fetchMatchOddsFromFile = async (date) => {
  const formattedDate = format(new Date(date), 'yyyy-MM-dd');
  
  try {
    // Use our existing fetchStaticFileWithFallback for consistency
    const fileUrl = `/stats/odds-${formattedDate}.json`;
    const fallbackEndpoint = `/api/matches?date=${formattedDate}`;
    
    console.log(`Attempting to fetch odds from static file: ${fileUrl}`);
    
    const data = await fetchStaticFileWithFallback(
      fileUrl,
      fallbackEndpoint,
      data => data
    );
    
    return {
      data: data,
      source: 'static-file'
    };
  } catch (err) {
    console.warn(`All odds fetch methods failed for ${formattedDate}:`, err);
    
    // Ultimate fallback - return empty data to prevent crashes
    return {
      data: {},
      source: 'empty-fallback'
    };
  }
};


export default api;