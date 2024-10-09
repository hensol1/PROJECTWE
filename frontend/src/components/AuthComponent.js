import React, { useState, useMemo } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import api from '../api';
import Select from 'react-select';
import countryList from 'react-select-country-list';

const AuthComponent = () => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post(`/api/auth/${isLogin ? 'login' : 'register'}`, {
        username,
        password,
        email,
        country: country.value
      });
      setLoggedInUser(username);
      localStorage.setItem('token', response.data.token);
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
          setLoggedInUser(response.data.user.username);
          localStorage.setItem('token', response.data.token);
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
    localStorage.removeItem('token');
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

      setLoggedInUser(response.data.user.username);
      localStorage.setItem('token', response.data.token);
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
<div class="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-700">
  <button 
    class="flex items-center bg-white dark:bg-gray-900 border border-gray-300 rounded-lg shadow-md px-6 py-2 text-sm font-medium text-gray-800 dark:text-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"   

    onClick={() => googleLogin()} // Keep the onClick handler
  >
    <svg class="h-6 w-6 mr-2" ... (rest of your svg code) </svg>
    <span>Continue with Google</span>
  </button>
</div>
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
    <div className="absolute top-0 right-0"> {/* Added absolute top-0 right-0 */}
      {loggedInUser ? (
        <div className="text-center flex justify-between items-center">
          <p className="text-xl mb-4">Welcome, {loggedInUser}!</p>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => setIsModalOpen(true)}
             className="text-gray-900 bg-gradient-to-r from-teal-200 to-lime-200 hover:bg-gradient-to-l hover:from-teal-200 hover:to-lime-200 focus:ring-4 focus:outline-none focus:ring-lime-200 dark:focus:ring-teal-700 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2"
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