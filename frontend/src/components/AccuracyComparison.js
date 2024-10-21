import React, { useState, useEffect } from 'react';
import api from '../api';
import { InfoIcon } from 'lucide-react';

const AccuracyBox = ({ label, animatedAccuracy, isWinning }) => {
  const color = isWinning ? '#22c55e' : '#ef4444';
  
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs font-bold mb-1">{label}</span>
      <div 
        className="w-24 h-14 sm:w-28 sm:h-16 border-2 rounded-md flex items-center justify-center bg-white"
        style={{ borderColor: color }}
      >
        <span 
          className="text-lg sm:text-xl font-bold transition-all duration-100 ease-out"
          style={{ color: color }}
        >
          {animatedAccuracy.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

const AccuracyComparison = () => {
  const [accuracyData, setAccuracyData] = useState({ fanAccuracy: 0, aiAccuracy: 0, lastUpdated: new Date() });
  const [animatedFanAccuracy, setAnimatedFanAccuracy] = useState(0);
  const [animatedAiAccuracy, setAnimatedAiAccuracy] = useState(0);
  const [error, setError] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const fetchAccuracy = async () => {
      try {
        const response = await api.fetchAccuracy();
        setAccuracyData(response.data);
        setError(null);
      } catch (error) {
        console.error('Error fetching accuracy data:', error);
        setError('Failed to load accuracy data. Please try again later.');
      }
    };

    fetchAccuracy();
  }, []);

  useEffect(() => {
    const animationDuration = 2000;
    const steps = 60;
    const fanStep = accuracyData.fanAccuracy / steps;
    const aiStep = accuracyData.aiAccuracy / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      setAnimatedFanAccuracy((prev) => Math.min(prev + fanStep, accuracyData.fanAccuracy));
      setAnimatedAiAccuracy((prev) => Math.min(prev + aiStep, accuracyData.aiAccuracy));

      if (currentStep >= steps) {
        clearInterval(interval);
      }
    }, animationDuration / steps);

    return () => clearInterval(interval);
  }, [accuracyData]);

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  const isFanWinning = accuracyData.fanAccuracy > accuracyData.aiAccuracy;

  return (
    <div className="flex flex-col items-center relative">
      <div className="flex justify-center items-center space-x-2 sm:space-x-4 my-4">
        <AccuracyBox 
          label="FANS" 
          animatedAccuracy={animatedFanAccuracy} 
          isWinning={isFanWinning} 
        />
        <div className="text-lg sm:text-xl font-bold">VS</div>
        <AccuracyBox 
          label="AI" 
          animatedAccuracy={animatedAiAccuracy} 
          isWinning={!isFanWinning} 
        />
        <div 
          className="ml-1 sm:ml-2 cursor-pointer relative"
          onClick={() => setShowTooltip(!showTooltip)}
        >
          <InfoIcon size={18} className="text-gray-500" />
          {showTooltip && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
              <div className="bg-white rounded-lg p-4 max-w-xs w-full shadow-lg">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTooltip(false);
                  }}
                  className="float-right text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
                <p className="text-sm text-gray-700 mb-2">
                  This comparison shows the prediction accuracy of Fans vs AI for football matches. The percentages represent how often each group correctly predicts the match outcomes.
                </p>
                <p className="text-xs text-gray-500">
                  Last updated: {new Date(accuracyData.lastUpdated).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccuracyComparison;