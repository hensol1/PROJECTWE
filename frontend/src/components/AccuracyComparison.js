import React, { useState, useEffect } from 'react';
import { Activity, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import PredictionTicker from './PredictionTicker';
import NextMatchCountdown from './NextMatchCountdown';
import TopLeaguesPerformance from './TopLeaguesPerformance';

const RacingBarDisplay = ({ score }) => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  
  const isFullScore = score >= 100;
  
  return (
    <div 
      className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg cursor-pointer overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
      onClick={() => navigate('/stats')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute top-0 left-0 w-full px-3 py-1.5 flex items-center text-xs text-emerald-200 bg-emerald-900/20">
        <Activity size={12} className="mr-1" />
        Our chance to predict correctly is:
      </div>

      <div className="mt-7 flex items-center h-12">
        <div 
          className={`h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300 transition-all duration-700 flex items-center ${isFullScore ? 'justify-center' : 'justify-end pr-3'} relative group-hover:brightness-110`}
          style={{ 
            width: isFullScore ? '100%' : `${score}%`,
            borderTopRightRadius: isFullScore ? '0' : '0.5rem',
            borderBottomRightRadius: isFullScore ? '0' : '0.5rem'
          }}
        >
          <div className="absolute inset-0 overflow-hidden">
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 -skew-x-45 animate-shine"
              style={{
                animationDuration: '2s',
                animationIterationCount: 'infinite',
              }}
            />
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-1/2 transform -translate-y-1/2 w-8 h-8 opacity-20 bg-white rounded-full animate-pulse"
                style={{
                  left: `${i * 25}%`,
                  animationDelay: `${i * 0.2}s`
                }}
              />
            ))}
          </div>

          <div className="relative z-10 flex items-center">
            <span className="text-gray-900 font-bold text-2xl tracking-tight" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
              {score.toFixed(1)}%
            </span>
          </div>
        </div>
        
        {!isFullScore && (
          <div className={`flex items-center ml-3 transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
            <span className="text-emerald-400 text-sm mr-1">View Stats</span>
            <ChevronRight size={16} className="text-emerald-400" />
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-800">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 h-full bg-emerald-400 transition-all duration-500"
            style={{
              left: `${i * 10}%`,
              width: '2px',
              opacity: score >= (i + 1) * 10 ? '1' : '0.1',
              transform: score >= (i + 1) * 10 ? 'scaleY(1.5)' : 'scaleY(1)'
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default function AccuracyComparison({ allLiveMatches, scheduledMatches }) {
  const [isInitialized, setIsInitialized] = useState(false);
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
    const initialize = async () => {
      if (isInitialized) return;
      
      try {
        setIsLoading(true);
        await fetchData();
        setIsInitialized(true);
      } catch (error) {
        console.error('Error during initialization:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isInitialized) {
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    }, 15 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollInterval);
    };
  }, [isInitialized]);

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-24 mt-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4 mt-4">
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
    <div className="max-w-6xl mx-auto mt-4">
      <div className="flex justify-center relative">
        <div className="hidden md:block absolute -left-20 top-0 w-[280px]">
          <TopLeaguesPerformance displayMode="desktop" />
        </div>

        <div className="w-full max-w-xl">
          <div className="mb-3">
            <RacingBarDisplay 
              score={animatedAiAccuracy || 0}
            />
          </div>

          <div className="md:hidden mb-3">
            <TopLeaguesPerformance displayMode="mobile" />
          </div>

          <div className="mb-2">
            <PredictionTicker />
          </div>
          
          <div className="mb-6">
            <NextMatchCountdown scheduledMatches={scheduledMatches} />
          </div>
        </div>
      </div>
    </div>
  );
}