import React, { useEffect, useState } from 'react';

const LoadingManager = ({ children, isLoading, minLoadTime = 1000 }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (!isLoading && isFirstLoad) {
      const timer = setTimeout(() => {
        setIsFirstLoad(false);
        setShouldRender(true);
        requestAnimationFrame(() => {
          setOpacity(1);
        });
      }, minLoadTime);

      return () => clearTimeout(timer);
    }
  }, [isLoading, isFirstLoad, minLoadTime]);

  if (!shouldRender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full border-t-4 border-emerald-500 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-r-4 border-emerald-400 animate-spin-slow"></div>
            <div className="absolute inset-4 rounded-full border-b-4 border-emerald-300 animate-spin-slower"></div>
          </div>
          <div className="text-emerald-500 font-semibold animate-pulse">
            Loading predictions and stats...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="transition-opacity duration-500 ease-in-out"
      style={{ opacity }}
    >
      {children}
    </div>
  );
};

export default LoadingManager;