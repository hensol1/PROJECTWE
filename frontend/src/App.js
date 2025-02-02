import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { HelmetProvider } from 'react-helmet-async';
import HeaderLogo from './components/HeaderLogo';
import LoadingLogo from './components/LoadingLogo';
import IconMenu from './components/IconMenu';
import LoadingScreen from './components/LoadingScreen';
import api from './api';
import config from './config';
import SEO from './components/SEO';
import { BookOpen, LineChart } from 'lucide-react';

// Lazy load non-critical components
const Matches = lazy(() => import('./components/Matches'));
const AdminPage = lazy(() => import('./components/AdminPage'));
const CookieConsent = lazy(() => import('./components/CookieConsent'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const AboutUs = lazy(() => import('./components/AboutUs'));
const ContactUs = lazy(() => import('./components/ContactUs'));
const Footer = lazy(() => import('./components/Footer'));
const ContactAdmin = lazy(() => import('./components/ContactAdmin'));
const WelcomeSlides = lazy(() => import('./components/WelcomeSlides'));
const StatsPage = lazy(() => import('./components/StatsPage'));
const InstallPrompt = lazy(() => import('./components/InstallPrompt'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex justify-center items-center min-h-[200px]">
    <LoadingLogo />
  </div>
);

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
          const [profileResponse, statsResponse] = await Promise.all([
            api.getUserProfile(),
            api.getUserStats()
          ]);
          
          setUser({
            ...profileResponse.data,
            stats: statsResponse.data
          });
        } catch (error) {
          console.error('Error fetching user data:', error);
          localStorage.removeItem('token');
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 800));
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
            <Suspense fallback={<LoadingFallback />}>
              <WelcomeSlides isOpen={welcomeSlidesOpen} setIsOpen={setWelcomeSlidesOpen} />
              <div className="bg-gray-100 min-h-screen flex flex-col relative">
                <header className="bg-[#1a1f2b] py-2 px-3 md:py-4 md:px-4 sticky top-0 z-50">
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

                <main className="flex-grow container mx-auto relative px-4">
                  <Suspense fallback={<LoadingFallback />}>
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
                  </Suspense>
                </main>

                <Suspense fallback={null}>
                  <CookieConsent />
                  <Footer />
                </Suspense>
              </div>
            </Suspense>
          </Router>
        </GoogleOAuthProvider>
      </HelmetProvider>
      <Suspense fallback={null}>
        <InstallPrompt />
      </Suspense>
    </div>
  );
}

export default App;