// Part 1: Imports and Initial Setup
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { debounce } from 'lodash';
import TabsSection from './TabsSection';
import ModernAccuracyComparison from './AccuracyComparison';
import api from '../api';
import { format, addDays, subDays, parseISO, startOfDay, endOfDay, isToday } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { BiAlarm, BiAlarmOff } from "react-icons/bi";
import CustomButton from './CustomButton';
import LoadingLogo from './LoadingLogo';
import NotificationQueue from './NotificationQueue';
import LeagueHeader from './LeagueHeader';
import MatchBox from './MatchBox';
import AnimatedList from './AnimatedList';
import LeagueFilter from './LeagueFilter';
import LeagueFilterButton from './LeagueFilterButton';
import TopLeaguesPerformance from './TopLeaguesPerformance';
import OptimizedImage from './OptimizedImage';
import imageLoader from '../lib/imageLoader';


// Constants
const priorityLeagues = [2, 3, 39, 140, 78, 135, 61];

// Component Definition
const Matches = ({ user, onOpenAuthModal }) => {
  // State declarations
  const [isInitialized, setIsInitialized] = useState(false);
  const [matches, setMatches] = useState({});
  const [allLiveMatches, setAllLiveMatches] = useState({});
  const [selectedDay, setSelectedDay] = useState('today');
  const [collapsedLeagues, setCollapsedLeagues] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [userTimeZone, setUserTimeZone] = useState('');
  const [activeTab, setActiveTab] = useState("live");
  const [accuracyData, setAccuracyData] = useState({ fanAccuracy: 0, aiAccuracy: 0 });
  const [isManualTabSelect, setIsManualTabSelect] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [goalNotifications, setGoalNotifications] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processedScoreUpdates] = useState(new Set());
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isUpdateInProgress, setIsUpdateInProgress] = useState(false);


  // Part 2: Callback Functions and Handlers

const handleSetSelectedDay = useCallback((day) => {
  setSelectedDay(day);
}, []);

const handleTabChange = useCallback((newTab) => {
  setIsManualTabSelect(true);
  setActiveTab(newTab);
}, []);

const memoizedGetDateForSelection = useCallback((selection) => {
  const today = new Date();
  switch(selection) {
    case 'yesterday':
      return subDays(today, 1);
    case 'tomorrow':
      return addDays(today, 1);
    default: // 'today'
      return today;
  }
}, []);

const getDateForSelection = useCallback((selection) => {
  const today = new Date();
  switch(selection) {
    case 'yesterday':
      return subDays(today, 1);
    case 'tomorrow':
      return addDays(today, 1);
    default: // 'today'
      return today;
  }
}, []);

// Derived state
const selectedDate = getDateForSelection(selectedDay);
const currentDateKey = format(selectedDate, 'yyyy-MM-dd');
const matchesForCurrentDate = matches[currentDateKey] || {};
const allMatchesForCurrentDate = matches[currentDateKey] || {};

