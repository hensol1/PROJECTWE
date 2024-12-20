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
    const response = await api.get('/api/accuracy');
    console.log('API accuracy response:', response);
    return response.data;
  } catch (error) {
    console.error('Error in fetchAccuracy:', error);
    throw error;
  }
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
    const token = localStorage.getItem('token');
    console.log('Token available:', !!token);

    const [generalResponse, userResponse] = await Promise.all([
      api.get('/api/accuracy/daily'),
      token ? api.get('/api/accuracy/user/daily') : Promise.resolve({ data: { data: { total: 0, correct: 0 } } })
    ]);

    console.log('General response:', generalResponse.data);
    console.log('User response:', userResponse.data);

    return {
      data: {
        ...generalResponse.data.data,
        user: userResponse.data.data
      }
    };
  } catch (error) {
    console.error('Error in fetchDailyAccuracy:', error);
    // Return default data structure on error
    return {
      data: {
        ai: { total: 0, correct: 0 },
        fans: { total: 0, correct: 0 },
        user: { total: 0, correct: 0 }
      }
    };
  }
};

// Location rankings methods
api.getLocationRankings = () => api.get('/api/user/rankings/locations');
api.getMyLocationRankings = () => api.get('/api/user/rankings/my-location');

// Match related endpoints
api.voteForMatch = (matchId, vote) => api.post(`/api/matches/${matchId}/vote`, { vote });

// User related endpoints
api.getUserProfile = () => api.get('/api/user/profile');
api.getUserStats = () => api.get('/api/user/stats');
api.getLeaderboard = () => api.get('/api/user/leaderboard');
api.deleteAccount = () => api.delete('/api/user/profile');

// Auth related endpoints
api.forgotPassword = (email) => api.post('/api/auth/forgot-password', { email });
api.resetPassword = (token, newPassword) => 
  api.post('/api/auth/reset-password', { token, newPassword });

// Admin related endpoints
api.makeAIPrediction = (matchId, prediction) => {
  console.log('Making AI prediction:', { matchId, prediction });
  return api.post(`/api/admin/${matchId}/predict`, { prediction });
};
// Auto Votes
api.autoVote = () => api.post('/api/matches/auto-vote');

// Admin routes
api.triggerFetchMatches = (date) => {
  // Ensure we send a properly formatted date string
  const formattedDate = format(new Date(date), 'yyyy-MM-dd');
  return api.post('/api/admin/fetch-matches', { 
    date: formattedDate 
  });
};

api.recalculateStats = () => api.post('/api/admin/recalculate-stats');
api.resetStats = () => api.post('/api/accuracy/reset');
api.resetAllStats = () => api.post('/api/accuracy/reset-all');
api.resetAIStats = () => api.post('/api/accuracy/reset-ai');
api.resetFanStats = () => api.post('/api/accuracy/reset-fans');
api.getUserRankings = () => api.get('/api/user/rankings');
// Contact submission
api.submitContactForm = (formData) => {
  console.log('Submitting contact form:', formData); // Add this log
  return api.post('/api/contact', formData);
};
api.getContactSubmissions = () => api.get('/api/contact/submissions');

export default api;
