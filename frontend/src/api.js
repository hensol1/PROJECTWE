import axios from 'axios';
import config from './config';

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
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

api.fetchMatches = (date) => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log('Fetching matches:', {
    date,
    clientTimeZone: timeZone,
    clientTime: new Date().toISOString()
  });
  
  return api.get(`/api/matches?date=${date}`, {
    headers: {
      'x-timezone': timeZone
    }
  }).then(response => {
    console.log('Match fetch response:', {
      matchCount: response.data.matches.length,
      sampleMatch: response.data.matches.length > 0 ? {
        id: response.data.matches[0].id,
        date: response.data.matches[0].utcDate,
        status: response.data.matches[0].status
      } : null
    });
    return response;
  }).catch(error => {
    console.error('Match fetch error:', {
      error: error.message,
      date,
      timeZone
    });
    throw error;
  });
};

// Match related endpoints
api.voteForMatch = (matchId, vote) => {
  return api.post(`/api/matches/${matchId}/vote`, { vote });
};

api.fetchMatches = (date) => api.get(`/api/matches?date=${date}`);

// User related endpoints
api.getUserProfile = () => api.get('/api/user/profile');
api.getUserStats = () => api.get('/api/user/stats');
api.getLeaderboard = () => api.get('/api/user/leaderboard');

// Admin related endpoints
api.makeAIPrediction = (matchId, prediction) => {
  console.log('Making AI prediction:', { matchId, prediction });
  return api.post(`/api/admin/${matchId}/predict`, { prediction });
};

api.triggerFetchMatches = () => api.post('/api/admin/fetch-matches');
api.recalculateStats = () => api.post('/api/admin/recalculate-stats');
api.resetStats = () => api.post('/api/accuracy/reset');
api.resetAllStats = () => api.post('/api/accuracy/reset-all');
api.resetAIStats = () => api.post('/api/accuracy/reset-ai');
api.resetFanStats = () => api.post('/api/accuracy/reset-fans');

// Accuracy endpoint
api.fetchAccuracy = async () => {
  try {
    const response = await api.get('/api/accuracy');
    console.log('API accuracy response:', response); // Debug log
    return response.data;
  } catch (error) {
    console.error('Error in fetchAccuracy:', error);
    throw error;
  }
};

export default api;