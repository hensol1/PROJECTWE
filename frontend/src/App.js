// App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import HeaderLogo from './components/HeaderLogo';  // Import the new HeaderLogo component
import LoadingLogo from './components/LoadingLogo';  // Keep this for loading screens
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
import CookieConsent from './components/CookieConsent.js';
import PrivacyPolicy from './components/PrivacyPolicy';
import AboutUs from './components/AboutUs';
import ContactUs from './components/ContactUs';
import Footer from './components/Footer';
import ContactAdmin from './components/ContactAdmin';
import WelcomeSlides from './components/WelcomeSlides';

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
        <WelcomeSlides />
          <div className="bg-gray-100 min-h-screen flex flex-col">
          <header className="bg-white shadow-sm py-2 px-4 relative">
            <div className="container mx-auto flex items-center">
            <div className="w-1/4 sm:w-1/3 flex items-center space-x-2 sm:space-x-3">
  <Link to="/" className="flex items-center space-x-2 sm:space-x-3">
    <HeaderLogo />
    <div className="flex items-center">
      <span className="font-sans text-xs sm:text-xl md:text-2xl font-extrabold tracking-tight text-gray-800"
            style={{
              background: 'linear-gradient(to right, #40c456, #2d8b3c)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.05em'
            }}>
        WE KNOW BETTER
      </span>
    </div>
  </Link>
</div>
              <div className="w-1/2 sm:w-1/3 flex justify-center">
                <IconMenu user={user} />
              </div>
              <div className="w-1/4 sm:w-1/3 flex justify-end">
                <AuthComponent setUser={setUser} user={user} />
              </div>
            </div>
          </header>
          <main className="flex-grow container mx-auto p-4 relative">
            <Routes>
              <Route path="/" element={<Matches user={user} />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/profile" element={user ? <UserProfile user={user} /> : <Navigate to="/" />} />
              <Route path="/stats" element={user ? <UserStats user={user} /> : <Navigate to="/" />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} /> {/* Add this line */}
              {user && user.isAdmin && (<Route path="/admin" element={<AdminPage />} />)}
              <Route path="*" element={<Navigate to="/" />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route 
  path="/admin/contacts" 
  element={user?.isAdmin ? <ContactAdmin /> : <Navigate to="/" />} 
/>




            </Routes>
          </main>
          <CookieConsent />
          <Footer />
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;