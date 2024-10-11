import axios from 'axios';
import config from './config';

const api = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

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

api.voteForMatch = (matchId, vote) => {
  return api.post(`/api/matches/${matchId}/vote`, { vote });
};

api.getUserProfile = () => api.get('/api/user/profile');

// Add this new function for AI predictions
api.makeAIPrediction = (matchId, prediction) => {
  return api.post(`/api/admin/${matchId}/predict`, { prediction });
};

api.getUserStats = () => api.get('/api/user/stats');

export default api;