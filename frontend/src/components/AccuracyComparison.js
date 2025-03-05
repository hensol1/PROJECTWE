import React, { useState, useEffect } from 'react';
import { Activity, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import PredictionTicker from './PredictionTicker';
import NextMatchCountdown from './NextMatchCountdown';


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

export default function AccuracyComparison({ user, onSignInClick }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [accuracyData, setAccuracyData] = useState({
    aiAccuracy: 0,
    lastUpdated: new Date()
  });
  const [dailyStats, setDailyStats] = useState(null);
  const [animatedAiAccuracy, setAnimatedAiAccuracy] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scheduledMatches, setScheduledMatches] = useState({});

  // Debugging function to log details about scheduledMatches
  const logScheduledMatches = (matches) => {
    console.log('scheduledMatches structure:', matches);
    console.log('Number of leagues:', Object.keys(matches).length);
    
    if (Object.keys(matches).length > 0) {
      const firstLeagueKey = Object.keys(matches)[0];
      console.log('First league key:', firstLeagueKey);
      console.log('First league matches:', matches[firstLeagueKey]);
      if (matches[firstLeagueKey].length > 0) {
        console.log('Sample match structure:', matches[firstLeagueKey][0]);
      }
    }
  };

  // Function to fetch scheduled matches
  const fetchScheduledMatches = async () => {
    try {
      console.log('Fetching scheduled matches...');
      // Get today's date in YYYY-MM-DD format for the API
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      
      console.log('Fetching matches for date:', formattedDate);
      const response = await api.fetchMatches(formattedDate);
      
      if (response && response.data) {
        console.log('Response data received:', response.data);
        
        // The data seems to be structured as {matches: Array(41)}
        const matchesArray = response.data.matches;
        
        if (Array.isArray(matchesArray) && matchesArray.length > 0) {
          console.log(`Found ${matchesArray.length} matches in response`);
          
          // Filter for scheduled matches and organize by league
          const scheduledByLeague = {};
          
          matchesArray.forEach(match => {
            if (!match || !match.status) {
              console.log('Invalid match object:', match);
              return;
            }
            
            // Check if this is a scheduled match
            const isScheduled = match.status === 'TIMED' || match.status === 'SCHEDULED';
            
            if (isScheduled) {
              // Get the league ID
              const leagueId = match.competition?.id || 'unknown';
              
              // Initialize league array if needed
              if (!scheduledByLeague[leagueId]) {
                scheduledByLeague[leagueId] = [];
              }
              
              // Add match to league
              scheduledByLeague[leagueId].push(match);
            }
          });
          
          const leagueCount = Object.keys(scheduledByLeague).length;
          console.log(`Organized ${leagueCount} leagues with scheduled matches:`, scheduledByLeague);
          
          if (leagueCount > 0) {
            setScheduledMatches(scheduledByLeague);
            return scheduledByLeague;
          }
        }
      }
      
      // Return empty object if no matches found
      console.log('No scheduled matches found, setting empty object');
      setScheduledMatches({});
      return {};
    } catch (error) {
      console.error('Error fetching scheduled matches:', error);
      setScheduledMatches({});
      return {};
    }
  };
  
  // Main data fetching function
  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Execute all API calls in parallel for better performance
      const [accuracyResponse, dailyResponse] = await Promise.all([
        api.fetchAccuracy(),
        api.fetchDailyAccuracy()
      ]);
      
      // Fetch scheduled matches separately to debug if needed
      await fetchScheduledMatches();
      
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

  // Initialize the component
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
    }, 15 * 60 * 1000); // 15 minutes

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollInterval);
    };
  }, [isInitialized]);

  // Animation effect for the accuracy score
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

  // Debug the scheduledMatches whenever it changes
  useEffect(() => {
    console.log('--- scheduledMatches updated:', scheduledMatches);
    logScheduledMatches(scheduledMatches);
  }, [scheduledMatches]);

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

  // Log scheduled matches for debugging
  logScheduledMatches(scheduledMatches);

  return (
    <div className="mt-4">
      <div className="w-full">
        <div className="mb-3">
          <RacingBarDisplay 
            score={animatedAiAccuracy || 0}
          />
        </div>
  
        <div className="mb-2">
          <PredictionTicker />
        </div>
          
        <div className="mb-6">
          <NextMatchCountdown scheduledMatches={scheduledMatches} />
        </div>
      </div>
    </div>
  );
  }