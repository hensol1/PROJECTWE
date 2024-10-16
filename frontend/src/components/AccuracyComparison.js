import React, { useState, useEffect } from 'react';

const AccuracyBox = ({ label, animatedAccuracy, isWinning }) => {
  const color = isWinning ? '#22c55e' : '#ef4444'; // green-500 and red-500 hex values
  
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs font-bold mb-1">{label}</span>
      <div 
        className="w-28 h-16 border-2 rounded-md flex items-center justify-center bg-white"
        style={{ borderColor: color }}
      >
        <span 
          className="text-xl font-bold transition-all duration-100 ease-out"
          style={{ color: color }}
        >
          {animatedAccuracy.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

const AccuracyComparison = ({ fanAccuracy, aiAccuracy }) => {
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

  const isFanWinning = fanAccuracy > aiAccuracy;

  return (
    <div className="flex justify-center items-center space-x-4 my-4">
      <AccuracyBox 
        label="FANS" 
        animatedAccuracy={animatedFanAccuracy} 
        isWinning={isFanWinning} 
      />
      <div className="text-xl font-bold">VS</div>
      <AccuracyBox 
        label="AI" 
        animatedAccuracy={animatedAiAccuracy} 
        isWinning={!isFanWinning} 
      />
    </div>
  );
};

export default AccuracyComparison;