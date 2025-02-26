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

// Add all API methods here
api.fetchMatches = (date) => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return api.get(`/api/matches?date=${date}`, {
    headers: {
      'x-timezone': timeZone
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
  return api.get('/api/matches/live', {
    headers: {
      'x-timezone': timeZone
    }
  });
};

api.fetchAccuracy = async () => {
  try {
    // Try new endpoint first
    const response = await api.fetchAIHistory();
    return {
      aiAccuracy: response.overall.overallAccuracy || 0
    };
  } catch (error) {
    console.error('Error fetching accuracy:', error);
    // Fallback to old endpoint
    try {
      const legacyResponse = await api.get('/api/accuracy/ai');
      return legacyResponse.data;
    } catch (fallbackError) {
      console.error('Error in fallback accuracy fetch:', fallbackError);
      return { aiAccuracy: 0 };
    }
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

// Ticker
api.fetchLastTwoDaysStats = async () => {
  try {
    const response = await api.get('/api/accuracy/ai/two-days');
    return response.data;
  } catch (error) {
    console.error('Error fetching last two days stats:', error);
    return {
      today: { total: 0, correct: 0 },
      yesterday: { total: 0, correct: 0 }
    };
  }
};

// Optimized version of fetchAIHistory that uses static files
api.fetchAIHistory = async () => {
  try {
    // Try to get the manifest for cache busting
    let cacheBuster = Date.now();
    try {
      const manifest = await fetchStatsManifest();
      cacheBuster = manifest?.aiHistory?.lastUpdated || cacheBuster;
    } catch (manifestError) {
      console.warn('Could not fetch manifest, using timestamp as cache buster', manifestError);
    }
    
    // Use the optimized endpoint
    const response = await api.get(`/api/stats/ai/history?_=${cacheBuster}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching AI history:', error);
    
    // Fallback to the original endpoint if optimized one fails
    try {
      console.log('Falling back to legacy endpoint for AI history');
      const fallbackResponse = await api.get('/api/accuracy/ai/history');
      return fallbackResponse.data;
    } catch (fallbackError) {
      console.error('Both optimized and fallback endpoints failed:', fallbackError);
      throw error; // Throw the original error
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

// Weekly leaderboard
api.getWeeklyLeaderboard = () => {
  return api.get('/api/user/leaderboard/weekly');
};

// New endpoint for user's daily stats
api.fetchUserDailyAccuracy = async () => {
  try {
    const response = await api.get('/api/accuracy/user/daily');
    return response.data;
  } catch (error) {
    console.error('Error in fetchUserDailyAccuracy:', error);
    throw error;
  }
};

// Optimized version of fetchLeagueStats
api.fetchLeagueStats = async () => {
  try {
    // Try to get the manifest for cache busting
    let cacheBuster = Date.now();
    try {
      const manifest = await fetchStatsManifest();
      cacheBuster = manifest?.leagueStats?.lastUpdated || cacheBuster;
    } catch (manifestError) {
      console.warn('Could not fetch manifest, using timestamp as cache buster', manifestError);
    }
    
    // Use the optimized endpoint
    const response = await api.get(`/api/stats/ai/league-stats?_=${cacheBuster}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching league stats:', error);
    
    // Fallback to the original endpoint if optimized one fails
    try {
      console.log('Falling back to legacy endpoint for league stats');
      const fallbackResponse = await api.get('/api/accuracy/ai/league-stats');
      return fallbackResponse.data;
    } catch (fallbackError) {
      console.error('Both optimized and fallback endpoints failed:', fallbackError);
      throw error; // Throw the original error
    }
  }
};

// Modified to include user stats if available
api.fetchDailyAccuracy = async () => {
  try {
    const response = await api.get('/api/accuracy/ai/daily');
    return {
      data: {
        ai: response.data
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
    // Try to get the manifest for cache busting
    let cacheBuster = Date.now();
    try {
      const manifest = await fetchStatsManifest();
      cacheBuster = manifest?.dailyPredictions?.lastUpdated || cacheBuster;
    } catch (manifestError) {
      console.warn('Could not fetch manifest, using timestamp as cache buster', manifestError);
    }
    
    const response = await api.get(`/api/stats/daily-predictions?_=${cacheBuster}`);
    return response.data;
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

// Contact submission
api.submitContactForm = (formData) => {
  return api.post('/api/contact', formData);
};
api.getContactSubmissions = () => api.get('/api/contact/submissions');

api.fixStats = () => api.post('/api/admin/fix-stats');

export default api;