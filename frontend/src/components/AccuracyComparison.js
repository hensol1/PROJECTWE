import React, { useState, useEffect } from 'react';

const AccuracyComparison = ({ fanAccuracy, aiAccuracy, }) => {
  const [animatedFanAccuracy, setAnimatedFanAccuracy] = useState(0);
  const [animatedAiAccuracy, setAnimatedAiAccuracy] = useState(0);

  useEffect(() => {
    const animationDuration = 2000; // 2 seconds
    const steps = 60; // 60 steps for smooth animation
    const fanStep = fanAccuracy / steps;
    const aiStep = aiAccuracy / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      setAnimatedFanAccuracy((prev) => Math.min(prev + fanStep, fanAccuracy));
      setAnimatedAiAccuracy((prev) => Math.min(prev + aiStep, aiAccuracy));

      if (currentStep >= steps) {
        clearInterval(interval);
      }
    }, animationDuration / steps);

    return () => clearInterval(interval);
  }, [fanAccuracy, aiAccuracy]);


  return (
    <div className="flex justify-center items-center space-x-2 my-4">
      <div className="flex flex-col items-center">
        <span className="text-sm font-bold mb-1">FANS</span>
        <div className="w-32 h-32 border-2 border-blue-500 rounded-lg flex flex-col items-center justify-center bg-white">
          <span className="text-2xl font-bold text-blue-500 transition-all duration-100 ease-out">
            {animatedFanAccuracy.toFixed(1)}%
          </span>
        </div>
      </div>
      
      <div className="text-xl font-bold">VS</div>
      
      <div className="flex flex-col items-center">
        <span className="text-sm font-bold mb-1">AI</span>
        <div className="w-32 h-32 border-2 border-red-500 rounded-lg flex flex-col items-center justify-center bg-white">
          <span className="text-2xl font-bold text-red-500 transition-all duration-100 ease-out">
            {animatedAiAccuracy.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default AccuracyComparison;