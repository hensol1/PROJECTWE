import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import api from '../api';
import Select from 'react-select';
import countryList from 'react-select-country-list';

const AuthComponent = ({ setUser }) => {  // Add setUser as a prop here
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [isFirstTimeGoogleUser, setIsFirstTimeGoogleUser] = useState(false);
  const [googleUserInfo, setGoogleUserInfo] = useState(null);

  const countries = useMemo(() => countryList().getData(), []);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserProfile();
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await api.getUserProfile();
      setLoggedInUser(response.data);
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      handleLogout();
    }
  };


const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const response = await api.post(`/api/auth/${isLogin ? 'login' : 'register'}`, {
      username,
      password,
      email,
      country: country.value
    });
    console.log('Full response:', response.data); // Log the entire response
    const userData = response.data.user;
    setLoggedInUser(userData);
    setUser(userData);
    console.log('User set:', userData);
    console.log('Token received:', response.data.token);
    localStorage.setItem('token', response.data.token);
    console.log('Token stored in localStorage:', localStorage.getItem('token'));
    setIsModalOpen(false);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
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
          const userData = response.data.user;
          setLoggedInUser(userData);
          setUser(userData); // Pass the entire user object
          console.log('Token received:', response.data.token);
          localStorage.setItem('token', response.data.token);
          console.log('Token stored in localStorage:', localStorage.getItem('token'));
          setIsModalOpen(false);
        }
      } catch (error) {
        console.error('Google login error:', error.response?.data || error.message);
      }
    },
    onError: (error) => console.log('Login Failed:', error)
  });

  const handleLogout = () => {
    setLoggedInUser(null);
    setUser(null);
    localStorage.removeItem('token');
    navigate('/'); // Redirect to home page
  };

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

      const userData = response.data.user;
      setLoggedInUser(userData);
      setUser(userData); // Pass the entire user object
      console.log('Token received:', response.data.token);
      localStorage.setItem('token', response.data.token);
      console.log('Token stored in localStorage:', localStorage.getItem('token'));
      setIsFirstTimeGoogleUser(false);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error completing profile:', error.response?.data || error.message);
    }
  };

  const renderAuthForm = () => (
    <div className="bg-white p-8 rounded-lg shadow-md w-96">
      <h2 className="text-2xl font-bold mb-6">{isLogin ? 'Sign In' : 'Register'}</h2>
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
        {!isLogin && (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
          </>
        )}
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
        >
          {isLogin ? 'Sign In' : 'Register'}
        </button>
      </form>
      <button
        onClick={() => googleLogin()}
        className="w-full mt-4 bg-red-500 text-white py-2 rounded-md hover:bg-red-600"
      >
        Sign in with Google
      </button>
      <p className="mt-4 text-center">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-blue-500 hover:underline"
        >
          {isLogin ? 'Register' : 'Sign In'}
        </button>
      </p>
    </div>
  );

  return (
    <div className="relative">
      {loggedInUser ? (
        <div className="flex items-center">
          <p className="mr-2">Welcome, {loggedInUser.username}!</p>
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
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AuthComponent;