// hooks/useMatchData.js
import { useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import api from '../api';

export const useMatchData = (userTimeZone) => {
  const [matches, setMatches] = useState({});
  const [allLiveMatches, setAllLiveMatches] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const processMatchesResponse = useCallback((matchesData) => {
    const liveMatches = {};
    const regularMatches = {};

    matchesData.forEach(match => {
      if (!match?.competition?.name || !match?.competition?.id) return;

      try {
        const matchLocalDate = utcToZonedTime(parseISO(match.utcDate), userTimeZone);
        const dateKey = format(matchLocalDate, 'yyyy-MM-dd');
        const leagueKey = `${match.competition.name}_${match.competition.id}`;
        
        const voteCounts = match.voteCounts || match.votes || { home: 0, away: 0, draw: 0 };
        const transformedVoteCounts = {
          home: voteCounts.home || voteCounts.HOME_TEAM || 0,
          away: voteCounts.away || voteCounts.AWAY_TEAM || 0,
          draw: voteCounts.draw || voteCounts.DRAW || 0
        };
        
        const totalVotes = transformedVoteCounts.home + transformedVoteCounts.draw + transformedVoteCounts.away;
        let fanPrediction = null;
        
        if (totalVotes > 0) {
          const maxVotes = Math.max(
            transformedVoteCounts.home, 
            transformedVoteCounts.draw, 
            transformedVoteCounts.away
          );
          if (transformedVoteCounts.home === maxVotes) {
            fanPrediction = 'HOME_TEAM';
          } else if (transformedVoteCounts.away === maxVotes) {
            fanPrediction = 'AWAY_TEAM';
          } else {
            fanPrediction = 'DRAW';
          }
        }

        const updatedMatch = {
          ...match,
          localDate: matchLocalDate,
          userVote: match.userVote,
          voteCounts: transformedVoteCounts,
          fanPrediction,
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
    setIsLoading(true);
    setImagesLoaded(false);
    
    try {
      const formattedDate = format(zonedTimeToUtc(date, userTimeZone), 'yyyy-MM-dd');
      const response = await api.fetchMatches(formattedDate);
      
      const { regularMatches } = processMatchesResponse(response.data.matches);
      
      setMatches(prev => ({
        ...prev,
        [formattedDate]: regularMatches[formattedDate] || {}
      }));

    } catch (error) {
      console.error('Error fetching matches:', error);
      setMatches(prev => ({
        ...prev,
        [format(date, 'yyyy-MM-dd')]: {}
      }));
    } finally {
      setIsLoading(false);
      setImagesLoaded(true);
    }
  }, [userTimeZone, processMatchesResponse]);

  const fetchMatchesSoft = useCallback(async (date) => {
    try {
      const formattedDate = format(zonedTimeToUtc(date, userTimeZone), 'yyyy-MM-dd');
      const response = await api.fetchMatches(formattedDate);
      
      if (response?.data?.matches) {
        const { regularMatches } = processMatchesResponse(response.data.matches);
        return regularMatches[formattedDate];
      }
      return null;
    } catch (error) {
      console.error('Error in soft fetch matches:', error);
      return null;
    }
  }, [userTimeZone, processMatchesResponse]);

  const fetchLiveMatches = useCallback(async () => {
    try {
      const response = await api.fetchLiveMatches();
      if (!response?.data?.matches) {
        setAllLiveMatches({});
        return;
      }
      
      const { liveMatches } = processMatchesResponse(response.data.matches);
      setAllLiveMatches(liveMatches);
    } catch (error) {
      console.error('Error fetching live matches:', error);
      setAllLiveMatches({});
    }
  }, [processMatchesResponse]);

  const fetchLiveMatchesSoft = useCallback(async () => {
    try {
      const response = await api.fetchLiveMatches();
      if (response?.data?.matches) {
        const { liveMatches } = processMatchesResponse(response.data.matches);
        return liveMatches;
      }
      return null;
    } catch (error) {
      console.error('Error in soft fetch live matches:', error);
      return null;
    }
  }, [processMatchesResponse]);

  return {
    matches,
    allLiveMatches,
    isLoading,
    isRefreshing,
    imagesLoaded,
    fetchMatches,
    fetchMatchesSoft,
    fetchLiveMatches,
    fetchLiveMatchesSoft,
    setMatches,
    setAllLiveMatches,
    setIsRefreshing
  };
};