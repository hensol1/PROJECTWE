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
api.getUserStats = () => api.get('/api/user/stats');
api.makeAIPrediction = (matchId, prediction) => {
  console.log('Making AI prediction:', { matchId, prediction });
  return api.post(`/api/admin/${matchId}/predict`, { prediction });
};
api.fetchMatches = (date) => api.get(`/api/matches?date=${date}`);



export default api;