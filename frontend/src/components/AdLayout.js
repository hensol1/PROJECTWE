// src/components/AdLayout.js
import React, { useEffect } from 'react';

const AdLayout = ({ children }) => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error('Error initializing ads:', error);
    }
  }, []);

  return (
    <div className="w-full max-w-[1800px] mx-auto flex justify-center relative">
      {/* Left sidebar ad */}
      <div className="hidden xl:block sticky top-20 h-[600px] w-[160px] mr-4">
        <ins className="adsbygoogle"
             style={{ display: 'block' }}
             data-ad-client="ca-pub-1574148506339871"
             data-ad-slot="LEFT_AD_SLOT_ID"
             data-ad-format="vertical"
             data-full-width-responsive="false" />
      </div>

      {/* Main content */}
      <div className="flex-1 max-w-[1200px]">
        {children}
      </div>

      {/* Right sidebar ad */}
      <div className="hidden xl:block sticky top-20 h-[600px] w-[160px] ml-4">
        <ins className="adsbygoogle"
             style={{ display: 'block' }}
             data-ad-client="ca-pub-1574148506339871"
             data-ad-slot="RIGHT_AD_SLOT_ID"
             data-ad-format="vertical"
             data-full-width-responsive="false" />
      </div>
    </div>
  );
};

export default AdLayout;