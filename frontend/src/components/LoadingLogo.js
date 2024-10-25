import React from 'react';
import logo from '../assets/images/logo.svg';

const LoadingLogo = () => {
  return (
    <div className="flex justify-center items-center min-h-[200px]">
      <img 
        src={logo} 
        alt="Loading..." 
        className="w-20 h-20 animate-bounce"
        style={{
          animation: 'bounce 1s infinite'
        }}
      />
    </div>
  );
};

export default LoadingLogo;