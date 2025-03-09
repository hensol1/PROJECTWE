// src/hooks/useMatchesData.js
import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { filterMatchesByStatus } from '../utils/matchUtils';
import useMatchData from './useMatchData'; // Import as default

// Export both as default and named export for compatibility
export function useMatchesData() {
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Reuse existing useMatchData hook (now imported as default)
  const {
    matches,
    allLiveMatches,
    isLoading,
    initializeData
  } = useMatchData(userTimeZone);

  // State for tracking whether data has been initialized
  const [isInit, setIsInit] = useState(false);
  const [activeTab, setActiveTab] = useState('scheduled');
  
  // Initialize data if needed
  useEffect(() => {
    if (!isInit) {
      initializeData().then(() => setIsInit(true));
    }
  }, [isInit, initializeData]);
  
  // Get today's date for filtering
  const today = new Date();
  const currentDateKey = format(today, 'yyyy-MM-dd');
  const matchesForCurrentDate = (matches && matches[currentDateKey]) || {};
  
  // Filter matches by status
  const liveMatches = useMemo(() => 
    allLiveMatches || {}, 
    [allLiveMatches]
  );
  
  const finishedMatches = useMemo(() => 
    filterMatchesByStatus(matchesForCurrentDate, ['FINISHED'], userTimeZone, today),
    [matchesForCurrentDate, userTimeZone, today]
  );
  
  const scheduledMatches = useMemo(() => 
    filterMatchesByStatus(matchesForCurrentDate, ['TIMED', 'SCHEDULED'], userTimeZone, today),
    [matchesForCurrentDate, userTimeZone, today]
  );
  
  // Combined matches for the league filter
  const allMatches = useMemo(() => {
    const combined = { ...liveMatches };
    
    // Add finished and scheduled matches
    Object.entries(finishedMatches).forEach(([leagueKey, matches]) => {
      if (!combined[leagueKey]) combined[leagueKey] = [];
      combined[leagueKey] = [...combined[leagueKey], ...matches];
    });
    
    Object.entries(scheduledMatches).forEach(([leagueKey, matches]) => {
      if (!combined[leagueKey]) combined[leagueKey] = [];
      combined[leagueKey] = [...combined[leagueKey], ...matches];
    });
    
    return combined;
  }, [liveMatches, finishedMatches, scheduledMatches]);
  
  return {
    getCurrentMatches: (tab = activeTab) => {
      switch (tab) {
        case 'live':
          return liveMatches;
        case 'finished':
          return finishedMatches;
        case 'scheduled':
          return scheduledMatches;
        default:
          return allMatches; // Return all matches combined
      }
    },
    isLoading,
    activeTab,
    setActiveTab
  };
}

// Export as default too for import flexibility
export default useMatchesData;