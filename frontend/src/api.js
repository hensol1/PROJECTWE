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
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('Adding auth header:', config.headers['Authorization']);
    } else {
      console.log('No token found in localStorage');
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
    // Only redirect to login if it's a 401 and not already on the login page
    if (error.response?.status === 401 && !window.location.pathname.includes('login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      // Instead of redirecting, return a specific error
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
    console.log('API accuracy response:', response);
    return response.data;
  } catch (error) {
    console.error('Error in fetchAccuracy:', error);
    throw error;
  }
};

// Ticker last seccessful prediction
api.fetchLatestSuccessfulPrediction = async () => {
  try {
    console.log('Calling latest-success endpoint...');
    const response = await api.get('/api/accuracy/latest-success');
    console.log('Latest prediction response:', response);
    return response.data;
  } catch (error) {
    console.error('Error fetching latest successful prediction:', error.response || error);
    return null;
  }
};

// Ticker
api.fetchLastTwoDaysStats = async () => {
  try {
    console.log('Fetching last two days stats...'); // Add debug log
    const response = await api.get('/api/accuracy/ai/two-days');
    console.log('Last two days stats response:', response.data); // Add debug log
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
    console.log('API user daily accuracy response:', response);
    return response.data;
  } catch (error) {
    console.error('Error in fetchUserDailyAccuracy:', error);
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
  console.log('Making AI prediction:', { matchId, prediction });
  return api.post(`/api/admin/matches/${matchId}/prediction`, { prediction });
};

// Admin routes
api.triggerFetchMatches = (date) => {
  const formattedDate = format(new Date(date), 'yyyy-MM-dd');
  console.log('Triggering fetch with formatted date:', formattedDate);
  return api.post('/api/admin/fetch-matches', { 
    date: formattedDate,
    debug: true  // Add this flag
  });
};


api.recalculateStats = () => api.post('/api/admin/recalculate-stats');
api.resetStats = () => api.post('/api/accuracy/reset');
api.getDailyPredictions = () => api.get('/api/stats/daily-predictions');
api.resetAIStats = () => api.post('/api/admin/reset-ai');
api.updateAllResults = () => api.post('/api/matches/update-results');


// Contact submission
api.submitContactForm = (formData) => {
  console.log('Submitting contact form:', formData); // Add this log
  return api.post('/api/contact', formData);
};
api.getContactSubmissions = () => api.get('/api/contact/submissions');

export default api;
