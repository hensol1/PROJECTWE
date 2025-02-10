// App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { HelmetProvider } from 'react-helmet-async';
import HeaderLogo from './components/HeaderLogo';
import LoadingLogo from './components/LoadingLogo';
import Matches from './components/matches/Matches';
import AdminPage from './components/AdminPage';
import IconMenu from './components/IconMenu';
import LoadingScreen from './components/LoadingScreen';
import api from './api';
import config from './config';
import CookieConsent from './components/CookieConsent.js';
import PrivacyPolicy from './components/PrivacyPolicy';
import AboutUs from './components/AboutUs';
import ContactUs from './components/ContactUs';
import Footer from './components/Footer';
import ContactAdmin from './components/ContactAdmin';
import WelcomeSlides from './components/WelcomeSlides';
import SEO from './components/SEO';
import StatsPage from './components/StatsPage';
import { BookOpen, LineChart } from 'lucide-react'; 
import InstallPrompt from './components/InstallPrompt';

function App() {
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [welcomeSlidesOpen, setWelcomeSlidesOpen] = useState(false);

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
<div className="App">
  <HelmetProvider>
    <GoogleOAuthProvider clientId={config.googleClientId}>
      <Router>
        <SEO />
        <WelcomeSlides isOpen={welcomeSlidesOpen} setIsOpen={setWelcomeSlidesOpen} />
        <div className="min-h-screen flex flex-col bg-gray-100">
          <header className="bg-[#1a1f2b] py-2 px-3 md:py-4 md:px-4">
              <div className="container mx-auto">
                <div className="grid grid-cols-3 items-center gap-2">
                  <div className="flex items-center">
                    <Link to="/" className="flex items-center space-x-1 md:space-x-2">
                      <div className="w-6 md:w-8">
                        <HeaderLogo />
                      </div>
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
                      <div className="hidden md:flex items-center space-x-1">
                        <span className="font-sans text-xl font-extrabold tracking-tight text-[#40c456]">
                          WE KNOW BETTER
                        </span>
                      </div>
                    </Link>
                  </div>

                  <div className="flex justify-center items-center space-x-4">
                    <div className="[&_svg]:text-[#40c456] [&_svg]:w-5 [&_svg]:h-5 md:[&_svg]:w-6 md:[&_svg]:h-6">
                      <IconMenu user={user} />
                    </div>
                    <button
  onClick={() => setWelcomeSlidesOpen(true)}
  className="flex items-center space-x-2 text-[#40c456] hover:text-[#3ab04e] transition-colors"
>
  <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
</button>
<Link
    to="/stats"
    className="flex items-center space-x-2 text-[#40c456] hover:text-[#3ab04e] transition-colors"
  >
    <LineChart className="w-5 h-5 md:w-6 md:h-6" />
  </Link>

                  </div>

                  <div className="flex justify-end">
                    <div className="[&_svg]:text-[#40c456] [&_svg]:w-5 [&_svg]:h-5 md:[&_svg]:w-6 md:[&_svg]:h-6">
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <main className="flex-1">
            <Routes>
                  <Route 
                    path="/" 
                    element={
                      <>
                        <SEO 
                          title="Football Predictions - We Know Better"
                          description="Make and compare football predictions with AI. Join We Know Better to track your prediction accuracy and compete with fans worldwide."
                          path="/"
                        />
                        
                          <Matches 
                          user={user} 
                          onOpenAuthModal={() => setAuthModalOpen(true)}
                        />
                      </>
                    } 
                  />
                  <Route 
                    path="/profile" 
                    element={
                      user ? (
                        <>
                          <SEO 
                            title="My Profile - We Know Better"
                            description="Manage your football prediction profile and see your prediction statistics."
                            path="/profile"
                          />
                        </>
                      ) : <Navigate to="/" />
                    }
                  />
                  <Route 
                    path="/privacy-policy" 
                    element={
                      <>
                        <SEO 
                          title="Privacy Policy - We Know Better"
                          description="Our privacy policy and data protection guidelines for football prediction services."
                          path="/privacy-policy"
                        />
                        <PrivacyPolicy />
                      </>
                    }
                  />
                  <Route 
                    path="/about" 
                    element={
                      <>
                        <SEO 
                          title="About Us - We Know Better"
                          description="Learn about We Know Better's football prediction platform and our mission to combine AI with fan knowledge."
                          path="/about"
                        />
                        <AboutUs />
                      </>
                    }
                  />
                  <Route 
                    path="/contact" 
                    element={
                      <>
                        <SEO 
                          title="Contact Us - We Know Better"
                          description="Get in touch with We Know Better's team for any questions about our football prediction platform."
                          path="/contact"
                        />
                        <ContactUs />
                      </>
                    }
                  />
<Route 
  path="/admin" 
  element={
    <>
      <SEO 
        title="Admin Dashboard - We Know Better"
        description="Admin dashboard for We Know Better platform management."
        path="/admin"
      />
      <AdminPage />
    </>
  }
/>
<Route 
  path="/stats" 
  element={
    <>
      <SEO 
        title="AI Performance Stats - We Know Better"
        description="Track our AI's prediction performance over time with detailed statistics and visualizations."
        path="/stats"
      />
      <StatsPage />
    </>
  }
/>


                  <Route 
                    path="/admin/contacts" 
                    element={
                      user?.isAdmin ? (
                        <>
                          <SEO 
                            title="Contact Management - We Know Better"
                            description="Manage contact submissions from We Know Better users."
                            path="/admin/contacts"
                          />
                          <ContactAdmin />
                        </>
                      ) : <Navigate to="/" />
                    }
                  />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </main>

            <footer className="bg-gray-800">
                <CookieConsent />
                <Footer />
              </footer>
            </div>
          </Router>
        </GoogleOAuthProvider>
      </HelmetProvider>
      <InstallPrompt />
    </div>
  );
}

export default App;
