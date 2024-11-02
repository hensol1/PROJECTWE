// App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import logo from './assets/images/logo.svg';
import AuthComponent from './components/AuthComponent';
import Matches from './components/Matches';
import UserProfile from './components/UserProfile';
import UserStats from './components/UserStats';
import AdminPage from './components/AdminPage';
import Leaderboard from './components/Leaderboard';
import IconMenu from './components/IconMenu';
import LoadingScreen from './components/LoadingScreen';
import api from './api';
import config from './config';
import ResetPassword from './components/ResetPassword';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    const initialLoadingElement = document.getElementById('initial-loading');
    if (initialLoadingElement) {
      initialLoadingElement.remove();
    }

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
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLoading(false);
      setInitialLoad(false);
    };

    fetchUserData();
  }, []);

  if (loading || initialLoad) {
    return <LoadingScreen />;
  }

  return (
    <GoogleOAuthProvider clientId={config.googleClientId}>
      <Router>
        <div className="min-h-screen relative">
          {/* Background layers */}
          <div className="fixed inset-0 bg-gradient-to-b from-indigo-50 to-white" />
          <div className="fixed inset-0 bg-grid-pattern opacity-25" />
          <div className="fixed inset-0 bg-gradient-to-tr from-blue-50/50 via-transparent to-indigo-50/50" />
          
          {/* Content */}
          <div className="relative">
            <header className="bg-white/80 backdrop-blur-sm shadow-sm py-2 px-4">
              <div className="container mx-auto flex items-center">
                <div className="w-1/4 sm:w-1/3 flex items-center space-x-2 sm:space-x-3">
                  <img 
                    src={logo} 
                    alt="We Know Better" 
                    className="h-8 sm:h-12 md:h-14 w-auto"
                    style={{ maxWidth: '200px', minHeight: '32px' }}
                  />
                  <div className="flex items-center">
                    <span className="font-sans text-xs sm:text-xl md:text-2xl font-extrabold tracking-tight text-gray-800"
                          style={{
                            background: 'linear-gradient(to right, #2563eb, #3b82f6)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '0.05em'
                          }}>
                      WE KNOW BETTER
                    </span>
                  </div>
                </div>
                <div className="w-1/2 sm:w-1/3 flex justify-center">
                  <IconMenu user={user} />
                </div>
                <div className="w-1/4 sm:w-1/3 flex justify-end">
                  <AuthComponent setUser={setUser} user={user} />
                </div>
              </div>
            </header>
            <main className="relative flex-grow container mx-auto p-4">
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
                <Route path="/reset-password" element={<ResetPassword />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;