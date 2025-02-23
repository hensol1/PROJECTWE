import { useState, useCallback, useEffect } from 'react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import api from '../api';  // adjust the path based on your file structure

export const useMatchData = (userTimeZone) => {
  const [matches, setMatches] = useState({});
  const [allLiveMatches, setAllLiveMatches] = useState({});
  const [isLoading, setIsLoading] = useState(true);

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

  const initializeData = useCallback(async () => {
    setIsLoading(true);
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
    } catch (error) {
      console.error('Error initializing data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchLiveMatches, fetchMatches]);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  return {
    matches,
    allLiveMatches,
    isLoading,
    fetchMatches,
    fetchLiveMatches,
    setMatches,
    setAllLiveMatches,
    initializeData
  };
};