// Process matches response helper
const processMatchesResponse = (matchesData, userTimeZone, user) => {
  const liveMatches = {};
  const regularMatches = {};
  const processedMatchIds = new Set();

  matchesData.forEach(match => {
    if (processedMatchIds.has(match.id)) {
      return;
    }      

    const matchLocalDate = utcToZonedTime(parseISO(match.utcDate), userTimeZone);
    const dateKey = format(matchLocalDate, 'yyyy-MM-dd');
    const leagueKey = `${match.competition.name}_${match.competition.id}`;
    
    // Calculate total votes and fan prediction
    const voteCounts = match.voteCounts || match.votes || { home: 0, away: 0, draw: 0 };
    const totalVotes = voteCounts.home + voteCounts.draw + voteCounts.away;
    let fanPrediction = null;
    
    if (totalVotes > 0) {
      const maxVotes = Math.max(voteCounts.home, voteCounts.draw, voteCounts.away);
      if (voteCounts.home === maxVotes) {
        fanPrediction = 'HOME_TEAM';
      } else if (voteCounts.away === maxVotes) {
        fanPrediction = 'AWAY_TEAM';
      } else {
        fanPrediction = 'DRAW';
      }
    }
    
    const updatedMatch = {
      ...match,
      localDate: matchLocalDate,
      userVote: match.userVote,
      voteCounts: voteCounts,
      fanPrediction,
      score: match.score || {
        fullTime: { home: 0, away: 0 },
        halfTime: { home: 0, away: 0 }
      }
    };

    if (['IN_PLAY', 'HALFTIME', 'PAUSED', 'LIVE'].includes(match.status)) {
      if (!liveMatches[leagueKey]) {
        liveMatches[leagueKey] = [];
      }
      liveMatches[leagueKey].push(updatedMatch);
    } else {
      if (!regularMatches[dateKey]) {
        regularMatches[dateKey] = {};
      }
      if (!regularMatches[dateKey][leagueKey]) {
        regularMatches[dateKey][leagueKey] = [];
      }
      regularMatches[dateKey][leagueKey].push(updatedMatch);
    }
    
    processedMatchIds.add(match.id);
  });

  return { liveMatches, regularMatches };
};

// Part 3: Filter Functions and Match Processing

const filterMatchesByStatus = (matches, statuses) => {
  if (!matches || typeof matches !== 'object') {
    console.warn('Invalid matches object provided to filterMatchesByStatus');
    return {};
  }

  return Object.entries(matches).reduce((acc, [leagueKey, leagueMatches]) => {
    if (!Array.isArray(leagueMatches)) {
      return acc;
    }

    const filteredMatches = leagueMatches.filter(match => {
      if (!match?.status) return false;
      
      const statusMatches = statuses.includes(match.status);
      
      if (statusMatches && match.status === 'TIMED') {
        if (!match.utcDate) return false;
        
        try {
          const matchDate = utcToZonedTime(parseISO(match.utcDate), userTimeZone);
          const startOfToday = startOfDay(selectedDate);
          const endOfToday = endOfDay(selectedDate);
          return matchDate >= startOfToday && matchDate <= endOfToday;
        } catch (error) {
          console.warn('Error processing match date:', error);
          return false;
        }
      }
      
      return statusMatches;
    });

    if (filteredMatches.length > 0) {
      acc[leagueKey] = filteredMatches;
    }
    return acc;
  }, {});
};

// Filter matches and create derived states
const filteredMatches = matchesForCurrentDate;
const liveMatches = filterMatchesByStatus(filteredMatches, ['IN_PLAY', 'HALFTIME', 'PAUSED', 'LIVE']);
const finishedMatches = filterMatchesByStatus(filteredMatches, ['FINISHED']);
const scheduledMatches = filterMatchesByStatus(filteredMatches, ['TIMED', 'SCHEDULED']);

const hasAnyLiveMatches = Object.keys(liveMatches).length > 0 || Object.keys(allLiveMatches).length > 0;

const extractLeagues = useCallback(() => {
  const leaguesMap = new Map();

  // Extract from regular matches
  Object.values(matchesForCurrentDate).forEach(leagueMatches => {
    const firstMatch = leagueMatches[0];
    if (firstMatch) {
      leaguesMap.set(firstMatch.competition.id, {
        id: firstMatch.competition.id,
        name: firstMatch.competition.name,
        emblem: firstMatch.competition.emblem,
        country: firstMatch.competition.country
      });
    }
  });

  // Extract from live matches
  Object.values(allLiveMatches).forEach(leagueMatches => {
    const firstMatch = leagueMatches[0];
    if (firstMatch) {
      leaguesMap.set(firstMatch.competition.id, {
        id: firstMatch.competition.id,
        name: firstMatch.competition.name,
        emblem: firstMatch.competition.emblem,
        country: firstMatch.competition.country
      });
    }
  });

  return Array.from(leaguesMap.values());
}, [matchesForCurrentDate, allLiveMatches]);

