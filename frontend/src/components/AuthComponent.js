import React, { useState, useMemo } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import api from '../api';
import Select from 'react-select';
import countryList from 'react-select-country-list';

const AuthComponent = () => {
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
        country: country.value // We now send the country code
      });
      console.log('Response:', response.data);
      setLoggedInUser(username);
      localStorage.setItem('token', response.data.token);
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

        console.log('Google login response:', response.data);

        if (response.data.isNewUser) {
          setIsFirstTimeGoogleUser(true);
          setGoogleUserInfo(userInfo.data);
        } else {
          setLoggedInUser(response.data.user.username);
          localStorage.setItem('token', response.data.token);
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
        country: country.value // We now send the country code
      });

      setLoggedInUser(response.data.user.username);
      localStorage.setItem('token', response.data.token);
      setIsFirstTimeGoogleUser(false);
    } catch (error) {
      console.error('Error completing profile:', error.response?.data || error.message);
    }
  };

  if (isFirstTimeGoogleUser) {
    return (
      <div className="auth-container">
        <h2>Complete Your Profile</h2>
        <form onSubmit={handleFirstTimeGoogleUser}>
          <input
            type="text"
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Select
            options={countries}
            value={country}
            onChange={(value) => setCountry(value)}
            placeholder="Select a country"
          />
          <button type="submit">Complete Profile</button>
        </form>
      </div>
    );
  }

  if (loggedInUser) {
    return (
      <div>
        <p>Welcome, {loggedInUser}!</p>
        <button onClick={handleLogout}>Logout</button>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <h2>{isLogin ? 'Login' : 'Register'}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {!isLogin && (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Select
              options={countries}
              value={country}
              onChange={(value) => setCountry(value)}
              placeholder="Select a country"
            />
          </>
        )}
        <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
      </form>
      <button onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? 'Need to register?' : 'Already have an account?'}
      </button>
      <button onClick={() => googleLogin()}>Login with Google</button>
    </div>
  );
};

export default AuthComponent;
