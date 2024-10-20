import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AuthComponent from './components/AuthComponent';
import Matches from './components/Matches';
import UserProfile from './components/UserProfile';
import UserStats from './components/UserStats';
import AdminPage from './components/AdminPage';
import Leaderboard from './components/Leaderboard';
import CustomButton from './components/CustomButton';
import IconMenu from './components/IconMenu'; // Add this line
import api from './api';
import config from './config';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const profileResponse = await api.getUserProfile();
          const statsResponse = await api.getUserStats();
          setUser({
            ...profileResponse.data,
            stats: statsResponse.data
          });
        } catch (error) {
          console.error('Error fetching user data:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <GoogleOAuthProvider clientId={config.googleClientId}>
      <Router>
        <div className="bg-gray-100 min-h-screen flex flex-col">
          <header className="bg-white shadow-sm py-2 px-4">
            <div className="container mx-auto flex justify-between items-center">
              <h1 className="text-lg font-bold text-gray-800">We Know Better</h1>
              <AuthComponent setUser={setUser} user={user} CustomButton={CustomButton} />
            </div>
          </header>
          <nav className="bg-gray-200 shadow-sm">
            <IconMenu user={user} />
          </nav>
          <main className="flex-grow container mx-auto p-4">
            <Routes>
              <Route path="/" element={<Matches user={user} />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route 
                path="/profile" 
                element={user ? <UserProfile user={user} /> : <Navigate to="/" />} 
              />
              <Route 
                path="/stats" 
                element={user ? <UserStats user={user} /> : <Navigate to="/" />} 
              />
              {user && user.isAdmin && (
                <Route path="/admin" element={<AdminPage />} />
              )}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;