// Utility functions
const toggleLeague = useCallback((leagueKey) => {
  setCollapsedLeagues(prev => ({
    ...prev,
    [leagueKey]: !prev[leagueKey]
  }));
}, []);

// Part 4: Image Preloading and Data Fetching

const preloadImages = useCallback(async (matchesData) => {
  const imageUrls = new Set();
  
  Object.values(matchesData).forEach(dateMatches => {
    Object.values(dateMatches).forEach(leagueMatches => {
      leagueMatches.forEach(match => {
        if (match.homeTeam?.crest) imageUrls.add(match.homeTeam.crest);
        if (match.awayTeam?.crest) imageUrls.add(match.awayTeam.crest);
        if (match.competition?.emblem) imageUrls.add(match.competition.emblem);
      });
    });
  });

  try {
    await imageLoader.preloadImages([...imageUrls]);
  } catch (error) {
    console.error('Error in image preloading:', error);
  } finally {
    setImagesLoaded(true);
  }
}, []);


const findDateWithLiveMatches = useCallback(() => {
  return Object.keys(allLiveMatches).length > 0;
}, [allLiveMatches]);

const determineActiveTab = useCallback(() => {
  const hasLiveMatches = Object.values(allLiveMatches).some(leagueMatches =>
    leagueMatches.some(match => 
      ['IN_PLAY', 'HALFTIME', 'PAUSED', 'LIVE'].includes(match.status)
    )
  );
  if (hasLiveMatches) return 'live';

  const hasScheduledMatches = Object.values(matches[currentDateKey] || {}).some(leagueMatches =>
    leagueMatches.some(match => 
      ['TIMED', 'SCHEDULED'].includes(match.status)
    )
  );
  if (hasScheduledMatches) return 'scheduled';

  const hasFinishedMatches = Object.values(matches[currentDateKey] || {}).some(leagueMatches =>
    leagueMatches.some(match => match.status === 'FINISHED')
  );
  if (hasFinishedMatches) return 'finished';

  return 'scheduled';
}, [allLiveMatches, matches, currentDateKey]);


// Part 5: Core Data Fetching Functions

const fetchAccuracyData = useCallback(async () => {
  try {
    const response = await api.fetchAccuracy();
    setAccuracyData(response.data);
  } catch (error) {
    console.error('Error fetching accuracy data:', error);
  }
}, []);

const checkForGoals = useCallback((newMatches, prevMatches) => {
  if (!prevMatches || !newMatches) return;
  
  const newNotifications = [];
  
  const compareMatchScores = (newMatch, prevMatch) => {
    if (!newMatch.score?.fullTime || !prevMatch.score?.fullTime) return;
    
    const newScore = newMatch.score.fullTime;
    const prevScore = prevMatch.score.fullTime;
    const scoreKey = `${newMatch.id}-${newScore.home}-${newScore.away}`;
    
    if (newScore.home !== prevScore.home || newScore.away !== prevScore.away) {
      if (!processedScoreUpdates.has(scoreKey)) {
        processedScoreUpdates.add(scoreKey);
        
        if (newScore.home > prevScore.home) {
          newNotifications.push({
            id: `${scoreKey}-home`,
            match: newMatch,
            scoringTeam: 'home',
            prevScore,
            newScore
          });
        }
        
        if (newScore.away > prevScore.away) {
          newNotifications.push({
            id: `${scoreKey}-away`,
            match: newMatch,
            scoringTeam: 'away',
            prevScore,
            newScore
          });
        }
      }
    }
  };

  Object.values(newMatches.live || {}).forEach(leagueMatches => {
    leagueMatches.forEach(newMatch => {
      let prevMatch;
      
      if (prevMatches.live) {
        Object.values(prevMatches.live).forEach(prevLeagueMatches => {
          const found = prevLeagueMatches.find(m => m.id === newMatch.id);
          if (found) prevMatch = found;
        });
      }
      
      if (!prevMatch) {
        Object.entries(prevMatches).forEach(([key, value]) => {
          if (key !== 'live' && typeof value === 'object') {
            Object.values(value).forEach(leagueMatches => {
              const found = leagueMatches.find(m => m.id === newMatch.id);
              if (found) prevMatch = found;
            });
          }
        });
      }
      
      if (prevMatch) {
        compareMatchScores(newMatch, prevMatch);
      }
    });
  });

  if (newNotifications.length > 0) {
    console.log('New goal notifications:', newNotifications);
    setGoalNotifications(prev => [...prev, ...newNotifications]);
  }
}, [processedScoreUpdates]);

