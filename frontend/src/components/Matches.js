// Part 1: Imports
import React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
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
import AffiliateProductBanner from './AffiliateProductBanner';
import SingleProductBanner from './SingleProductBanner';

// Constants

const priorityLeagues = [2, 3, 39, 140, 78, 135, 61];

// Component Definition
const Matches = ({ user, onOpenAuthModal }) => {
// State declarations
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
const handleSetSelectedDay = useCallback((day) => {
  setSelectedDay(day);
  setIsManualTabSelect(true); // Set manual flag when changing days
  
  // Set appropriate tab based on selected day
  switch (day) {
    case 'yesterday':
      setActiveTab('finished');
      break;
    case 'tomorrow':
      setActiveTab('scheduled');
      break;
    case 'today':
      // For today, we can either keep current tab or determine best tab
      const hasLive = Object.keys(allLiveMatches).length > 0;
      if (hasLive) {
        setActiveTab('live');
      } else {
        setActiveTab('scheduled');
      }
      setIsManualTabSelect(false); // Allow auto-switching for today
      break;
    default:
      break;
  }
    
      const newDate = getDateForSelection(day);
  memoizedFetchMatches(newDate);
}, [allLiveMatches, getDateForSelection, memoizedFetchMatches]);


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

const products = [
  {
    id: "1005004932777511",
    title: "Anmeilu Backpack",
    description: "Waterproof Outdoor Sport Backpack",
    price: "29.84",
    originalPrice: "32.84",
    discount: "9%",
    image: "https://ae-pic-a1.aliexpress-media.com/kf/S2660540f6178466581612c2d9584977bz.jpg",
    affiliateLink: "https://s.click.aliexpress.com/e/_oCQSUh7",
    feedback: "97.5%",
    sales: "35"
  }
];


// Derived state
const selectedDate = getDateForSelection(selectedDay);
const currentDateKey = format(selectedDate, 'yyyy-MM-dd');
const matchesForCurrentDate = matches[currentDateKey] || {};
const allMatchesForCurrentDate = matches[currentDateKey] || {};

  // Add this helper function
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
  
const filterMatchesByStatus = (matches, statuses) => {
  if (!matches || typeof matches !== 'object') {
    console.warn('Invalid matches object provided to filterMatchesByStatus');
    return {};
  }

  return Object.entries(matches).reduce((acc, [leagueKey, leagueMatches]) => {
    // Ensure leagueMatches is valid
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
  
    // Filter matches based on continent
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

  // Core utility functions
  const preloadImages = useCallback(async (matchesData) => {
    const imageUrls = new Set();
    const failedImages = new Set();
    
    Object.values(matchesData).forEach(dateMatches => {
      Object.values(dateMatches).forEach(leagueMatches => {
        leagueMatches.forEach(match => {
          if (match.homeTeam?.crest) imageUrls.add(match.homeTeam.crest);
          if (match.awayTeam?.crest) imageUrls.add(match.awayTeam.crest);
          if (match.competition?.emblem) imageUrls.add(match.competition.emblem);
        });
      });
    });
  
    const loadImageWithRetry = async (url, retries = 3, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => reject();
            img.src = url;
          });
          return;
        } catch (error) {
          if (i === retries - 1) {
            failedImages.add(url);
            console.warn(`Failed to load image after ${retries} retries:`, url);
          } else {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    };
  
    try {
      await Promise.all([...imageUrls].map(url => loadImageWithRetry(url)));
  
      if (failedImages.size > 0) {
        setMatches(prevMatches => {
          const newMatches = { ...prevMatches };
          Object.keys(newMatches).forEach(date => {
            Object.keys(newMatches[date]).forEach(league => {
              newMatches[date][league] = newMatches[date][league].map(match => {
                const updatedMatch = { ...match };
                
                if (match.homeTeam?.crest && failedImages.has(match.homeTeam.crest)) {
                  updatedMatch.homeTeam = {
                    ...match.homeTeam,
                    crest: '/fallback-team-logo.png'
                  };
                }
                if (match.awayTeam?.crest && failedImages.has(match.awayTeam.crest)) {
                  updatedMatch.awayTeam = {
                    ...match.awayTeam,
                    crest: '/fallback-team-logo.png'
                  };
                }
                
                if (match.competition?.emblem && failedImages.has(match.competition.emblem)) {
                  updatedMatch.competition = {
                    ...match.competition,
                    emblem: '/fallback-league-logo.png'
                  };
                }
                
                return updatedMatch;
              });
            });
          });
          return newMatches;
        });
      }
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
    // First check for live matches
    const hasLiveMatches = Object.values(allLiveMatches).some(leagueMatches =>
      leagueMatches.some(match => 
        ['IN_PLAY', 'HALFTIME', 'PAUSED', 'LIVE'].includes(match.status)
      )
    );
    if (hasLiveMatches) return 'live';

    // Then check for scheduled matches
    const hasScheduledMatches = Object.values(matches[currentDateKey] || {}).some(leagueMatches =>
      leagueMatches.some(match => 
        ['TIMED', 'SCHEDULED'].includes(match.status)
      )
    );
        if (hasScheduledMatches) return 'scheduled';

    // Finally check for finished matches
    const hasFinishedMatches = Object.values(matches[currentDateKey] || {}).some(leagueMatches =>
      leagueMatches.some(match => match.status === 'FINISHED')
    );
    if (hasFinishedMatches) return 'finished';

    // Default to scheduled if no matches are found
    return 'scheduled';
  }, [allLiveMatches, matches, currentDateKey]);  

  // Data fetching and updates
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
    
    // Function to check score changes
    const compareMatchScores = (newMatch, prevMatch) => {
      if (!newMatch.score?.fullTime || !prevMatch.score?.fullTime) return;
      
      const newScore = newMatch.score.fullTime;
      const prevScore = prevMatch.score.fullTime;
      const scoreKey = `${newMatch.id}-${newScore.home}-${newScore.away}`;
      
      // Only process if scores are different
      if (newScore.home !== prevScore.home || newScore.away !== prevScore.away) {
        if (!processedScoreUpdates.has(scoreKey)) {
          processedScoreUpdates.add(scoreKey);
          
          // Check for home team goal
          if (newScore.home > prevScore.home) {
            newNotifications.push({
              id: `${scoreKey}-home`,
              match: newMatch,
              scoringTeam: 'home',
              prevScore,
              newScore
            });
          }
          
          // Check for away team goal
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
  
    // Check live matches
    Object.values(newMatches.live || {}).forEach(leagueMatches => {
      leagueMatches.forEach(newMatch => {
        let prevMatch;
        
        // Look for the match in previous live matches
        if (prevMatches.live) {
          Object.values(prevMatches.live).forEach(prevLeagueMatches => {
            const found = prevLeagueMatches.find(m => m.id === newMatch.id);
            if (found) prevMatch = found;
          });
        }
        
        // If not found in live, check regular matches
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
  
    // Update notifications if any were found
    if (newNotifications.length > 0) {
      console.log('New goal notifications:', newNotifications);
      setGoalNotifications(prev => [...prev, ...newNotifications]);
    }
  }, [processedScoreUpdates]);
      
  
  const fetchLiveMatches = useCallback(async () => {
    try {
      const response = await api.fetchLiveMatches();
      console.log('Live matches response:', response?.data?.matches);
      
      if (!response?.data?.matches) {
        console.warn('Invalid response structure from fetchLiveMatches:', response);
        setAllLiveMatches({});
        return;
      }
      
      const liveMatches = {};
      
      response.data.matches.forEach(match => {
        // Debug logs
        console.log('Processing live match:', {
          id: match.id,
          home: match.homeTeam.name,
          away: match.awayTeam.name,
          voteCounts: match.voteCounts,
          votes: match.votes // Check if votes exist in a different property
        });
                if (!match?.competition?.name || !match?.competition?.id) {
          console.warn('Invalid match structure:', match);
          return;
        }
  
        try {
          const leagueKey = `${match.competition.name}_${match.competition.id}`;
          const matchLocalDate = utcToZonedTime(parseISO(match.utcDate), userTimeZone);
          
          // Add validation for score/votes structure
          const voteCounts = match.voteCounts || match.votes || { home: 0, away: 0, draw: 0 };

          // If the data comes in a different format, we might need to transform it
          const transformedVoteCounts = {
            home: voteCounts.home || voteCounts.HOME_TEAM || 0,
            away: voteCounts.away || voteCounts.AWAY_TEAM || 0,
            draw: voteCounts.draw || voteCounts.DRAW || 0
          };
          
          // Calculate total votes and fan prediction
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
            fanPrediction, // Add the calculated fan prediction
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
    // Store previous state for goal checking
    const prevState = {
      ...matches,
      live: allLiveMatches
    };

    // Fetch live matches first
    const liveResponse = await api.fetchLiveMatches();
    
    // Then fetch current date matches
    const formattedDate = format(zonedTimeToUtc(selectedDate, userTimeZone), 'yyyy-MM-dd');
    const matchesResponse = await api.fetchMatches(formattedDate);
    
    // Combine and process all matches, removing duplicates
    const { liveMatches, regularMatches } = processMatchesResponse(
      [
        ...(liveResponse.data.matches || []),
        ...(matchesResponse.data.matches || [])
      ],
      userTimeZone,
      user
    );

    // Check for goals before updating states
    checkForGoals({
      ...regularMatches,
      live: liveMatches
    }, prevState);

    // Update states
    setAllLiveMatches(liveMatches);
    setMatches(prevMatches => ({
      ...prevMatches,
      [formattedDate]: regularMatches[formattedDate] || {}
    }));

    // Only auto-switch to live tab if:
    // 1. User hasn't manually selected a tab
    // 2. There are actually live matches
    if (!isManualTabSelect && Object.keys(liveMatches).length > 0) {
      setActiveTab('live');
    }
    // If user manually selected a tab but there are no matches in that category,
    // suggest switching to a tab with content
    else if (isManualTabSelect) {
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
        // Find the first tab with matches
        const appropriateTab = determineActiveTab();
        // Optional: Show a notification to user about tab switch
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

    // Add this function to determine the best available tab for a league
const determineAppropriateTab = useCallback((leagueId = null) => {
  const checkMatches = (matches, leagueId) => {
    if (!leagueId) return Object.keys(matches).length > 0;
    return Object.entries(matches).some(([key]) => {
      const [, id] = key.split('_');
      return parseInt(id) === leagueId;
    });
  };

  // Check live matches first
  if (checkMatches(allLiveMatches, leagueId)) {
    return 'live';
  }
  
  // Then check scheduled matches
  if (checkMatches(scheduledMatches, leagueId)) {
    return 'scheduled';
  }
  
  // Finally check finished matches
  if (checkMatches(finishedMatches, leagueId)) {
    return 'finished';
  }
  
  // Default to scheduled if no matches found
  return 'scheduled';
}, [allLiveMatches, scheduledMatches, finishedMatches]);

// Modify the league selection handler
const handleLeagueSelect = useCallback((leagueId) => {
  setSelectedLeague(leagueId);
  setActiveTab(determineAppropriateTab(leagueId));
}, [determineAppropriateTab]);



  // Render functions
  const renderMatches = (matches) => {
    return Object.entries(matches)
      // First filter by selected league
      .filter(([leagueKey]) => {
        if (!selectedLeague) return true; // If no league selected, show all
        const [, leagueId] = leagueKey.split('_');
        return parseInt(leagueId) === selectedLeague;
      })
      // Then sort the matches
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
      // Finally render each league's matches
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
            
            {/* Add banner after each league except the last one */}
            {index < Object.entries(matches).length - 1 && (
              <SingleProductBanner product={products[index % products.length]} />
            )}
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
    
  // Effect Hooks
  useEffect(() => {
    setUserTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

useEffect(() => {
  if (userTimeZone && isInitialLoad) {
    const initializeData = async () => {
      // Set initial tab and manual flag based on selected day
      switch (selectedDay) {
        case 'yesterday':
          setActiveTab('finished');
          setIsManualTabSelect(true);
          break;
        case 'tomorrow':
          setActiveTab('scheduled');
          setIsManualTabSelect(true);
          break;
        case 'today':
          // Today we'll determine the best tab after fetching data
          setIsManualTabSelect(false);
          break;
      }

      try {
        // Always fetch live matches to know if they exist
        await fetchLiveMatches();
        
        // Fetch matches for the selected day
        await memoizedFetchMatches(getDateForSelection(selectedDay));
        
        // Fetch accuracy data
        await fetchAccuracyData();

        // For today only, determine the best tab based on available matches
        if (selectedDay === 'today') {
          setActiveTab(determineActiveTab());
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setIsInitialLoad(false);
      }
    };

    initializeData();
  }
}, [
  userTimeZone, 
  isInitialLoad, 
  selectedDay,
  memoizedFetchMatches,
  fetchLiveMatches,
  fetchAccuracyData,
  determineActiveTab,
  getDateForSelection
]);
      
  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (!isLoading) {
        softUpdateMatches();
      }
    }, activeTab === 'live' ? 15000 : 30000); // Poll more frequently for live matches
  
    return () => clearInterval(pollInterval);
  }, [softUpdateMatches, isLoading, activeTab]);
  
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
      <div className="relative">
<TabsSection 
  selectedDay={selectedDay}
  setSelectedDay={handleSetSelectedDay} // Use the new handler
  activeTab={activeTab}
  handleTabChange={handleTabChange}
  hasAnyLiveMatches={hasAnyLiveMatches}
  getDateForSelection={memoizedGetDateForSelection}
  fetchMatches={memoizedFetchMatches}
  hasFinishedMatches={Object.keys(finishedMatches).length > 0}
  hasScheduledMatches={Object.keys(scheduledMatches).length > 0}
/>
        
        <div className="flex mt-4 relative justify-between">
  {/* Desktop League Filter */}
  <div className="hidden md:block sticky top-4 h-fit w-64">
    <LeagueFilter
      leagues={extractLeagues()}
      selectedLeague={selectedLeague}
      onLeagueSelect={handleLeagueSelect}
      isMobileOpen={isMobileFilterOpen}
      onClose={() => setIsMobileFilterOpen(false)}
    />
  </div>

  {/* Mobile League Filter */}
  <div className="md:hidden">
    <LeagueFilter
      leagues={extractLeagues()}
      selectedLeague={selectedLeague}
      onLeagueSelect={handleLeagueSelect}
      isMobileOpen={isMobileFilterOpen}
      onClose={() => setIsMobileFilterOpen(false)}
    />
  </div>

  {/* Mobile Filter Button */}
  <LeagueFilterButton
    onClick={() => setIsMobileFilterOpen(true)}
    selectedLeague={selectedLeague}
  />

{/* Matches Content - With proper mobile width */}
<div className="w-full md:max-w-md md:mx-4 px-2 md:px-0">
  {memoizedTabContent}
</div>

  {/* Desktop Affiliate Banner */}
  <div className="hidden md:block sticky top-4 h-fit w-72">
    <AffiliateProductBanner />
  </div>
</div>

        {isRefreshing && (
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
