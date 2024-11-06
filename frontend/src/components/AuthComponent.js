// frontend/src/components/AuthComponent.js

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import api from '../api';
import Select from 'react-select';
import countryList from 'react-select-country-list';
import { City } from 'country-state-city';
import { VscAccount } from "react-icons/vsc";
import { IoExitOutline } from "react-icons/io5";
import logo from '../assets/images/logo.svg';

// Utility function for debouncing
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const AuthComponent = ({ setUser, user }) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [isFirstTimeGoogleUser, setIsFirstTimeGoogleUser] = useState(false);
  const [googleUserInfo, setGoogleUserInfo] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // New state for city optimization
  const [cityInputValue, setCityInputValue] = useState('');
  const [citiesCache, setCitiesCache] = useState({});
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [citiesOptions, setCitiesOptions] = useState([]);

  // Get countries list
  const countries = useMemo(() => countryList().getData(), []);

  // City fetching and filtering logic
  const fetchCities = useCallback(async (countryCode, searchValue = '') => {
    setIsLoadingCities(true);
    
    try {
      // Check cache first
      let citiesList;
      if (citiesCache[countryCode]) {
        citiesList = citiesCache[countryCode];
      } else {
        // Fetch new cities and cache them
        citiesList = City.getCitiesOfCountry(countryCode) || [];
        setCitiesCache(prev => ({
          ...prev,
          [countryCode]: citiesList
        }));
      }

      // Filter cities based on search input
      const filteredCities = searchValue
        ? citiesList.filter(city => 
            city.name.toLowerCase().includes(searchValue.toLowerCase())
          )
        : citiesList;

      // Create options and update state
      const cityOptions = filteredCities
        .slice(0, 100)
        .map(city => ({
          value: city.name,
          label: city.name
        }));

      setCitiesOptions(cityOptions);
      return cityOptions;
    } finally {
      setIsLoadingCities(false);
    }
  }, [citiesCache]);

  // Debounced city search
  const debouncedCitySearch = useMemo(
    () => debounce((countryCode, searchValue) => {
      fetchCities(countryCode, searchValue);
    }, 300),
    [fetchCities]
  );

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
      const userId = userData._id || userData.id;
      if (userId) {
        localStorage.setItem('userId', userId);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      handleLogout();
    }
  };

  const handleLoginSuccess = async (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userData._id || userData.id);
    setMessage({ text: 'Login successful!', type: 'success' });
    setIsLoading(true);
    await fetchUserData();
    setIsLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLogin && (!selectedCountry || !selectedCity)) {
      setMessage({ text: 'Please select both country and city', type: 'error' });
      return;
    }

    setMessage({ text: '', type: '' });
    setIsLoading(true);
    try {
      const endpoint = isLogin ? 'login' : 'register';
      const response = await api.post(`/api/auth/${endpoint}`, {
        username,
        password,
        email,
        ...(selectedCountry && { country: selectedCountry.label }),
        ...(selectedCity && { city: selectedCity.label })
      });
      
      await handleLoginSuccess(response.data.token, response.data.user);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
      setMessage({ 
        text: error.response?.data?.message || 'An error occurred. Please try again.', 
        type: 'error' 
      });
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    setIsLoggingOut(true);
    setIsModalOpen(true);
  };
  
  // Add a new function to handle the final logout
  const confirmLogout = () => {
    // Clear user data
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
  
    // Reset all form states
    setUsername('');
    setPassword('');
    setEmail('');
    setSelectedCountry(null);
    setSelectedCity(null);
    setCityInputValue('');
    setIsFirstTimeGoogleUser(false);
    setGoogleUserInfo(null);
    setIsLogin(true);
    setIsForgotPassword(false);
    setResetEmail('');
    setResetToken('');
    setNewPassword('');
    
    // Navigate and refresh
    navigate('/');
    window.location.reload();
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
          setIsModalOpen(false);
        }
      } catch (error) {
        console.error('Google login error:', error.response?.data || error.message);
        setMessage({ text: 'Failed to login with Google. Please try again.', type: 'error' });
      }
    },
    onError: () => {
      setMessage({ text: 'Google login failed. Please try again.', type: 'error' });
    }
  });

  const handleFirstTimeGoogleUser = async (e) => {
    e.preventDefault();
    if (!selectedCountry || !selectedCity) {
      setMessage({ text: 'Please select both country and city', type: 'error' });
      return;
    }

    try {
      const response = await api.post('/api/auth/google/complete-profile', {
        googleId: googleUserInfo.sub,
        email: googleUserInfo.email,
        name: googleUserInfo.name,
        username,
        country: selectedCountry.label,
        city: selectedCity.label
      });
      
      await handleLoginSuccess(response.data.token, response.data.user);
      setIsFirstTimeGoogleUser(false);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error completing profile:', error.response?.data || error.message);
      setMessage({ text: 'Failed to complete profile. Please try again.', type: 'error' });
    }
  };

  const renderLocationFields = () => (
    <div className="space-y-4">
      <Select
        options={countries}
        value={selectedCountry}
        onChange={(value) => {
          setSelectedCountry(value);
          setSelectedCity(null);
          setCityInputValue('');
          if (value) {
            fetchCities(value.value, '');
          }
        }}
        placeholder="Select a country"
        className="w-full"
        classNamePrefix="select"
      />
      
      {selectedCountry && (
        <Select
          options={citiesOptions}
          value={selectedCity}
          onChange={setSelectedCity}
          onInputChange={(value) => {
            setCityInputValue(value);
            if (value) {
              debouncedCitySearch(selectedCountry.value, value);
            }
          }}
          inputValue={cityInputValue}
          placeholder="Search and select a city"
          className="w-full"
          classNamePrefix="select"
          isDisabled={!selectedCountry}
          isLoading={isLoadingCities}
          noOptionsMessage={({ inputValue }) => 
            inputValue ? "No cities found" : "Type to search cities"
          }
        />
      )}
    </div>
  );

  const renderAuthForm = () => (
    <div className="space-y-4">
      {message.text && (
        <div className={`${
          message.type === 'error' ? 'bg-red-100 text-red-700' : 
          'bg-green-100 text-green-700'
        } border px-4 py-3 rounded relative mb-4`}>
          <span className="block sm:inline">{message.text}</span>
        </div>
      )}
  
      <form onSubmit={isFirstTimeGoogleUser ? handleFirstTimeGoogleUser : handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
        {!isLogin && !isFirstTimeGoogleUser && (
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        )}
  
        {!isFirstTimeGoogleUser && (
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        )}
  
        {(!isLogin || isFirstTimeGoogleUser) && renderLocationFields()}
  
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 
           isFirstTimeGoogleUser ? 'Complete Profile' :
           (isLogin ? 'Sign In' : 'Register')}
        </button>
      </form>
  
      {!isFirstTimeGoogleUser && !message.text && (
        <>
          <div className="mt-4">
            <button
              className="flex items-center justify-center gap-3 w-full py-2 px-4 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50"
              onClick={() => googleLogin()}
            >
              <img src="https://docs.material-tailwind.com/icons/google.svg" alt="google" className="h-6 w-6" />
              Continue with Google
            </button>
          </div>
  
          <p className="mt-4 text-center">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setMessage({ text: '', type: '' });
              }}
              className="text-blue-500 hover:underline"
              disabled={isLoading}
            >
              {isLogin ? 'Register' : 'Sign In'}
            </button>
          </p>
  
          {isLogin && (
            <p className="mt-2 text-center">
              <button
                onClick={() => {
                  setIsForgotPassword(true);
                  setMessage({ text: '', type: '' });
                }}
                className="text-blue-500 hover:underline"
              >
                Forgot Password?
              </button>
            </p>
          )}
        </>
      )}
    </div>
  );
  
  return (
    <div>
      {user ? (
        <button
          onClick={handleLogout}
          className="w-10 h-10 rounded-full shadow-md flex justify-center items-center text-xl
                     transition-all duration-500 ease-in-out cursor-pointer
                     text-gray-600 hover:text-red-500"
          aria-label="Logout"
        >
          <IoExitOutline />
        </button>
      ) : (
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-10 h-10 rounded-full shadow-md flex justify-center items-center text-xl
                     transition-all duration-500 ease-in-out cursor-pointer
                     text-gray-600 hover:text-blue-500"
          aria-label="Sign In"
        >
          <VscAccount />
          </button>
      )}
  
  {isModalOpen && (
  <div className="fixed inset-0 w-full h-full flex items-center justify-center z-[9999]">
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm"
      onClick={() => {
        if (!isLoggingOut) {
          setIsModalOpen(false);
          setMessage({ text: '', type: '' });
        }
      }}
    />
    
    <div className="relative z-[10000] w-full max-w-md mx-auto px-4">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden">
        {isLoggingOut ? (
          // Logout confirmation dialog
          <div className="p-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <img src={logo} alt="We Know Better" className="h-16" />
              </div>
              
              <h2 className="text-xl font-semibold mb-4">
                Are you sure you want to log out?
              </h2>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={confirmLogout}
                  className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  Logout
                </button>
                <button
                  onClick={() => {
                    setIsLoggingOut(false);
                    setIsModalOpen(false);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : isForgotPassword ? (
          // Forgot password form
          <div className="p-6">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setMessage({ text: '', type: '' });
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 focus:outline-none z-10"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <img src={logo} alt="We Know Better" className="h-16" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Reset Password</h2>
            </div>

            {message.text && (
              <div className={`mb-4 px-4 py-3 rounded border ${
                message.type === 'error' ? 'bg-red-100 text-red-700 border-red-200' : 
                'bg-green-100 text-green-700 border-green-200'
              }`}>
                <span className="block sm:inline">{message.text}</span>
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.post('/api/auth/forgot-password', { email: resetEmail });
                setMessage({
                  text: 'Password reset instructions have been sent to your email',
                  type: 'success'
                });
              } catch (error) {
                setMessage({
                  text: error.response?.data?.message || 'Failed to send reset email',
                  type: 'error'
                });
              }
            }}>
              <input
                type="email"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
                required
              />
              <button
                type="submit"
                className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors"
              >
                Send Reset Instructions
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setMessage({ text: '', type: '' });
                }}
                className="w-full mt-4 text-blue-500 hover:underline"
              >
                Back to Login
              </button>
            </form>
          </div>
        ) : (
          // Regular auth form content
          <div className="p-6">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setMessage({ text: '', type: '' });
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 focus:outline-none z-10"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <img src={logo} alt="We Know Better" className="h-16" />
              </div>
              <h2 className="text-2xl font-bold">
                {isFirstTimeGoogleUser ? 'Complete Your Profile' : (isLogin ? 'Sign In' : 'Register')}
              </h2>
            </div>

            {renderAuthForm()}
          </div>
        )}
      </div>
    </div>
  </div>
)}        </div>
  );
};

export default AuthComponent;