const fetchLiveMatches = useCallback(async () => {
  try {
    const response = await api.fetchLiveMatches();
    
    if (!response?.data?.matches) {
      console.warn('Invalid response structure from fetchLiveMatches:', response);
      setAllLiveMatches({});
      return;
    }
    
    const liveMatches = {};
    
    response.data.matches.forEach(match => {
      if (!match?.competition?.name || !match?.competition?.id) {
        console.warn('Invalid match structure:', match);
        return;
      }

      try {
        const leagueKey = `${match.competition.name}_${match.competition.id}`;
        const matchLocalDate = utcToZonedTime(parseISO(match.utcDate), userTimeZone);
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
          voteCounts: voteCounts,
          fanPrediction,
          score: match.score || { 
            fullTime: { home: 0, away: 0 },
            halfTime: { home: 0, away: 0 }
          }
        };

        if (!liveMatches[leagueKey]) {
          liveMatches[leagueKey] = [];
        }
        liveMatches[leagueKey].push(updatedMatch);
      } catch (matchError) {
        console.warn('Error processing match:', matchError, match);
      }
    });
  
    setAllLiveMatches(liveMatches);
  } catch (error) {
    console.error('Error fetching live matches:', error);
    setAllLiveMatches({});
  }
}, [userTimeZone, user]);

// Part 6: Match Fetching and Update Functions

const fetchMatches = async (date) => {
  setIsLoading(true);
  setImagesLoaded(false);
  
  try {
    const formattedDate = format(zonedTimeToUtc(date, userTimeZone), 'yyyy-MM-dd');
    const response = await api.fetchMatches(formattedDate);
    
    const groupedMatches = {};
    
    response.data.matches.forEach(match => {
      const matchLocalDate = utcToZonedTime(parseISO(match.utcDate), userTimeZone);
      const dateKey = format(matchLocalDate, 'yyyy-MM-dd');
      const leagueKey = `${match.competition.name}_${match.competition.id}`;
              
      let existingLiveMatch;
      Object.values(allLiveMatches).forEach(leagueMatches => {
        const found = leagueMatches.find(m => m.id === match.id);
        if (found) existingLiveMatch = found;
      });

      const updatedMatch = {
        ...match,
        localDate: matchLocalDate,
        userVote: match.userVote,
        voteCounts: existingLiveMatch?.voteCounts || match.voteCounts || { home: 0, draw: 0, away: 0 },
        fanPrediction: existingLiveMatch?.fanPrediction || match.fanPrediction
      };

      const selectedStartOfDay = startOfDay(date);
      const selectedEndOfDay = endOfDay(date);
      
      if (matchLocalDate >= selectedStartOfDay && matchLocalDate <= selectedEndOfDay) {
        if (!groupedMatches[dateKey]) {
          groupedMatches[dateKey] = {};
        }
        if (!groupedMatches[dateKey][leagueKey]) {
          groupedMatches[dateKey][leagueKey] = [];
        }
        groupedMatches[dateKey][leagueKey].push(updatedMatch);
      }
    });

    await preloadImages(groupedMatches);
    
    setMatches(prevMatches => {
      const newState = {
        ...prevMatches,
        [formattedDate]: groupedMatches[formattedDate] || {}
      };
      
      checkForGoals(newState, prevMatches);
      return newState;
    });

  } catch (error) {
    console.error('Error in component fetchMatches:', error);
    setMatches(prevMatches => ({
      ...prevMatches,
      [format(date, 'yyyy-MM-dd')]: {}
    }));
  } finally {
    setIsLoading(false);
  }
};

