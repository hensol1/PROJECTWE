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
    const response = await fetch(`${fileUrl}${cacheBuster}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stats file: ${response.status}`);
    }
    
    const data = await response.json();
    return transformFn(data);
  } catch (err) {
    console.warn(`Error fetching static file ${fileUrl}:`, err);
    console.log(`Falling back to API endpoint: ${fallbackEndpoint}`);
    
    // Fallback to API endpoint
    try {
      const apiResponse = await api.get(fallbackEndpoint);
      return apiResponse.data;
    } catch (apiErr) {
      console.error('API fallback also failed:', apiErr);
      throw apiErr;
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
    return await fetchStaticFileWithFallback(
      '/stats/ai-history.json',
      '/api/stats/ai/history'
    );
  } catch (error) {
    console.error('Error fetching AI history:', error);
    
    // Fallback to the original endpoint if all else fails
    try {
      console.log('Falling back to legacy endpoint for AI history');
      const fallbackResponse = await api.get('/api/accuracy/ai/history');
      return fallbackResponse.data;
    } catch (fallbackError) {
      console.error('All AI history endpoints failed:', fallbackError);
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

// Contact submission
api.submitContactForm = (formData) => {
  return api.post('/api/contact', formData);
};
api.getContactSubmissions = () => api.get('/api/contact/submissions');

api.fixStats = () => api.post('/api/admin/fix-stats');

export default api;