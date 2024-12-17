// App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import HeaderLogo from './components/HeaderLogo';
import LoadingLogo from './components/LoadingLogo';
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
import AdLayout from './components/AdLayout';

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
          {/* Updated header with responsive text layout */}
          <header className="bg-[#1a1f2b] py-2 px-3 md:py-4 md:px-4">
            <div className="container mx-auto">
              <div className="grid grid-cols-3 items-center gap-2">
                {/* Logo section with responsive text layout */}
                <div className="flex items-center">
                  <Link to="/" className="flex items-center space-x-1 md:space-x-2">
                    <div className="w-6 md:w-8">
                      <HeaderLogo />
                    </div>
                    {/* Mobile: Stacked layout */}
                    <div className="flex flex-col md:hidden leading-tight">
                      <div className="flex space-x-1">
                        <span className="font-sans text-[10px] font-extrabold tracking-tight text-[#40c456]">
                          WE
                        </span>
                        <span className="font-sans text-[10px] font-extrabold tracking-tight text-[#40c456]">
                          KNOW
                        </span>
                      </div>
                      <span className="font-sans text-[10px] font-extrabold tracking-tight text-[#40c456]">
                        BETTER
                      </span>
                    </div>
                    {/* Desktop: Single line */}
                    <div className="hidden md:flex items-center space-x-1">
                      <span className="font-sans text-xl font-extrabold tracking-tight text-[#40c456]">
                        WE KNOW BETTER
                      </span>
                    </div>
                  </Link>
                </div>

                {/* Icons section */}
                <div className="flex justify-center">
                  <div className="[&_svg]:text-[#40c456] [&_svg]:w-5 [&_svg]:h-5 md:[&_svg]:w-6 md:[&_svg]:h-6">
                    <IconMenu user={user} />
                  </div>
                </div>

                {/* Auth section */}
                <div className="flex justify-end">
                  <div className="[&_svg]:text-[#40c456] [&_svg]:w-5 [&_svg]:h-5 md:[&_svg]:w-6 md:[&_svg]:h-6">
                    <AuthComponent setUser={setUser} user={user} />
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-grow container mx-auto relative">
  <AdLayout>
    <Routes>
      <Route path="/" element={<Matches user={user} />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/profile" element={user ? <UserProfile user={user} /> : <Navigate to="/" />} />
      <Route path="/stats" element={user ? <UserStats user={user} /> : <Navigate to="/" />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
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
  </AdLayout>
</main>

          <CookieConsent />
          <Footer />
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;