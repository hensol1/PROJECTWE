import React, { useState, useEffect, useRef } from 'react';
import { Sparkle } from 'lucide-react';
import { IoPersonOutline } from "react-icons/io5";
import { FaPeopleGroup } from "react-icons/fa6";
import { FaBrain } from "react-icons/fa";
import api from '../api';
import { Country } from 'country-state-city';
import { createPortal } from 'react-dom';
import PredictionTicker from './PredictionTicker';
import DailyStats from './DailyStats';
import NextMatchCountdown from './NextMatchCountdown';

const formatCountryCode = (countryName) => {
  if (!countryName) return '';
  
  if (countryName.length === 2) {
    return countryName.toLowerCase();
  }

  const country = Country.getAllCountries().find(
    country => country.name.toLowerCase() === countryName.toLowerCase()
  );

  return country ? country.isoCode.toLowerCase() : countryName.toLowerCase();
};

const formatStats = (stats) => {
  if (!stats) return { total: 0, correct: 0 };
  return {
    total: stats.total || stats.finishedVotes || 0,
    correct: stats.correct || stats.correctVotes || 0
  };
};

const StatsPopover = ({ stats, color, anchorRect }) => {
  console.log('Stats received in popover:', stats); // Debug log
  
  const formattedStats = formatStats(stats);
  const successRate = formattedStats.total === 0 ? 0 : 
    (formattedStats.correct / formattedStats.total) * 100;

  // Add debug logs
  console.log('Formatted stats:', formattedStats);
  console.log('Calculated success rate:', successRate);

  if (!anchorRect) return null;

  // Calculate viewport width
  const viewportWidth = window.innerWidth;
  
  // Calculate tooltip position
  const tooltipWidth = 192; // w-48 = 12rem = 192px
  let leftPosition = anchorRect.left + (anchorRect.width / 2);
  let transformX = -50; // default -50%

  // Adjust position if too close to right edge
  if (leftPosition + (tooltipWidth / 2) > viewportWidth) {
    leftPosition = viewportWidth - 20; // 20px from right edge
    transformX = -100; // transform from right edge
  }
  
  // Adjust position if too close to left edge
  if (leftPosition - (tooltipWidth / 2) < 0) {
    leftPosition = 20; // 20px from left edge
    transformX = 0; // no transform needed
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

const ScoreDisplay = ({ 
  icon: Icon, 
  score, 
  title, 
  position = 'middle', 
  color = 'bg-blue-500', 
  isUser = false, 
  userCountry = null, 
  username = null, 
  onIconClick,
  statsType,
  onSignInClick, // Add this prop
  children 
}) => {
  const iconRef = useRef(null);

  const handleClick = () => {
    if (!isUser) {
      // If it's not the user score, handle stats click
      if (iconRef.current) {
        const rect = iconRef.current.getBoundingClientRect();
        onIconClick(rect);
      }
    } else if (!username) {
      // If it's the user score but no user is logged in, trigger sign in
      onSignInClick?.();
    } else {
      // If user is logged in, show stats
      if (iconRef.current) {
        const rect = iconRef.current.getBoundingClientRect();
        onIconClick(rect);
      }
    }
  };

  return (
    <div className={`flex flex-col items-center ${position === 'winner' ? 'order-2' : position === 'left' ? 'order-1' : 'order-3'} relative`}>
      <div 
        ref={iconRef}
        onClick={handleClick}
        className={`
          relative cursor-pointer
          ${position === 'winner' ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-12 h-12 sm:w-16 sm:h-16'} 
          ${position === 'winner' ? 'mb-3' : 'mb-2'}
        `}
      >
        {isUser && userCountry ? (
          <div className={`w-full h-full rounded-full ${color} p-[2px] flex items-center justify-center overflow-hidden`}>
            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-white">
              <img 
                src={`https://flagcdn.com/w160/${formatCountryCode(userCountry)}.png`}
                alt={userCountry}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.log(`Failed to load flag for country: ${userCountry}`);
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>
        ) : (
          <div className={`${color} rounded-full p-3 w-full h-full flex items-center justify-center`}>
            <Icon className="w-full h-full text-white" />
          </div>
        )}
      </div>
      <span className={`
        font-bold text-gray-800
        ${position === 'winner' ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'}
      `}>
        {score.toFixed(1)}%
      </span>
      <span className="text-xs sm:text-sm text-gray-500 mt-0.5">
        {isUser ? (username || 'Sign In') : title}
      </span>
      {children}
    </div>
  );
};

export default function ModernAccuracyComparison({ 
  user, 
  onSignInClick,
  allLiveMatches,  // Add this prop
  scheduledMatches // Add this prop
}) {
  const [selectedStats, setSelectedStats] = useState(null);
  const [tooltipAnchor, setTooltipAnchor] = useState(null);
  const [accuracyData, setAccuracyData] = useState({
    fanAccuracy: 0,
    aiAccuracy: 0,
    lastUpdated: new Date()
  });
  const [dailyStats, setDailyStats] = useState(null);
  const [animatedFanAccuracy, setAnimatedFanAccuracy] = useState(0);
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
  
      console.log('Raw daily response:', dailyResponse);
  
      const dailyStats = {
        ai: {
          total: dailyResponse.data?.ai?.total || 0,
          correct: dailyResponse.data?.ai?.correct || 0
        },
        fans: {
          total: dailyResponse.data?.fans?.total || 0,
          correct: dailyResponse.data?.fans?.correct || 0
        },
        user: {
          total: dailyResponse.data?.user?.total || 0,
          correct: dailyResponse.data?.user?.correct || 0
        }
      };
  
      // Remove the sanity check as it's causing valid stats to be reset
      console.log('Processed daily stats:', dailyStats);
  
      setAccuracyData(accuracyResponse.data);
      setDailyStats(dailyStats);
      setError(null);
    } catch (error) {
      console.error('Error fetching accuracy data:', error);
      setError('Failed to fetch accuracy data');
    } finally {
      setIsLoading(false);
    }
  };
        
useEffect(() => {
  fetchData();
  // Only set up interval if component is mounted
  const refreshInterval = setInterval(fetchData, 15 * 60 * 1000);
  
  return () => {
    clearInterval(refreshInterval);
  };
}, []);

  useEffect(() => {
    const targetFan = accuracyData.fanAccuracy;
    const targetAi = accuracyData.aiAccuracy;
    const duration = 1500;
    const steps = 60;
    
    const interval = setInterval(() => {
      setAnimatedFanAccuracy(prev => {
        const next = prev + (targetFan / steps);
        return next >= targetFan ? targetFan : next;
      });
      
      setAnimatedAiAccuracy(prev => {
        const next = prev + (targetAi / steps);
        return next >= targetAi ? targetAi : next;
      });
    }, duration / steps);

    return () => clearInterval(interval);
  }, [accuracyData]);

  // Click handler for tooltips
  const handleIconClick = (statsType, rect) => {
    if (selectedStats === statsType) {
      setSelectedStats(null);
      setTooltipAnchor(null);
    } else {
      setSelectedStats(statsType);
      setTooltipAnchor(rect);
    }
  };

  const calculateUserAccuracy = () => {
    if (!user || !user.stats) return 0;
    const { finishedVotes, correctVotes } = user.stats;
    if (!finishedVotes || finishedVotes === 0) return 0;
    return (correctVotes / finishedVotes) * 100;
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

  const userScore = calculateUserAccuracy();
  
  // Create all possible scores first
  let allScores = [
    { 
      score: animatedAiAccuracy, 
      title: 'Our Experts', 
      icon: FaBrain, 
      color: 'bg-green-500',
      statsType: 'ai'
    },
    { 
      score: animatedFanAccuracy, 
      title: 'Fans', 
      icon: FaPeopleGroup, 
      color: 'bg-blue-500',
      statsType: 'fans'
    },
    { 
      score: userScore, 
      title: 'Your Score',
      isUser: true,
      userCountry: user?.country,
      username: user?.username,
      icon: IoPersonOutline,
      color: 'bg-yellow-500',
      statsType: user ? 'user' : null
    }
  ];

  // Sort scores in descending order
  allScores.sort((a, b) => b.score - a.score);

  // Rearrange for podium display (2nd, 1st, 3rd)
  const scores = [
    allScores[1], // Second place (left)
    allScores[0], // First place (middle)
    allScores[2]  // Third place (right)
  ];

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm py-3 px-4 mb-4">
        {/* Score displays remain the same */}
        <div className="flex justify-between items-end gap-4 sm:gap-6">
          {scores.map((score, index) => {
            const position = index === 1 ? 'winner' : index === 0 ? 'left' : 'right';
            return (
              <ScoreDisplay
                key={score.statsType}
                {...score}
                position={position}
                onIconClick={(rect) => handleIconClick(score.statsType, rect)}
                onSignInClick={onSignInClick}
                statsType={score.statsType}
              >
                {selectedStats === score.statsType && (
                  <StatsPopover 
                    stats={
                      score.statsType === 'user' 
                        ? dailyStats?.user 
                        : dailyStats?.[score.statsType]
                    }
                    color={score.color}
                    anchorRect={tooltipAnchor}
                  />
                )}
              </ScoreDisplay>
            );
          })}
        </div>
      </div>



      <PredictionTicker />
      <div className="mb-6">
        <DailyStats />
              {/* Only show NextMatchCountdown if there are no live matches */}
      {(!allLiveMatches || Object.keys(allLiveMatches).length === 0) && (
        <NextMatchCountdown scheduledMatches={scheduledMatches} />
      )}
      </div>
    </div>
  );
}