const memoizedFetchMatches = useCallback(fetchMatches, [userTimeZone, checkForGoals, preloadImages, user, allLiveMatches]);

const softUpdateMatches = useCallback(async () => {
  if (!userTimeZone) return;
  
  setIsRefreshing(true);
  try {
    const prevState = {
      ...matches,
      live: allLiveMatches
    };

    // Run all fetch operations in parallel
    const [liveResponse, matchesResponse, accuracyResponse] = await Promise.all([
      api.fetchLiveMatches(),
      api.fetchMatches(format(zonedTimeToUtc(selectedDate, userTimeZone), 'yyyy-MM-dd')),
      api.fetchAccuracy()
    ]);
    
    // Process matches
    const { liveMatches, regularMatches } = processMatchesResponse(
      [
        ...(liveResponse.data.matches || []),
        ...(matchesResponse.data.matches || [])
      ],
      userTimeZone,
      user
    );

    // Update accuracy data if available
    if (accuracyResponse?.data) {
      setAccuracyData(accuracyResponse.data);
    }

    // Check for goals before updating states
    checkForGoals({
      ...regularMatches,
      live: liveMatches
    }, prevState);

    // Update states
    setAllLiveMatches(liveMatches);
    setMatches(prevMatches => ({
      ...prevMatches,
      [format(selectedDate, 'yyyy-MM-dd')]: regularMatches[format(selectedDate, 'yyyy-MM-dd')] || {}
    }));

    if (!isManualTabSelect && Object.keys(liveMatches).length > 0) {
      setActiveTab('live');
    } else if (isManualTabSelect) {
      const hasMatchesInCurrentTab = (() => {
        switch (activeTab) {
          case 'live':
            return Object.keys(liveMatches).length > 0;
          case 'finished':
            return Object.keys(finishedMatches).length > 0;
          case 'scheduled':
            return Object.keys(scheduledMatches).length > 0;
          default:
            return false;
        }
      })();

      if (!hasMatchesInCurrentTab) {
        const appropriateTab = determineActiveTab();
        console.log(`No matches in ${activeTab} tab, suggested tab: ${appropriateTab}`);
      }
    }
  } catch (error) {
    console.error('Error in soft update:', error);
  } finally {
    setIsRefreshing(false);
  }
}, [
  userTimeZone, selectedDate, matches, allLiveMatches, user, 
  checkForGoals, activeTab, isManualTabSelect, determineActiveTab,
  finishedMatches, scheduledMatches
]);

// Create debounced update function
const debouncedSoftUpdate = useMemo(
  () => debounce(async () => {
    if (isUpdateInProgress) return;
    
    setIsUpdateInProgress(true);
    try {
      await softUpdateMatches();
    } finally {
      setIsUpdateInProgress(false);
    }
  }, 1000),
  [softUpdateMatches, isUpdateInProgress]
);


// Part 7: Notification Handling, Voting, and Tab Management

const handleNotificationDismiss = useCallback((notification) => {
  if (notification === 'all') {
    setGoalNotifications([]);
    processedScoreUpdates.clear();
  } else {
    setGoalNotifications(prev => 
      prev.filter(n => n.id !== notification.id)
    );
  }
}, [processedScoreUpdates]);

