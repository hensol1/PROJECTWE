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
      console.log('Token included in request:', token);
    } else {
      console.log('No token found in localStorage');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.voteForMatch = (matchId, vote) => {
  console.log('Sending vote request for match:', matchId, 'vote:', vote);
  return api.post(`/api/matches/${matchId}/vote`, { vote });
};

api.getUserProfile = () => api.get('/api/user/profile');

api.makeAIPrediction = (matchId, prediction) => {
  return api.post(`/api/admin/${matchId}/predict`, { prediction });
};

export default api;
