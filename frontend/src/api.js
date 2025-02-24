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

// Request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken'); // Change from 'token' to 'adminToken'
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
      localStorage.removeItem('adminToken'); // Change from 'token' to 'adminToken'
      localStorage.removeItem('userId');
      return Promise.reject({ isAuthError: true, ...error });
    }
    return Promise.reject(error);
  }
);


// Add all API methods here
api.fetchMatches = (date) => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return api.get(`/api/matches?date=${date}`, {
    headers: {
      'x-timezone': timeZone
    }
  });
};

api.fetchMatches = (date) => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return api.get(`/api/matches?date=${date}`, {
    headers: {
      'x-timezone': timeZone
    }
  });
};

//Standing
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
    const response = await api.get('/api/accuracy/ai');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Ticker last seccessful prediction
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

api.fetchAIHistory = async () => {
  try {
    const response = await api.get('/api/accuracy/ai/history');
    return response.data;
  } catch (error) {
    console.error('Error fetching AI history:', error);
    throw error;
  }
};


//Events
api.fetchMatchEvents = (matchId) => {
  return api.get(`/api/matches/${matchId}/events`);
};

//Lineups
api.fetchMatchLineups = (matchId) => {
  return api.get(`/api/lineups/${matchId}`);
};

//Weekly leaderboard
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

// League Accuracy stats
api.fetchLeagueStats = async () => {
  try {
    return await api.get('/api/accuracy/ai/league-stats');
  } catch (error) {
    console.error('League stats API error:', {
      message: error.message,
      response: error.response,
      data: error.response?.data
    });
    throw error;
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
    debug: true  // Add this flag
  });
};

// Admin routes
api.triggerFetchOdds = (date) => {
  const formattedDate = format(new Date(date), 'yyyy-MM-dd');
  return api.post('/api/admin/fetch-odds', {  // This should now match your backend route
    date: formattedDate
  });
};

api.recalculateStats = () => api.post('/api/admin/recalculate-stats');
api.resetStats = () => api.post('/api/accuracy/reset');
api.getDailyPredictions = () => api.get('/api/stats/daily-predictions');
api.resetAIStats = () => api.post('/api/admin/reset-ai');
api.updateAllResults = () => api.post('/api/matches/update-results');
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

export default api;
