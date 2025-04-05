import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { HelmetProvider } from 'react-helmet-async';
import HeaderLogo from './components/HeaderLogo';
import AdminPage from './components/AdminPage';
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
import OddsPage from './components/OddsPage'; // Import the new OddsPage component
import { BookOpen, LineChart, FileText, Dices } from 'lucide-react'; // Added DollarSign
import InstallPrompt from './components/InstallPrompt';
import { BlogList } from './components/blog/BlogList';
import { BlogPost } from './components/blog/BlogPost';
import { BlogEditor } from './components/blog/BlogEditor';
import { PrivateRoute } from './components/PrivateRoute';
import LoadingManager from './components/LoadingManager';
import HomePage from './pages/HomePage'; 

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

  return (
    <LoadingManager isLoading={loading || initialLoad}>
      <div className="App">
        <HelmetProvider>
          <GoogleOAuthProvider clientId={config.googleClientId}>
            <Router>
              <SEO />
              <WelcomeSlides isOpen={welcomeSlidesOpen} setIsOpen={setWelcomeSlidesOpen} />
              <div className="min-h-screen flex flex-col bg-gray-100">
              <header className="bg-gradient-to-r from-[#1a1f2b] to-[#242938] py-2 px-3 md:py-4 md:px-4 shadow-md">
  <div className="container mx-auto relative">
    {/* Using a more straightforward layout approach */}
    <div className="flex justify-between items-center">
      {/* Logo at the left */}
      <div>
        <Link to="/" className="flex items-center space-x-2 md:space-x-3 group">
          <div className="w-8 md:w-10 h-8 md:h-10 flex items-center justify-center flex-shrink-0">
            <HeaderLogo />
          </div>
          <div className="hidden sm:flex flex-col md:hidden leading-tight">
            <div className="flex items-center space-x-1">
              <span className="font-sans text-[12px] font-bold tracking-wide text-[#40c456]">WE</span>
              <span className="font-sans text-[12px] font-bold tracking-wide text-[#40c456]">KNOW</span>
            </div>
            <span className="font-sans text-[12px] font-bold tracking-wide text-[#40c456]">BETTER</span>
          </div>

          {/* Desktop version */}
          <div className="hidden md:flex items-center space-x-2">
            <span className="font-sans text-xl font-bold tracking-wide text-[#40c456]">
              WE KNOW BETTER
            </span>
          </div>
        </Link>
      </div>

      {/* Empty right section for balance */}
      <div className="invisible">
        <Link to="/" className="flex items-center space-x-2 md:space-x-3 group">
          <div className="w-8 md:w-10 h-8 md:h-10"></div>
          <div className="hidden md:flex items-center space-x-2">
            <span className="font-sans text-xl font-bold tracking-wide text-[#40c456]">
              WE KNOW BETTER
            </span>
          </div>
        </Link>
      </div>
    </div>

    {/* Centered navigation - absolutely positioned */}
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className="flex space-x-3 md:space-x-6">
        <Link to="/" 
          className="group p-2 rounded-lg hover:bg-[#2c3344] transition-all duration-200"
          title="Home"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 md:w-6 md:h-6 text-[#40c456] group-hover:text-white transition-colors duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </Link>
        
        <button
          onClick={() => setWelcomeSlidesOpen(true)}
          className="group p-2 rounded-lg hover:bg-[#2c3344] transition-all duration-200"
          title="About"
        >
          <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-[#40c456] group-hover:text-white transition-colors duration-200" />
        </button>
        
        <Link
          to="/stats"
          className="group p-2 rounded-lg hover:bg-[#2c3344] transition-all duration-200"
          title="Stats"
        >
          <LineChart className="w-5 h-5 md:w-6 md:h-6 text-[#40c456] group-hover:text-white transition-colors duration-200" />
        </Link>
        
        <Link
          to="/blog"
          className="group p-2 rounded-lg hover:bg-[#2c3344] transition-all duration-200"
          title="Blog"
        >
          <FileText className="w-5 h-5 md:w-6 md:h-6 text-[#40c456] group-hover:text-white transition-colors duration-200" />
        </Link>
        
        <Link
          to="/odds"
          className="group p-2 rounded-lg hover:bg-[#2c3344] transition-all duration-200"
          title="Odds"
        >
          <Dices className="w-5 h-5 md:w-6 md:h-6 text-[#40c456] group-hover:text-white transition-colors duration-200" />
        </Link>
      </div>
    </div>
  </div>
</header>

<main className="flex-1 pt-4">
                  <Routes>
                    <Route 
                      path="/" 
                      element={<HomePage user={user} setAuthModalOpen={setAuthModalOpen} />} 
                    />
                    <Route 
                      path="/odds" 
                      element={
                        <>
                          <SEO 
                            title="Today's Odds - We Know Better"
                            description="View today's football betting odds and predictions across all major leagues and matches."
                            path="/odds"
                          />
                          <OddsPage />
                        </>
                      } 
                    />
                    {/* Other routes remain the same */}
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
                    <Route 
                      path="/blog" 
                      element={
                        <>
                          <SEO 
                            title="Match Reviews - We Know Better"
                            description="Read our expert match previews and analysis for upcoming football matches."
                            path="/blog"
                          />
                          <BlogList />
                        </>
                      } 
                    />
                    <Route 
                      path="/blog/:slug" 
                      element={
                        <>
                          <SEO 
                            title="Match Review - We Know Better"
                            description="Detailed analysis and predictions for football matches."
                            path="/blog"
                          />
                          <BlogPost />
                        </>
                      } 
                    />
                    <Route 
                      path="/admin/blog/edit/:id" 
                      element={
                        <PrivateRoute>
                          <BlogEditor />
                        </PrivateRoute>
                      } 
                    />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/admin/blog" element={<AdminPage defaultTab="blog" />} />
                    <Route 
                      path="/admin/blog/new" 
                      element={
                        <PrivateRoute>
                          <BlogEditor />
                        </PrivateRoute>
                      } 
                    />
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
    </LoadingManager>
  );
}

export default App;