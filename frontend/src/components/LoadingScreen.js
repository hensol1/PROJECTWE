import React from 'react';
import Lottie from 'lottie-react';
import loadingAnimation from '../loadingAnimation.json';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50 transition-opacity duration-300 p-4">
      <div className="w-full h-full max-w-screen-lg" style={{ minHeight: '60vh' }}>
        <Lottie
          animationData={loadingAnimation}
          loop={true}
          autoplay={true}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />
      </div>
    </div>
  );
};

export default LoadingScreen;