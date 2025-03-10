import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { Activity, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

// Lazy load components that don't need to be instantly visible
const NextMatchCountdown = lazy(() => import('./NextMatchCountdown'));

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
  const [shouldLoadSecondary, setShouldLoadSecondary] = useState(false);
  
  // Use refs to track last update times to prevent unnecessary reloads
  const lastDataUpdate = useRef({
    accuracy: 0,
    matches: 0
  });
  
  // Minimum time between updates (in ms)
  const MIN_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

  // Function to fetch pre-generated stats from static file
  const fetchPreGeneratedStats = async (forceUpdate = false) => {
    try {
      const now = Date.now();
      
      // Skip if we updated recently (unless forced)
      if (!forceUpdate && 
          now - lastDataUpdate.current.accuracy < MIN_UPDATE_INTERVAL) {
        console.log('Skipping accuracy update - too soon since last update');
        return accuracyData;
      }
      
      // Try to get cache buster from manifest
      let cacheBuster = '';
      try {
        const manifestResponse = await fetch('/stats/manifest.json');
        if (manifestResponse.ok) {
          const manifest = await manifestResponse.json();
          if (manifest && manifest.aiHistory && manifest.aiHistory.lastUpdated) {
            cacheBuster = `?t=${manifest.aiHistory.lastUpdated}`;
          }
        }
      } catch (err) {
        console.warn('Could not fetch manifest for cache busting', err);
        cacheBuster = `?t=${now}`;
      }
      
      const response = await fetch(`/stats/ai-history.json${cacheBuster}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stats file: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.overall) {
        // Update the last update timestamp
        lastDataUpdate.current.accuracy = now;
        
        return {
          aiAccuracy: data.overall.overallAccuracy || 0,
          lastUpdated: new Date(data.generatedAt) || new Date()
        };
      }
      
      throw new Error('Invalid stats data format');
    } catch (err) {
      console.error('Error loading pre-generated stats:', err);
      // Fallback to API if file loading fails
      return null;
    }
  };
  
  // Function to fetch scheduled matches (deferred)
  const fetchScheduledMatches = async (forceUpdate = false) => {
    try {
      const now = Date.now();
      
      // Skip if we updated recently (unless forced)
      if (!forceUpdate && 
          now - lastDataUpdate.current.matches < MIN_UPDATE_INTERVAL) {
        console.log('Skipping matches update - too soon since last update');
        return scheduledMatches;
      }
      
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
            // Update the last update timestamp
            lastDataUpdate.current.matches = now;
            
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
  const fetchData = async (forceUpdate = false) => {
    // If not forcing an update and component is already loaded, update in background
    if (!forceUpdate && !isLoading && isInitialized) {
      console.log('Component already loaded, updating in background');
      updateDataInBackground();
      return;
    }
    
    try {
      if (!isInitialized) {
        setIsLoading(true);
      }
      
      // Try to fetch pre-generated stats first (critical)
      const preGeneratedStats = await fetchPreGeneratedStats(forceUpdate);
      
      let newAccuracyData;
      
      if (preGeneratedStats) {
        // Use pre-generated stats if available
        console.log('Using pre-generated stats');
        newAccuracyData = preGeneratedStats;
      } else {
        // Fallback to API if pre-generated stats are unavailable
        console.log('Falling back to API for stats');
        const accuracyResponse = await api.fetchAccuracy();
        newAccuracyData = {
          aiAccuracy: accuracyResponse?.aiAccuracy || 0,
          lastUpdated: new Date()
        };
        
        // Update the last update timestamp
        lastDataUpdate.current.accuracy = Date.now();
      }
      
      setAccuracyData(newAccuracyData);
      setIsLoading(false);
      
      // After initial render, load remaining data
      if (!shouldLoadSecondary) {
        setTimeout(() => {
          setShouldLoadSecondary(true);
        }, 100);
      }
    } catch (error) {
      console.error('Error fetching accuracy data:', error);
      setAccuracyData({
        aiAccuracy: 0,
        lastUpdated: new Date()
      });
      setError('Failed to fetch accuracy data');
      setIsLoading(false);
    }
  };
  
  // Function to update data in background without triggering loading state
  const updateDataInBackground = async () => {
    try {
      // Get fresh accuracy data without showing loading indicator
      const preGeneratedStats = await fetchPreGeneratedStats(false);
      
      if (preGeneratedStats) {
        setAccuracyData(preGeneratedStats);
      }
      
      // Only load secondary data if it's already been loaded once
      if (shouldLoadSecondary) {
        loadSecondaryData(false);
      }
    } catch (error) {
      console.error('Error updating data in background:', error);
    }
  };

  // Function to load secondary data after initial render
  const loadSecondaryData = async (forceUpdate = false) => {
    try {
      // Fetch daily stats (smaller data)
      const dailyResponse = await api.fetchDailyAccuracy();
      setDailyStats({
        ai: {
          total: dailyResponse?.data?.ai?.total || 0,
          correct: dailyResponse?.data?.ai?.correct || 0
        }
      });
      
      // Fetch scheduled matches (can be larger)
      await fetchScheduledMatches(forceUpdate);
    } catch (error) {
      console.error('Error loading secondary data:', error);
    }
  };

  // Initialize the component
  useEffect(() => {
    const initialize = async () => {
      if (isInitialized) return;
      
      try {
        await fetchData(true); // Force update on initial load
        setIsInitialized(true);
      } catch (error) {
        console.error('Error during initialization:', error);
      }
    };

    initialize();
  }, []);

  // Load secondary data after initial render
  useEffect(() => {
    if (shouldLoadSecondary) {
      loadSecondaryData(true); // Force update on initial load of secondary data
    }
  }, [shouldLoadSecondary]);

  // Set up polling and visibility handlers
  useEffect(() => {
    if (!isInitialized) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Just check for updates in background when tab becomes visible again
        updateDataInBackground();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateDataInBackground();
      }
    }, 15 * 60 * 1000); // 15 minutes

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollInterval);
    };
  }, [isInitialized, shouldLoadSecondary]);

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
          onClick={() => fetchData(true)}
          className="mt-2 text-sm text-blue-500 hover:text-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="w-full">
        <div className="mb-3">
          <RacingBarDisplay 
            score={animatedAiAccuracy || 0}
          />
        </div>
  
        {shouldLoadSecondary && (
          <>              
            <div className="mb-6">
              <Suspense fallback={<div className="h-10 bg-gray-800 animate-pulse rounded"></div>}>
                <NextMatchCountdown scheduledMatches={scheduledMatches} />
              </Suspense>
            </div>
          </>
        )}
      </div>
    </div>
  );
}