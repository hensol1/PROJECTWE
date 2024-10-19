import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import api from '../api';
import Select from 'react-select';
import countryList from 'react-select-country-list';

const AuthComponent = ({ setUser, user }) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [isFirstTimeGoogleUser, setIsFirstTimeGoogleUser] = useState(false);
  const [googleUserInfo, setGoogleUserInfo] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);

  const countries = useMemo(() => countryList().getData(), []);
  
const fetchUserData = async () => {
  try {
    const [profileResponse, statsResponse] = await Promise.all([
      api.getUserProfile(),
      api.getUserStats()
    ]);
    const userData = {
      ...profileResponse.data,
      stats: statsResponse.data
    };
    setUser(userData);
    // Ensure we're using the correct property for the user ID
    const userId = userData._id || userData.id;
    if (userId) {
      localStorage.setItem('userId', userId);
      console.log('User ID stored in localStorage:', userId);
    } else {
      console.error('User ID not found in userData:', userData);
    }
    console.log('User data fetched and ID stored:', userData);
    console.log('All localStorage items after fetching user data:', { ...localStorage });
  } catch (error) {
    console.error('Error fetching user data:', error);
    handleLogout();
  }
};
  
const handleLoginSuccess = async (token, userData) => {
  localStorage.setItem('token', token);
  localStorage.setItem('userId', userData._id || userData.id);
  console.log('Token and userId stored in localStorage:', token, userData._id || userData.id);
  console.log('All localStorage items after login:', { ...localStorage });
  setMessage({ text: 'Login successful!', type: 'success' });
  setIsLoading(true);
  await fetchUserData();
  setIsLoading(false);
};
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    setIsLoading(true);
    try {
      const response = await api.post(`/api/auth/${isLogin ? 'login' : 'register'}`, {
        username,
        password,
        email,
        country: country.value
      });
      await handleLoginSuccess(response.data.token, response.data.user);
    } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
      setMessage({ 
        text: error.response?.data?.message || 'An error occurred. Please try again.', 
        type: 'error' 
      });
    }
    setIsLoading(false);
  };

  const handleProceed = () => {
    setIsModalOpen(false);
    setMessage({ text: '', type: '' });
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userId'); // Add this line to remove user ID
    setMessage({ text: 'You have been successfully logged out.', type: 'info' });
    setIsModalOpen(true);
    navigate('/');
  };

  
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });

        const response = await api.post('/api/auth/google', {
          googleId: userInfo.data.sub,
          email: userInfo.data.email,
          name: userInfo.data.name
        });

        if (response.data.isNewUser) {
          setIsFirstTimeGoogleUser(true);
          setGoogleUserInfo(userInfo.data);
        } else {
          await handleLoginSuccess(response.data.token, response.data.user);
        }
      } catch (error) {
        console.error('Google login error:', error.response?.data || error.message);
        setMessage({ text: 'Failed to login with Google. Please try again.', type: 'error' });
      }
    },
    onError: (error) => {
      console.log('Login Failed:', error);
      setMessage({ text: 'Google login failed. Please try again.', type: 'error' });
    }
  });

  const handleFirstTimeGoogleUser = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/auth/google/complete-profile', {
        googleId: googleUserInfo.sub,
        email: googleUserInfo.email,
        name: googleUserInfo.name,
        username,
        country: country.value
      });
      await handleLoginSuccess(response.data.token, response.data.user);
      setIsFirstTimeGoogleUser(false);
    } catch (error) {
      console.error('Error completing profile:', error.response?.data || error.message);
      setMessage({ text: 'Failed to complete profile. Please try again.', type: 'error' });
    }
  };



  const renderAuthForm = () => (
    <div className="bg-white p-8 rounded-lg shadow-md w-96">
      <h2 className="text-2xl font-bold mb-6">Sign In</h2>
      {message.text && (
        <div className={`${
          message.type === 'error' ? 'bg-red-100 border-red-400 text-red-700' :
          message.type === 'success' ? 'bg-green-100 border-green-400 text-green-700' :
          'bg-blue-100 border-blue-400 text-blue-700'
        } border px-4 py-3 rounded relative mb-4`} role="alert">
          <span className="block sm:inline">{message.text}</span>
        </div>
      )}
      {message.type === 'success' || message.type === 'info' ? (
        <div className="text-center">
          <button
            onClick={handleProceed}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Proceed'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Sign In'}
          </button>
        </form>
      )}
      {!message.text && (
        <>
          <div className="mt-4">
            <button
              className="flex items-center justify-center gap-3 w-full py-2 px-4 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              onClick={() => googleLogin()}
            >
              <img src="https://docs.material-tailwind.com/icons/google.svg" alt="google" className="h-6 w-6" />
              Continue with Google
            </button>
          </div>
          <p className="mt-4 text-center">
            Don't have an account? {' '}
            <button
              onClick={() => {
                setIsLogin(false);
                setMessage({ text: '', type: '' });
              }}
              className="text-blue-500 hover:underline"
              disabled={isLoading}
            >
              Register
            </button>
          </p>
        </>
      )}
    </div>
  );

  return (
    <div className="relative">
      {user ? (
        <div className="flex items-center">
          <p className="mr-2">Welcome, {user.username}!</p>
          {user.isAdmin && <p className="mr-2">(Admin)</p>}
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 text-sm"
          >
            Logout
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 text-sm"
          >
            Sign In
          </button>
          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                <div className="bg-white p-8 rounded-lg">
                  {isFirstTimeGoogleUser ? (
                    <form onSubmit={handleFirstTimeGoogleUser} className="space-y-4">
                      <h2 className="text-2xl font-bold mb-6">Complete Your Profile</h2>
                      <input
                        type="text"
                        placeholder="Choose a username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <Select
                        options={countries}
                        value={country}
                        onChange={(value) => setCountry(value)}
                        placeholder="Select a country"
                        className="w-full"
                      />
                      <button
                        type="submit"
                        className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
                      >
                        Complete Profile
                      </button>
                    </form>
                  ) : (
                    renderAuthForm()
                  )}
                  {!message.text && (
                    <button
                      onClick={() => {
                        setIsModalOpen(false);
                        setMessage({ text: '', type: '' });
                      }}
                      className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  )}
                </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AuthComponent;
