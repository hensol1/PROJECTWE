import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InfoIcon, Sparkle } from 'lucide-react';
import api from '../api';

const AccuracyBox = ({ label, animatedAccuracy, isWinning, dailyStats, onClick }) => {
  const color = isWinning ? '#22c55e' : '#ef4444';
  const shadowColor = isWinning ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
  const percentage = dailyStats && dailyStats.total > 0 
    ? ((dailyStats.correct / dailyStats.total) * 100).toFixed(1) 
    : '0.0';
  
  return (
    <div className="flex flex-col items-center relative">
      <span className="text-xs font-bold mb-1">{label}</span>
      <div 
        onClick={onClick}
        className="w-24 h-14 sm:w-28 sm:h-16 rounded-xl flex items-center justify-center bg-white relative transform transition-all duration-300 hover:scale-105 cursor-pointer"
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
      
      {/* Modern Tooltip */}
      {dailyStats && (
        <div 
          className="absolute mt-20 bg-white rounded-xl transform transition-all duration-200 z-50"
          style={{
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          {/* Tooltip Arrow */}
          <div 
            className="absolute -top-2 left-1/2 transform -translate-x-1/2"
            style={{
              width: '12px',
              height: '12px',
              backgroundColor: 'white',
              transform: 'rotate(45deg) translateX(-50%)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.7)',
              borderTop: '1px solid rgba(255, 255, 255, 0.7)',
              boxShadow: '-2px -2px 5px rgba(0, 0, 0, 0.03)',
              marginLeft: '6px'
            }}
          />

          <div className="p-4 min-w-[200px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Today's Predictions</h3>
              <Sparkle 
                size={16} 
                className="text-yellow-400"
                style={{ 
                  filter: 'drop-shadow(0 0 2px rgba(250, 204, 21, 0.4))'
                }} 
              />
            </div>

            {/* Stats */}
            <div className="space-y-2">
              {/* Correct Predictions */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Correct</span>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-green-600">
                    {dailyStats.correct}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">
                    /{dailyStats.total}
                  </span>
                </div>
              </div>

              {/* Success Rate */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Success Rate</span>
                <div className="flex items-center">
                  <span 
                    className="text-sm font-medium"
                    style={{ color }}
                  >
                    {percentage}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
                <div 
                  className="h-full transition-all duration-500 ease-out rounded-full"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: color,
                    boxShadow: `0 0 8px ${shadowColor}`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AccuracyComparison = () => {
  const [accuracyData, setAccuracyData] = useState({
    fanAccuracy: 0,
    aiAccuracy: 0,
    lastUpdated: new Date()
  });
  const [dailyStats, setDailyStats] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);
  const [animatedFanAccuracy, setAnimatedFanAccuracy] = useState(0);
  const [animatedAiAccuracy, setAnimatedAiAccuracy] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  
  const boxRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) {
        setSelectedBox(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [accuracyResponse, dailyResponse] = await Promise.all([
        api.fetchAccuracy(),
        api.fetchDailyAccuracy()
      ]);

      setAccuracyData(accuracyResponse.data);
      setDailyStats(dailyResponse.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching accuracy data:', error);
      setError('Failed to fetch accuracy data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const refreshInterval = setInterval(fetchData, 15 * 60 * 1000); // Refresh every 15 minutes
    return () => clearInterval(refreshInterval);
  }, [fetchData]);

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
          onClick={fetchData}
          className="mt-2 text-sm text-blue-500 hover:text-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  const isFanWinning = accuracyData.fanAccuracy > accuracyData.aiAccuracy;

  const handleBoxClick = (boxType) => {
    setSelectedBox(selectedBox === boxType ? null : boxType);
  };

  return (
    <div className="flex flex-col items-center relative" ref={boxRef}>
      <div className="flex justify-center items-center space-x-2 sm:space-x-4 my-4">
        <AccuracyBox 
          label="FANS" 
          animatedAccuracy={animatedFanAccuracy} 
          isWinning={isFanWinning} 
          dailyStats={selectedBox === 'fans' ? dailyStats?.fans : null}
          onClick={() => handleBoxClick('fans')}
        />
        <div className="text-lg sm:text-xl font-bold text-gray-700">VS</div>
        <AccuracyBox 
          label="AI" 
          animatedAccuracy={animatedAiAccuracy} 
          isWinning={!isFanWinning} 
          dailyStats={selectedBox === 'ai' ? dailyStats?.ai : null}
          onClick={() => handleBoxClick('ai')}
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