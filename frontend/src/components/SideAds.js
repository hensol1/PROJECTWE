// src/components/SideAds.js
import React, { useEffect, useState } from 'react';

const SideAds = () => {
  const [showAds, setShowAds] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setShowAds(window.innerWidth >= 1366);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Add the second zone
    const secondZoneScript = document.createElement('script');
    secondZoneScript.src = "//woazohetour.net/tag.min.js";
    secondZoneScript.setAttribute('data-zone', '8728063');
    secondZoneScript.setAttribute('data-cfasync', 'false');
    secondZoneScript.async = true;
    document.body.appendChild(secondZoneScript);

    return () => {
      window.removeEventListener('resize', handleResize);
      // Cleanup if needed
      if (secondZoneScript.parentNode) {
        secondZoneScript.parentNode.removeChild(secondZoneScript);
      }
    };
  }, []);

  if (!showAds) return null;

  return (
    <>
      <div className="fixed left-0 top-1/2 transform -translate-y-1/2 z-40 w-[160px] h-[600px]">
        <div id="zone-8728062" />
      </div>
      <div className="fixed right-0 top-1/2 transform -translate-y-1/2 z-40 w-[160px] h-[600px]">
        <div id="zone-8728063" />
      </div>
    </>
  );
};

export default SideAds;