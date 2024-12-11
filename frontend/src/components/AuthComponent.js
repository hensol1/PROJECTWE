// frontend/src/components/AuthComponent.js

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import api from '../api';
import Select from 'react-select';
import countryList from 'react-select-country-list';
import { City } from 'country-state-city';
import { VscAccount } from "react-icons/vsc";
import logo from '../assets/images/logo.svg';
import { IoExitOutline, IoPersonOutline } from "react-icons/io5";

const WKBLogo = ({ className = "h-16" }) => (
  <svg viewBox="0 0 866 866" xmlns="http://www.w3.org/2000/svg" className={className}>
    <svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 164.83 151.5">
      <path className="path-0 animate-[pulse_1s_infinite_-.125s]" d="M117.24,69.24A8,8,0,0,0,115.67,67c-4.88-4-9.8-7.89-14.86-11.62A4.93,4.93,0,0,0,96.93,55c-5.76,1.89-11.4,4.17-17.18,6a4.36,4.36,0,0,0-3.42,4.12c-1,6.89-2.1,13.76-3,20.66a4,4,0,0,0,1,3.07c5.12,4.36,10.39,8.61,15.68,12.76a3.62,3.62,0,0,0,2.92.75c6.29-2.66,12.52-5.47,18.71-8.36a3.49,3.49,0,0,0,1.68-2.19c1.34-7.25,2.54-14.55,3.9-22.58Z" fill="#40c456"/>
      <path className="path-1 animate-[pulse_1s_infinite_-.25s]" d="M97.55,38.68A43.76,43.76,0,0,1,98,33.44c.41-2.36-.5-3.57-2.57-4.64C91.1,26.59,87,24,82.66,21.82a6.18,6.18,0,0,0-4-.71C73.45,22.55,68.32,24.25,63.22,26c-3.63,1.21-6.08,3.35-5.76,7.69a26.67,26.67,0,0,1-.6,4.92c-1.08,8.06-1.08,8.08,5.86,11.92,3.95,2.19,7.82,5.75,11.94,6.08s8.76-2.41,13.12-3.93c9.33-3.29,9.33-3.3,9.78-14Z" fill="#40c456"/>
      <path className="path-2 animate-[pulse_1s_infinite_-.375s]" d="M66.11,126.56c5.91-.91,11.37-1.7,16.81-2.71a3.3,3.3,0,0,0,1.87-2.17c1-4.06,1.73-8.19,2.84-12.24.54-2-.11-3-1.55-4.15-5-4-9.9-8.12-15-12a6.19,6.19,0,0,0-4.15-1.1c-5.35.66-10.7,1.54-16,2.54A4,4,0,0,0,48.34,97a109.13,109.13,0,0,0-3,12.19,4.47,4.47,0,0,0,1.34,3.6c5.54,4.36,11.23,8.53,16.91,12.69a10.84,10.84,0,0,0,2.57,1.11Z" fill="#40c456"/>
      <path className="path-3 animate-[pulse_1s_infinite_-.5s]" d="M127.42,104.12c4.1-2.1,8-3.93,11.72-6a6,6,0,0,0,2.27-3,58.22,58.22,0,0,0,3.18-29.92c-.26-1.7-8-7.28-9.71-6.85A5,5,0,0,0,133,59.65c-2.81,2.49-5.71,4.88-8.33,7.56a9.46,9.46,0,0,0-2.47,4.4c-1.29,6.49-2.38,13-3.35,19.55a5.73,5.73,0,0,0,.83,3.91c2.31,3.08,5,5.88,7.7,9Z" fill="#40c456"/>
      <path className="path-4 animate-[pulse_1s_infinite_-.625s]" d="M52.58,29.89c-2.15-.36-3.78-.54-5.39-.9-2.83-.64-4.92.1-7,2.32A64.1,64.1,0,0,0,26.09,54.64c-2.64,7.92-2.62,7.84,5.15,10.87,1.76.69,2.73.45,3.93-1C39.79,59,44.54,53.65,49.22,48.2a4.2,4.2,0,0,0,1.13-2c.8-5.32,1.49-10.68,2.24-16.34Z" fill="#40c456"/>
      <path className="path-5 animate-[pulse_1s_infinite_-.75s]" d="M23,68.13c0,2.51,0,4.7,0,6.87a60.49,60.49,0,0,0,9.75,32.15c1.37,2.13,6.4,3,7,1.2,1.55-5,2.68-10.2,3.82-15.34.13-.58-.58-1.38-.94-2.06-2.51-4.77-5.47-9.38-7.45-14.37C32.94,71,28.22,69.84,23,68.13Z" fill="#40c456"/>
      <path className="path-6 animate-[pulse_1s_infinite_-.875s]" d="M83.91,12.86c-.32.36-.66.71-1,1.07.9,1.13,1.57,2.62,2.73,3.33,4.71,2.84,9.56,5.48,14.39,8.1a9.29,9.29,0,0,0,3.13.83c5.45.69,10.89,1.38,16.35,1.94a10.41,10.41,0,0,0,3.07-.71c-11.48-9.9-24.26-14.61-38.71-14.56Z" fill="#40c456"/>
      <path className="path-7 animate-[pulse_1s_infinite_-1s]" d="M66.28,132.51c13.36,3.78,25.62,3.5,38-.9C91.68,129.59,79.36,128,66.28,132.51Z" fill="#40c456"/>
      <path className="path-8" d="M127.2,30.66l-1.27.37a18.58,18.58,0,0,0,1,3.08c3,5.52,6.21,10.89,8.89,16.54,1.34,2.83,3.41,3.82,6.49,4.9a60.38,60.38,0,0,0-15.12-24.9Z" fill="#40c456"/>
      <path className="path-9" d="M117.35,125c5.58-2.32,16.9-13.84,18.1-19.2-2.41,1.46-5.18,2.36-6.78,4.23-4.21,5-7.89,10.37-11.32,15Z" fill="#40c456"/>
    </svg>
  </svg>
);