const handleVote = async (matchId, vote) => {
  try {
    if (!user) {
      onOpenAuthModal('Please sign in or register to show us you know better!');
      return;
    }

    const response = await api.voteForMatch(matchId, vote);
    setMatches(prevMatches => {
      const updatedMatches = { ...prevMatches };
      for (let date in updatedMatches) {
        for (let league in updatedMatches[date]) {
          updatedMatches[date][league] = updatedMatches[date][league].map(match => 
            match.id === matchId ? { 
              ...match, 
              votes: response.data.votes,
              voteCounts: {
                home: response.data.votes.home,
                draw: response.data.votes.draw,
                away: response.data.votes.away
              },
              userVote: response.data.userVote
            } : match
          );
        }
      }
      return updatedMatches;
    });
  } catch (error) {
    console.error('Error voting:', error);
    alert(error.response?.data?.message || 'Failed to record vote. Please try again.');
  }
};

const determineAppropriateTab = useCallback((leagueId = null) => {
  const checkMatches = (matches, leagueId) => {
    if (!leagueId) return Object.keys(matches).length > 0;
    return Object.entries(matches).some(([key]) => {
      const [, id] = key.split('_');
      return parseInt(id) === leagueId;
    });
  };

  if (checkMatches(allLiveMatches, leagueId)) {
    return 'live';
  }
  
  if (checkMatches(scheduledMatches, leagueId)) {
    return 'scheduled';
  }
  
  if (checkMatches(finishedMatches, leagueId)) {
    return 'finished';
  }
  
  return 'scheduled';
}, [allLiveMatches, scheduledMatches, finishedMatches]);

const handleLeagueSelect = useCallback((leagueId) => {
  setSelectedLeague(leagueId);
  setActiveTab(determineAppropriateTab(leagueId));
}, [determineAppropriateTab]);

// Effect for visibility and refresh handling
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && isInitialized && !isLoading) {
      softUpdateMatches();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, [isInitialized, isLoading, softUpdateMatches]);


// Timezone effect
useEffect(() => {
  setUserTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}, []);

