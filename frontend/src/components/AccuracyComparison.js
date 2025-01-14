import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sparkle } from 'lucide-react';
import { FaBrain } from "react-icons/fa";
import api from '../api';
import PredictionTicker from './PredictionTicker';
import NextMatchCountdown from './NextMatchCountdown';

const StatsPopover = ({ stats, color, anchorRect }) => {
  if (!anchorRect || !stats) return null;

  const formattedStats = {
    total: stats.total || 0,
    correct: stats.correct || 0
  };

  const successRate = formattedStats.total === 0 ? 0 : 
    (formattedStats.correct / formattedStats.total) * 100;

  // Calculate tooltip position
  const viewportWidth = window.innerWidth;
  const tooltipWidth = 192;
  let leftPosition = anchorRect.left + (anchorRect.width / 2);
  let transformX = -50;

  if (leftPosition + (tooltipWidth / 2) > viewportWidth) {
    leftPosition = viewportWidth - 20;
    transformX = -100;
  }
  
  if (leftPosition - (tooltipWidth / 2) < 0) {
    leftPosition = 20;
    transformX = 0;
  }

  return createPortal(
    <div 
      className="bg-white rounded-xl shadow-lg p-4 w-48 absolute"
      style={{
        position: 'absolute',
        left: `${leftPosition}px`,
        top: `${anchorRect.bottom + 8}px`,
        transform: `translateX(${transformX}%)`,
        zIndex: 999999,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Today's Predictions</h3>
        <Sparkle size={16} className="text-yellow-400" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Correct</span>
          <span className="text-sm font-medium text-gray-800">
            {formattedStats.correct}/{formattedStats.total}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Success Rate</span>
          <span className="text-sm font-medium text-green-500">
            {successRate.toFixed(1)}%
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
          <div 
            className={`h-full ${color} transition-all duration-500`}
            style={{ width: `${successRate}%` }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

const ExpertScoreDisplay = ({ 
  score,
  color = 'bg-green-500',
  onIconClick
}) => {
  const iconRef = useRef(null);

  const handleClick = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      onIconClick(rect);
    }
  };

  return (
    <div className="flex flex-col items-center relative">
      <div 
        ref={iconRef}
        onClick={handleClick}
        className="w-16 h-16 sm:w-20 sm:h-20 mb-3 cursor-pointer"
      >
        <div className={`${color} rounded-full p-3 w-full h-full flex items-center justify-center`}>
          <FaBrain className="w-full h-full text-white" />
        </div>
      </div>
      <span className="font-bold text-2xl sm:text-3xl text-gray-800">
        {score.toFixed(1)}%
      </span>
      <span className="text-sm text-gray-500 mt-0.5">
        Our Experts
      </span>
    </div>
  );
};

export default function AccuracyComparison({ 
  allLiveMatches,
  scheduledMatches,
}) {
  const [tooltipAnchor, setTooltipAnchor] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [accuracyData, setAccuracyData] = useState({
    aiAccuracy: 0,
    lastUpdated: new Date()
  });
  const [dailyStats, setDailyStats] = useState(null);
  const [animatedAiAccuracy, setAnimatedAiAccuracy] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [accuracyResponse, dailyResponse] = await Promise.all([
        api.fetchAccuracy(),
        api.fetchDailyAccuracy()
      ]);
  
      // Add console.log to debug the response
      console.log('Accuracy Response:', accuracyResponse);
      
      // Ensure we have a default value if the response is empty
      const aiAccuracy = accuracyResponse?.aiAccuracy || 0;
      
      const aiStats = {
        ai: {
          total: dailyResponse?.data?.ai?.total || 0,
          correct: dailyResponse?.data?.ai?.correct || 0
        }
      };
  
      setAccuracyData({
        aiAccuracy,
        lastUpdated: new Date()
      });
      setDailyStats(aiStats);
      setError(null);
    } catch (error) {
      console.error('Error fetching accuracy data:', error);
      // Set default values on error
      setAccuracyData({
        aiAccuracy: 0,
        lastUpdated: new Date()
      });
      setDailyStats({
        ai: {
          total: 0,
          correct: 0
        }
      });
      setError('Failed to fetch accuracy data');
    } finally {
      setIsLoading(false);
    }
  };
            
  useEffect(() => {
    fetchData();
    const refreshInterval = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    const targetAi = accuracyData?.aiAccuracy || 0;
    const duration = 1500;
    const steps = 60;
    
    const interval = setInterval(() => {
      setAnimatedAiAccuracy(prev => {
        const next = prev + (targetAi / steps);
        return next >= targetAi ? targetAi : next;
      });
    }, duration / steps);
  
    return () => clearInterval(interval);
  }, [accuracyData?.aiAccuracy]);
    
  const handleIconClick = (rect) => {
    setShowStats(!showStats);
    setTooltipAnchor(rect);
  };

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

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm py-3 px-4 mb-4">
        <div className="flex justify-center">
        <ExpertScoreDisplay
  score={animatedAiAccuracy || 0}  // Add default value
  color="bg-green-500"
  onIconClick={handleIconClick}
/>

          {showStats && (
            <StatsPopover 
              stats={dailyStats?.ai}
              color="bg-green-500"
              anchorRect={tooltipAnchor}
            />
          )}
        </div>
      </div>

      <PredictionTicker />
      <div className="mb-6">
        {(!allLiveMatches || Object.keys(allLiveMatches).length === 0) && (
          <NextMatchCountdown scheduledMatches={scheduledMatches} />
        )}
      </div>
    </div>
  );
}