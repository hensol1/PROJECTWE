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

// Add this method for logging out
api.logout = () => {
  localStorage.removeItem('token');
};

export default api;