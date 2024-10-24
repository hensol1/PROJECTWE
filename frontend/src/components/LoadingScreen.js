import React, { useEffect } from 'react';
import Lottie from 'lottie-react';
import loadingAnimation from '../loadingAnimation.json';

const LoadingScreen = () => {
  useEffect(() => {
    // Ensure the loading screen is visible immediately
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50 transition-opacity duration-300">
      <div className="w-64 h-64">
        <Lottie
          animationData={loadingAnimation}
          loop={true}
          autoplay={true}
        />
      </div>
    </div>
  );
};

export default LoadingScreen;