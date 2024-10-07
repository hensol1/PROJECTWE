import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import config from '../config';

const AuthComponent = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);

  const countries = ['USA', 'UK', 'France', 'Germany', 'Spain', 'Italy']; // Add more countries as needed

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${config.apiUrl}/api/auth/${isLogin ? 'login' : 'register'}`, {
        username,
        password,
        email,
        country
      });
      console.log('Response:', response.data);
      setLoggedInUser(username);
    } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        const response = await axios.post(`${config.apiUrl}/api/auth/google`, {
          code: codeResponse.code
        });
        console.log('Google login response:', response.data);
        setLoggedInUser(response.data.username);
      } catch (error) {
        console.error('Google login error:', error.response ? error.response.data : error.message);
      }
    },
    onError: (error) => console.log('Login Failed:', error)
  });

  if (loggedInUser) {
    return <div>Welcome, {loggedInUser}!</div>;
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
              placeholder="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
            >
              <option value="">Select a country</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
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