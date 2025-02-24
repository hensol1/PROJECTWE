import { useState, useCallback, useEffect } from 'react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import api from '../api';  // adjust the path based on your file structure

export const useMatchData = (userTimeZone) => {
  const [matches, setMatches] = useState({});
  const [allLiveMatches, setAllLiveMatches] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);

  const processMatchesResponse = useCallback((matchesData) => {
    if (!matchesData || !Array.isArray(matchesData)) {
      console.warn('Invalid matchesData received:', matchesData);
      return { liveMatches: {}, regularMatches: {} };
    }

    const liveMatches = {};
    const regularMatches = {};

    matchesData.forEach(match => {
      if (!match?.competition?.name || !match?.competition?.id) return;

      try {
        const matchLocalDate = utcToZonedTime(parseISO(match.utcDate), userTimeZone);
        const dateKey = format(matchLocalDate, 'yyyy-MM-dd');
        const leagueKey = `${match.competition.name}_${match.competition.id}`;
        
        const updatedMatch = {
          ...match,
          localDate: matchLocalDate,
          userVote: match.userVote,
          voteCounts: match.voteCounts || { home: 0, away: 0, draw: 0 },
          score: match.score || { 
            fullTime: { home: 0, away: 0 },
            halfTime: { home: 0, away: 0 }
          }
        };

        if (['IN_PLAY', 'HALFTIME', 'PAUSED', 'LIVE'].includes(match.status)) {
          if (!liveMatches[leagueKey]) liveMatches[leagueKey] = [];
          liveMatches[leagueKey].push(updatedMatch);
        } else {
          if (!regularMatches[dateKey]) regularMatches[dateKey] = {};
          if (!regularMatches[dateKey][leagueKey]) regularMatches[dateKey][leagueKey] = [];
          regularMatches[dateKey][leagueKey].push(updatedMatch);
        }
      } catch (error) {
        console.error('Error processing match:', error);
      }
    });

    return { liveMatches, regularMatches };
  }, [userTimeZone]);

  const fetchMatches = useCallback(async (date) => {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const response = await api.fetchMatches(formattedDate);
      
      if (!response?.data?.matches) return {};
      
      const { regularMatches } = processMatchesResponse(response.data.matches);
      return regularMatches[formattedDate] || {};
    } catch (error) {
      console.error('Error fetching matches:', error);
      return {};
    }
  }, [processMatchesResponse]);

  // Add soft fetch function for matches
  const fetchMatchesSoft = useCallback(async (date) => {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const response = await api.fetchMatches(formattedDate);
      
      if (!response?.data?.matches) return null;
      
      const { regularMatches } = processMatchesResponse(response.data.matches);
      return regularMatches[formattedDate] || {};
    } catch (error) {
      console.error('Error in soft fetch matches:', error);
      return null;
    }
  }, [processMatchesResponse]);

  const fetchLiveMatches = useCallback(async () => {
    try {
      const response = await api.fetchLiveMatches();
      if (!response?.data?.matches) return {};
      
      const { liveMatches } = processMatchesResponse(response.data.matches);
      return liveMatches;
    } catch (error) {
      console.error('Error fetching live matches:', error);
      return {};
    }
  }, [processMatchesResponse]);

  // Add soft fetch function for live matches
  const fetchLiveMatchesSoft = useCallback(async () => {
    try {
      const response = await api.fetchLiveMatches();
      if (!response?.data?.matches) return null;
      
      const { liveMatches } = processMatchesResponse(response.data.matches);
      return liveMatches;
    } catch (error) {
      console.error('Error in soft fetch live matches:', error);
      return null;
    }
  }, [processMatchesResponse]);

  const initializeData = useCallback(async () => {
    // Only set loading state if initial data hasn't been loaded yet
    if (!isInitialDataLoaded) {
      setIsLoading(true);
    }
    
    try {
      const today = new Date();
      const yesterday = subDays(today, 1);
      const tomorrow = addDays(today, 1);

      const [liveMatchesData, todayMatches, yesterdayMatches, tomorrowMatches] = await Promise.all([
        fetchLiveMatches(),
        fetchMatches(today),
        fetchMatches(yesterday),
        fetchMatches(tomorrow)
      ]);

      setAllLiveMatches(liveMatchesData);
      setMatches({
        [format(today, 'yyyy-MM-dd')]: todayMatches,
        [format(yesterday, 'yyyy-MM-dd')]: yesterdayMatches,
        [format(tomorrow, 'yyyy-MM-dd')]: tomorrowMatches
      });
      
      // Mark initial data as loaded
      setIsInitialDataLoaded(true);
      return {
        liveMatches: liveMatchesData,
        todayMatches,
        yesterdayMatches,
        tomorrowMatches
      };
    } catch (error) {
      console.error('Error initializing data:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchLiveMatches, fetchMatches]);

  // Remove the auto-initialization in useEffect to give control to the parent component
  // Parent component should call initializeData when it's ready

  return {
    matches,
    allLiveMatches,
    isLoading,
    isInitialDataLoaded,
    fetchMatches,
    fetchLiveMatches,
    fetchMatchesSoft,
    fetchLiveMatchesSoft,
    setMatches,
    setAllLiveMatches,
    initializeData
  };
};