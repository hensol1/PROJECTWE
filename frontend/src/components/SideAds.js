// src/components/SideAds.js
import React, { useEffect, useState } from 'react';

const SideAds = () => {
  const [showAds, setShowAds] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setShowAds(window.innerWidth >= 1366);
    };

    // Initial check
    handleResize();

    // Add listener for window resize
    window.addEventListener('resize', handleResize);

    // PropellerAds initialization
    const initAds = () => {
      // Your PropellerAds initialization code here
      (function() {
        // Left side ad
        const zoneConfigLeft = {
          width: 160,
          height: 600,
          zoneId: '8728062', // Replace with your actual zone ID
        };
        
        // Right side ad
        const zoneConfigRight = {
          width: 160,
          height: 600,
          zoneId: '8728062', // Replace with your actual zone ID
        };
      })();
    };

    // Initialize ads
    initAds();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (!showAds) return null;

  return (
    <>
      <div className="ad-container ad-container-left">
        <div id="propellerads-left" />
      </div>
      <div className="ad-container ad-container-right">
        <div id="propellerads-right" />
      </div>
    </>
  );
};

export default SideAds;