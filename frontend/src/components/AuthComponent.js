import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

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
    // Here you would typically send a request to your backend
    console.log('Form submitted:', { username, password, email, country });
    // For demonstration, we'll just set the logged in user
    setLoggedInUser(username);
  };

  const googleLogin = useGoogleLogin({
    onSuccess: (codeResponse) => {
      console.log(codeResponse);
      // Here you would typically send the code to your backend
      // For now, we'll just prompt for a username and country
      const googleUsername = prompt('Please choose a username:');
      const googleCountry = prompt('Please choose a country:');
      setLoggedInUser(googleUsername);
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