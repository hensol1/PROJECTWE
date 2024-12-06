// src/components/CookieConsent.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const hasConsented = localStorage.getItem('cookieConsent');
    if (!hasConsented) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm text-white p-4 shadow-lg z-50">
      <div className="max-w-screen-xl mx-auto flex flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-200">
          We use cookies to enhance your experience. By using our website, you agree to our use of cookies.
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAccept}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg
                     transition-colors duration-200 text-sm font-medium whitespace-nowrap"
          >
            Accept
          </button>
          <Link
            to="/privacy-policy"
            className="text-blue-300 hover:text-blue-200 text-sm"
          >
            Learn More
          </Link>
        </div>
      </div>
    </div>
  );
  };

export default CookieConsent;