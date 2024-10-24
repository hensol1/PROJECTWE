import React, { useState, useEffect } from 'react';
import { InfoIcon } from 'lucide-react';
import api from '../api';

const AccuracyBox = ({ label, animatedAccuracy, isWinning }) => {
  const color = isWinning ? '#22c55e' : '#ef4444';
  const shadowColor = isWinning ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
  
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs font-bold mb-1">{label}</span>
      <div 
        className="w-24 h-14 sm:w-28 sm:h-16 rounded-xl flex items-center justify-center bg-white relative transform transition-all duration-300 hover:scale-105"
        style={{
          background: 'linear-gradient(145deg, #ffffff, #f5f5f5)',
          boxShadow: `3px 3px 6px ${shadowColor}, 
                      -3px -3px 6px rgba(255, 255, 255, 0.8),
                      inset 1px 1px 1px rgba(255, 255, 255, 0.8),
                      inset -1px -1px 1px rgba(174, 174, 192, 0.2)`,
          border: `2px solid ${color}`,
          borderRadius: '12px',
        }}
      >
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background: `linear-gradient(145deg, ${shadowColor} 0%, transparent 100%)`,
            opacity: '0.1',
            borderRadius: '10px',
          }}
        />
        <span 
          className="text-lg sm:text-xl font-bold transition-all duration-100 ease-out relative z-10"
          style={{ 
            color,
            textShadow: `1px 1px 2px ${shadowColor}`,
          }}
        >
          {animatedAccuracy.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

const AccuracyComparison = () => {
  const [accuracyData, setAccuracyData] = useState({
    fanAccuracy: 0,
    aiAccuracy: 0,
    lastUpdated: new Date()
  });
  const [animatedFanAccuracy, setAnimatedFanAccuracy] = useState(0);
  const [animatedAiAccuracy, setAnimatedAiAccuracy] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  const fetchAccuracyData = async () => {
    try {
      setIsLoading(true);
      const response = await api.fetchAccuracy();
      const newData = {
        fanAccuracy: Number(response?.data?.fanAccuracy || 0),
        aiAccuracy: Number(response?.data?.aiAccuracy || 0),
        lastUpdated: new Date(response?.data?.lastUpdated || Date.now())
      };
      setAccuracyData(newData);
      setError(null);
    } catch (error) {
      console.error('Error fetching accuracy data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccuracyData();
    const refreshInterval = setInterval(fetchAccuracyData, 15 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    const animationDuration = 2000;
    const steps = 60;
    const fanStep = accuracyData.fanAccuracy / steps;
    const aiStep = accuracyData.aiAccuracy / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      setAnimatedFanAccuracy((prev) => 
        Math.min(prev + fanStep, accuracyData.fanAccuracy)
      );
      setAnimatedAiAccuracy((prev) => 
        Math.min(prev + aiStep, accuracyData.aiAccuracy)
      );

      if (currentStep >= steps) {
        clearInterval(interval);
      }
    }, animationDuration / steps);

    return () => clearInterval(interval);
  }, [accuracyData]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-blue-500 hover:text-blue-600"
        >
          Try Again
        </button>
      </div>
    );
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
        <div className="text-lg sm:text-xl font-bold text-gray-700">VS</div>
        <AccuracyBox 
          label="AI" 
          animatedAccuracy={animatedAiAccuracy} 
          isWinning={!isFanWinning} 
        />
        <div 
          className="ml-1 sm:ml-2 cursor-pointer relative"
          onClick={() => setShowTooltip(!showTooltip)}
        >
          <InfoIcon size={18} className="text-gray-500 hover:text-gray-700 transition-colors duration-200" />
          {showTooltip && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
              <div 
                className="bg-white rounded-lg p-4 max-w-xs w-full"
                style={{
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
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
                  This comparison shows the prediction accuracy of Fans vs AI for football matches. 
                  The percentages represent how often each group correctly predicts the match outcomes.
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