// Utility function for debouncing
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const AuthLoadingOverlay = () => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80">
    <div className="loader">
      <svg viewBox="0 0 866 866" xmlns="http://www.w3.org/2000/svg" className="h-[300px]">
        <svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 164.83 151.5">
          <path className="path-0 animate-[pulse_1s_infinite_-.125s]" d="M117.24,69.24A8,8,0,0,0,115.67,67c-4.88-4-9.8-7.89-14.86-11.62A4.93,4.93,0,0,0,96.93,55c-5.76,1.89-11.4,4.17-17.18,6a4.36,4.36,0,0,0-3.42,4.12c-1,6.89-2.1,13.76-3,20.66a4,4,0,0,0,1,3.07c5.12,4.36,10.39,8.61,15.68,12.76a3.62,3.62,0,0,0,2.92.75c6.29-2.66,12.52-5.47,18.71-8.36a3.49,3.49,0,0,0,1.68-2.19c1.34-7.25,2.54-14.55,3.9-22.58Z" fill="#40c456"/>
          <path className="path-1 animate-[pulse_1s_infinite_-.25s]" d="M97.55,38.68A43.76,43.76,0,0,1,98,33.44c.41-2.36-.5-3.57-2.57-4.64C91.1,26.59,87,24,82.66,21.82a6.18,6.18,0,0,0-4-.71C73.45,22.55,68.32,24.25,63.22,26c-3.63,1.21-6.08,3.35-5.76,7.69a26.67,26.67,0,0,1-.6,4.92c-1.08,8.06-1.08,8.08,5.86,11.92,3.95,2.19,7.82,5.75,11.94,6.08s8.76-2.41,13.12-3.93c9.33-3.29,9.33-3.3,9.78-14Z" fill="#40c456"/>
          <path className="path-2 animate-[pulse_1s_infinite_-.375s]" d="M66.11,126.56c5.91-.91,11.37-1.7,16.81-2.71a3.3,3.3,0,0,0,1.87-2.17c1-4.06,1.73-8.19,2.84-12.24.54-2-.11-3-1.55-4.15-5-4-9.9-8.12-15-12a6.19,6.19,0,0,0-4.15-1.1c-5.35.66-10.7,1.54-16,2.54A4,4,0,0,0,48.34,97a109.13,109.13,0,0,0-3,12.19,4.47,4.47,0,0,0,1.34,3.6c5.54,4.36,11.23,8.53,16.91,12.69a10.84,10.84,0,0,0,2.57,1.11Z" fill="#40c456"/>
          <path className="path-3 animate-[pulse_1s_infinite_-.5s]" d="M127.42,104.12c4.1-2.1,8-3.93,11.72-6a6,6,0,0,0,2.27-3,58.22,58.22,0,0,0,3.18-29.92c-.26-1.7-8-7.28-9.71-6.85A5,5,0,0,0,133,59.65c-2.81,2.49-5.71,4.88-8.33,7.56a9.46,9.46,0,0,0-2.47,4.4c-1.29,6.49-2.38,13-3.35,19.55a5.73,5.73,0,0,0,.83,3.91c2.31,3.08,5,5.88,7.7,9Z" fill="#40c456"/>
          <path className="path-4 animate-[pulse_1s_infinite_-.625s]" d="M52.58,29.89c-2.15-.36-3.78-.54-5.39-.9-2.83-.64-4.92.1-7,2.32A64.1,64.1,0,0,0,26.09,54.64c-2.64,7.92-2.62,7.84,5.15,10.87,1.76.69,2.73.45,3.93-1C39.79,59,44.54,53.65,49.22,48.2a4.2,4.2,0,0,0,1.13-2c.8-5.32,1.49-10.68,2.24-16.34Z" fill="#40c456"/>
          <path className="path-5 animate-[pulse_1s_infinite_-.75s]" d="M23,68.13c0,2.51,0,4.7,0,6.87a60.49,60.49,0,0,0,9.75,32.15c1.37,2.13,6.4,3,7,1.2,1.55-5,2.68-10.2,3.82-15.34.13-.58-.58-1.38-.94-2.06-2.51-4.77-5.47-9.38-7.45-14.37C32.94,71,28.22,69.84,23,68.13Z" fill="#40c456"/>
          <path className="path-6 animate-[pulse_1s_infinite_-.875s]" d="M83.91,12.86c-.32.36-.66.71-1,1.07.9,1.13,1.57,2.62,2.73,3.33,4.71,2.84,9.56,5.48,14.39,8.1a9.29,9.29,0,0,0,3.13.83c5.45.69,10.89,1.38,16.35,1.94a10.41,10.41,0,0,0,3.07-.71c-11.48-9.9-24.26-14.61-38.71-14.56Z" fill="#40c456"/>
          <path className="path-7 animate-[pulse_1s_infinite_-1s]" d="M66.28,132.51c13.36,3.78,25.62,3.5,38-.9C91.68,129.59,79.36,128,66.28,132.51Z" fill="#40c456"/>
          <path className="path-8" d="M127.2,30.66l-1.27.37a18.58,18.58,0,0,0,1,3.08c3,5.52,6.21,10.89,8.89,16.54,1.34,2.83,3.41,3.82,6.49,4.9a60.38,60.38,0,0,0-15.12-24.9Z" fill="#40c456"/>
          <path className="path-9" d="M117.35,125c5.58-2.32,16.9-13.84,18.1-19.2-2.41,1.46-5.18,2.36-6.78,4.23-4.21,5-7.89,10.37-11.32,15Z" fill="#40c456"/>
        </svg>
      </svg>
    </div>
    <div className="mt-8 text-white text-xl font-medium">Loading your data...</div>
  </div>
);


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
      let errorMessage;
  
      if (error.response?.data?.msg === 'User already exists') {
        errorMessage = 'This username is already taken';
      } else if (error.response?.status === 500) {
        // Since we know the 500 error in this context means email duplicate
        errorMessage = 'This email is already registered';
      } else if (error.response?.data?.msg) {
        errorMessage = error.response.data.msg;
      } else {
        errorMessage = 'An error occurred. Please try again.';
      }
      
      setMessage({ 
        text: errorMessage,
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
    <div className="flex items-center gap-2">  {/* Added container with flex and gap */}
      {user && (
        <Link
          to="/profile"
          className="w-10 h-10 rounded-full shadow-md flex justify-center items-center text-xl
                     transition-all duration-500 ease-in-out cursor-pointer
                     text-gray-600 hover:text-blue-500"
          aria-label="Profile"
        >
          <IoPersonOutline />
        </Link>
      )}
      
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
        if (!isLoading && !isLoggingOut) {
          setIsModalOpen(false);
          setMessage({ text: '', type: '' });
        }
      }}
    />
    
    {isLoading ? (
      <AuthLoadingOverlay />
    ) : (
    
      <div className="relative z-[10000] w-full max-w-md mx-auto px-4">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden">
        {isLoggingOut ? (
          // Logout confirmation dialog
          <div className="p-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <WKBLogo className="h-16" />
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
        <WKBLogo className="h-16" />
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
        <WKBLogo className="h-16" />
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
    )}
  </div>
)}
  </div>
  );
};

export default AuthComponent;