// Initial load effect
useEffect(() => {
  const initialize = async () => {
    if (!userTimeZone || isInitialized) return;
    
    try {
      setIsLoading(true);
      await Promise.all([
        fetchLiveMatches(),
        memoizedFetchMatches(getDateForSelection('today')),
        fetchAccuracyData()
      ]);
      setIsInitialized(true);
      setActiveTab(determineActiveTab());
    } catch (error) {
      console.error('Error during initialization:', error);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  };

  initialize();
}, [userTimeZone, isInitialized]);

// Regular update effect
useEffect(() => {
  if (!isInitialized) return;

  let updateTimer = null;
  
  const updateData = async () => {
    if (isLoading) return;
    
    try {
      await softUpdateMatches();
    } catch (error) {
      console.error('Error updating matches:', error);
    }
  };

  // Initial update when becoming visible
  if (document.visibilityState === 'visible') {
    updateData();
  }

  // Set up regular polling
  updateTimer = setInterval(updateData, activeTab === 'live' ? 15000 : 30000);

  // Handle visibility changes
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      updateData();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    clearInterval(updateTimer);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, [isInitialized, isLoading, activeTab, softUpdateMatches]);

// Part 8: Render Functions

const renderMatches = (matches) => {
  return Object.entries(matches)
    .filter(([leagueKey]) => {
      if (!selectedLeague) return true;
      const [, leagueId] = leagueKey.split('_');
      return parseInt(leagueId) === selectedLeague;
    })
    .sort(([leagueKeyA, matchesA], [leagueKeyB, matchesB]) => {
      const [, aId] = leagueKeyA.split('_');
      const [, bId] = leagueKeyB.split('_');

      const statusOrder = ['IN_PLAY', 'PAUSED', 'HALFTIME', 'LIVE', 'TIMED', 'SCHEDULED', 'FINISHED'];
      const statusA = Math.min(...matchesA.map(match => statusOrder.indexOf(match.status)));
      const statusB = Math.min(...matchesB.map(match => statusOrder.indexOf(match.status)));

      if (statusA !== statusB) {
        return statusA - statusB;
      }

      const aIndex = priorityLeagues.indexOf(parseInt(aId));
      const bIndex = priorityLeagues.indexOf(parseInt(bId));
      
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      } else if (aIndex !== -1) {
        return -1;
      } else if (bIndex !== -1) {
        return 1;
      }

      return leagueKeyA.localeCompare(leagueKeyB);
    })
    .map(([leagueKey, competitionMatches], index) => {
      const [leagueName] = leagueKey.split('_');
      return (
        <React.Fragment key={leagueKey}>
          <div className="mb-4 last:mb-0 max-w-md mx-auto w-full">
            <button 
              className="w-full group relative overflow-hidden"
              onClick={() => toggleLeague(leagueKey)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 via-white to-indigo-50 opacity-90" />
              
              <div className="relative flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2.5 backdrop-blur-sm border border-indigo-100/50 rounded-lg group-hover:border-indigo-200/70 transition-all duration-300">
                <LeagueHeader 
                  leagueName={leagueName}
                  leagueEmblem={competitionMatches[0].competition.emblem}
                  country={competitionMatches[0].competition.country}
                />
                
                <div className={`
                  transition-transform duration-300 text-indigo-500 scale-75 sm:scale-100
                  ${collapsedLeagues[leagueKey] ? 'rotate-180' : 'rotate-0'}
                `}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </div>
              </div>
            </button>
                
            {!collapsedLeagues[leagueKey] && (
              <div className="mt-1">
                <AnimatedList delay={200} className="!overflow-visible gap-1">
                  {competitionMatches.map(match => (
                    <MatchBox 
                      key={match.id} 
                      match={match}
                      onVote={handleVote}
                      isLiveTab={activeTab === 'live'}
                    />
                  ))}
                </AnimatedList>
              </div>
            )}
          </div>
        </React.Fragment>
      );
    });
};

const renderStatusTabs = () => {
  if (selectedDay === 'yesterday') {
    return (
      <div className="inline-flex bg-gray-100 p-0.5 rounded-lg shadow-md mt-2">
        <button
          className="px-3 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md bg-white text-blue-600 shadow-sm flex items-center justify-center"
          onClick={() => {
            setIsManualTabSelect(true);
            setActiveTab('finished');
          }}
        >
          <BiAlarmOff className="mr-1 sm:mr-2" />
          Finished
        </button>
      </div>
    );
  }

  if (selectedDay === 'tomorrow') {
    return (
      <div className="inline-flex bg-gray-100 p-0.5 rounded-lg shadow-md mt-2">
        <button
          className="px-3 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md bg-white text-blue-600 shadow-sm flex items-center justify-center"
          onClick={() => {
            setIsManualTabSelect(true);
            setActiveTab('scheduled');
          }}
        >
          <BiAlarm className="mr-1 sm:mr-2" />
          Scheduled
        </button>
      </div>
    );
  }

  if (selectedDay === 'today') {
    return (
      <div className="inline-flex bg-gray-100 p-0.5 rounded-lg shadow-md mt-2">
        {['live', 'finished', 'scheduled'].map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`
              px-3 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ease-in-out
              flex items-center justify-center
              ${activeTab === tab
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            {tab === 'live' && (
              <span 
                className={`
                  inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-1 sm:mr-2
                  ${hasAnyLiveMatches ? 'bg-green-500 animate-pulse' : 'bg-red-500'}
                `}
              />
            )}
            {tab === 'finished' && <BiAlarmOff className="mr-1 sm:mr-2" />}
            {tab === 'scheduled' && <BiAlarm className="mr-1 sm:mr-2" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
    );
  }
};

// Part 9: Tab Content and Component Return

const renderTabContent = () => {
  switch (activeTab) {
    case 'live':
      return Object.keys(allLiveMatches).length > 0 ? renderMatches(allLiveMatches) : (
        <div className="text-center py-4">
          <p className="text-gray-600 text-lg">No live matches at the moment.</p>
        </div>
      );
    case 'finished':
      return Object.keys(finishedMatches).length > 0 ? renderMatches(finishedMatches) : (
        <div className="text-center py-4">
          <p className="text-gray-600 text-lg">No finished matches for this day.</p>
        </div>
      );
    case 'scheduled':
      return Object.keys(scheduledMatches).length > 0 ? renderMatches(scheduledMatches) : (
        <div className="text-center py-4">
          <p className="text-gray-600 text-lg">No scheduled matches for this day.</p>
        </div>
      );
    default:
      return null;
  }
};

const memoizedTabContent = useMemo(() => {
  return renderTabContent();
}, [activeTab, allLiveMatches, finishedMatches, scheduledMatches, selectedLeague, determineAppropriateTab]);

// Component Return
return (
  <div className="max-w-6xl mx-auto px-2">
    <NotificationQueue 
      notifications={goalNotifications}
      onDismiss={handleNotificationDismiss}
    />
    
    <ModernAccuracyComparison 
      user={user} 
      onSignInClick={onOpenAuthModal}
      allLiveMatches={allLiveMatches}
      scheduledMatches={scheduledMatches}
      selectedDate={selectedDate}
      matches={matches}
      setMatches={setMatches}
    />

    {isLoading ? (
      <LoadingLogo />
    ) : !imagesLoaded ? (
      <div className="flex justify-center items-center py-8">
        <div className="animate-pulse text-gray-600">Loading images...</div>
      </div>
    ) : (
      <div className="relative flex flex-col items-center mb-24"> {/* Added margin bottom */}
        {/* Tabs Section */}
        <div className="w-full flex justify-center mb-4">
          <TabsSection 
            selectedDay={selectedDay}
            setSelectedDay={handleSetSelectedDay}
            activeTab={activeTab}
            handleTabChange={handleTabChange}
            hasAnyLiveMatches={hasAnyLiveMatches}
            getDateForSelection={memoizedGetDateForSelection}
            fetchMatches={memoizedFetchMatches}
            hasFinishedMatches={Object.keys(finishedMatches).length > 0}
            hasScheduledMatches={Object.keys(scheduledMatches).length > 0}
          />
        </div>
        
        {/* Main Content Area with League Filter */}
        <div className="w-full max-w-5xl relative">
          <div className="flex relative pb-8">
            {/* League Filter Column */}
            <div className="hidden md:block absolute -left-36 top-0 w-[280px]">
              <div className="sticky top-4 pb-24"> {/* Added padding bottom */}
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 16rem)' }}>
                  <LeagueFilter
                    leagues={extractLeagues()}
                    selectedLeague={selectedLeague}
                    onLeagueSelect={handleLeagueSelect}
                    isMobileOpen={isMobileFilterOpen}
                    onClose={() => setIsMobileFilterOpen(false)}
                  />
                </div>
              </div>
            </div>

            {/* Matches Content */}
            <div className="w-full min-h-[500px]"> {/* Added minimum height */}
              <div className="max-w-md mx-auto">
                {/* Mobile League Filter Button */}
                <div className="md:hidden flex justify-end mb-4">
                  <LeagueFilterButton
                    onClick={() => setIsMobileFilterOpen(true)}
                    selectedLeague={selectedLeague}
                  />
                </div>

                {/* Matches */}
                {memoizedTabContent}

                {/* Add extra padding at the bottom to ensure content clears the league filter */}
                <div className="h-16 md:hidden"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile League Filter Modal */}
        <div className="md:hidden">
          <LeagueFilter
            leagues={extractLeagues()}
            selectedLeague={selectedLeague}
            onLeagueSelect={handleLeagueSelect}
            isMobileOpen={isMobileFilterOpen}
            onClose={() => setIsMobileFilterOpen(false)}
          />
        </div>

        {isUpdateInProgress && (
          <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm shadow-lg opacity-75 transition-opacity duration-300">
            Updating...
          </div>
        )}
      </div>
    )}
  </div>
);
};

export default Matches;