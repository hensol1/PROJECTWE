// src/components/CookieConsent.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true and unchangeable
    analytics: false,
    advertising: false
  });

  useEffect(() => {
    // Check if user has already made cookie choices
    const savedConsent = localStorage.getItem('cookieConsent');
    if (!savedConsent) {
      setIsVisible(true);
    } else {
      try {
        setPreferences(JSON.parse(savedConsent));
      } catch (e) {
        setIsVisible(true);
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const allConsent = {
      necessary: true,
      analytics: true,
      advertising: true,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookieConsent', JSON.stringify(allConsent));
    setIsVisible(false);
    
    // Initialize Google AdSense with consent
    if (window.adsbygoogle) {
      window.adsbygoogle.requestNonPersonalizedAds = false;
    }
  };

  const handleRejectAll = () => {
    const minimalConsent = {
      necessary: true,
      analytics: false,
      advertising: false,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookieConsent', JSON.stringify(minimalConsent));
    setIsVisible(false);
    
    // Initialize Google AdSense without personalization
    if (window.adsbygoogle) {
      window.adsbygoogle.requestNonPersonalizedAds = true;
    }
  };

  const handleSavePreferences = () => {
    const savedPreferences = {
      ...preferences,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookieConsent', JSON.stringify(savedPreferences));
    setIsVisible(false);
    
    // Initialize Google AdSense based on preferences
    if (window.adsbygoogle) {
      window.adsbygoogle.requestNonPersonalizedAds = !preferences.advertising;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm text-white p-4 shadow-lg z-50">
      <div className="max-w-screen-xl mx-auto space-y-4">
        <div className="text-sm text-gray-200">
          We value your privacy. We and our partners use cookies and similar technologies to enhance your experience, analyze traffic, and deliver personalized advertisements. 
        </div>
        
        {showOptions ? (
          <div className="space-y-4 bg-gray-800/50 p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Necessary Cookies</span>
                <input type="checkbox" checked disabled className="accent-blue-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Analytics Cookies</span>
                <input 
                  type="checkbox" 
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences(prev => ({...prev, analytics: e.target.checked}))}
                  className="accent-blue-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Advertising Cookies</span>
                <input 
                  type="checkbox" 
                  checked={preferences.advertising}
                  onChange={(e) => setPreferences(prev => ({...prev, advertising: e.target.checked}))}
                  className="accent-blue-500"
                />
              </div>
            </div>
            <button
              onClick={handleSavePreferences}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
            >
              Save Preferences
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleAcceptAll}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg transition-colors duration-200 text-sm font-medium whitespace-nowrap"
            >
              Accept All
            </button>
            <button
              onClick={handleRejectAll}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded-lg transition-colors duration-200 text-sm font-medium whitespace-nowrap"
            >
              Reject All
            </button>
            <button
              onClick={() => setShowOptions(true)}
              className="text-blue-300 hover:text-blue-200 text-sm underline"
            >
              Manage Options
            </button>
            <Link
              to="/privacy-policy"
              className="text-blue-300 hover:text-blue-200 text-sm underline"
            >
              Privacy Policy
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default CookieConsent;