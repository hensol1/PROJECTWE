// Part 1: Imports
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ModernAccuracyComparison from './AccuracyComparison';
import api from '../api';
import { format, addDays, subDays, parseISO, startOfDay, endOfDay, isToday } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { BiAlarm, BiAlarmOff } from "react-icons/bi";
import CustomButton from './CustomButton';
import NextMatchCountdown from './NextMatchCountdown';
import LoadingLogo from './LoadingLogo';
import NotificationQueue from './NotificationQueue';
import MatchVotingBox from './MatchVotingBox';
import LeagueHeader from './LeagueHeader';
import MatchBox from './MatchBox';
import AnimatedList from './AnimatedList';

// Utility managers
const GuestVotesManager = {
  getKey: (matchId) => `guest_vote_${matchId}`,
  
  saveVote: (matchId, vote) => {
    localStorage.setItem(GuestVotesManager.getKey(matchId), vote);
  },
  
  getVote: (matchId) => {
    return localStorage.getItem(GuestVotesManager.getKey(matchId));
  },
  
  hasVote: (matchId) => {
    return !!localStorage.getItem(GuestVotesManager.getKey(matchId));
  }
};

// Constants
const continentalLeagues = {
  Europe: [2, 3, 39, 40, 45, 48, 61, 62, 78, 79, 81, 88, 90, 94, 96, 103, 106, 113, 119, 135, 137, 140, 143, 144, 172, 179, 197, 199, 203, 207, 210, 218, 235, 271, 283, 286, 318, 327, 333, 345, 373, 383, 848],
  International: [4, 5, 6, 10, 34],
  Americas: [11, 13, 71, 128, 253],
  Asia: [17, 30, 169, 188, 307],
  Africa: [12, 20, 29, 36]
};

const priorityLeagues = [2, 3, 39, 140, 78, 135, 61];

// Component Definition
const Matches = ({ user }) => {
  // State declarations
  const [matches, setMatches] = useState({});
  const [allLiveMatches, setAllLiveMatches] = useState({}); 
  const [currentDate, setCurrentDate] = useState(new Date());
  const [collapsedLeagues, setCollapsedLeagues] = useState({});
  const [selectedContinent, setSelectedContinent] = useState('All');
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
  const [isAutoVoting, setIsAutoVoting] = useState(false);
  const [isVotingBoxVisible, setIsVotingBoxVisible] = useState(false);

  // Add this helper function
  const processMatchesResponse = (matchesData, userTimeZone, user) => {
    const liveMatches = {};
    const regularMatches = {};
    const processedMatchIds = new Set(); // Keep track of processed matches
  
    matchesData.forEach(match => {
      // Skip if we've already processed this match
      if (processedMatchIds.has(match.id)) {
        return;
      }
  
      const matchLocalDate = utcToZonedTime(parseISO(match.utcDate), userTimeZone);
      const dateKey = format(matchLocalDate, 'yyyy-MM-dd');
      const leagueKey = `${match.competition.name}_${match.competition.id}`;
      
      const guestVote = !user ? GuestVotesManager.getVote(match.id) : null;
      
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
        userVote: guestVote || match.userVote,
        voteCounts: guestVote ? {
          ...voteCounts,
          [guestVote]: (voteCounts[guestVote] || 0)
        } : voteCounts,
        fanPrediction,
        score: match.score || {
          fullTime: { home: 0, away: 0 },
          halfTime: { home: 0, away: 0 }
        }
      };
  
      // Add to appropriate collection and mark as processed
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
  
    // Sort matches within each league by date
    Object.values(liveMatches).forEach(matches => {
      matches.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
    });
  
    Object.values(regularMatches).forEach(dateMatches => {
      Object.values(dateMatches).forEach(matches => {
        matches.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
      });
    });
  
    return { liveMatches, regularMatches };
  };
  
  // Derived state
  const currentDateKey = format(currentDate, 'yyyy-MM-dd');
  const matchesForCurrentDate = matches[currentDateKey] || {};
  const allMatchesForCurrentDate = matches[currentDateKey] || {};

  const filterMatchesByStatus = (matches, statuses) => {
    return Object.entries(matches).reduce((acc, [leagueKey, leagueMatches]) => {
      const filteredMatches = leagueMatches.filter(match => {
        const statusMatches = statuses.includes(match.status);
        
        if (statusMatches && match.status === 'TIMED') {
          const matchDate = utcToZonedTime(parseISO(match.utcDate), userTimeZone);
          const startOfToday = startOfDay(currentDate);
          const endOfToday = endOfDay(currentDate);
          return matchDate >= startOfToday && matchDate <= endOfToday;
        }
        
        return statusMatches;
      });

      if (filteredMatches.length > 0) {
        acc[leagueKey] = filteredMatches;
      }
      return acc;
    }, {});
  };

  const getLeagueContinent = (leagueId) => {
    for (const [continent, leagues] of Object.entries(continentalLeagues)) {
      if (leagues.includes(leagueId)) {
        return continent;
      }
    }
    return 'Other';
  };


    // Filter matches based on continent
    const filteredMatches = Object.entries(matchesForCurrentDate).reduce((acc, [leagueKey, leagueMatches]) => {
      const [, leagueId] = leagueKey.split('_');
      const continent = getLeagueContinent(parseInt(leagueId));
      if (selectedContinent === 'All' || continent === selectedContinent) {
        acc[leagueKey] = leagueMatches;
      }
      return acc;
    }, {});
  
    const liveMatches = filterMatchesByStatus(filteredMatches, ['IN_PLAY', 'HALFTIME', 'PAUSED', 'LIVE']);
    const finishedMatches = filterMatchesByStatus(filteredMatches, ['FINISHED']);
    const scheduledMatches = filterMatchesByStatus(filteredMatches, ['TIMED', 'SCHEDULED']);
  
  const hasAnyLiveMatches = Object.keys(liveMatches).length > 0 || Object.keys(allLiveMatches).length > 0;

  // Utility functions

  const toggleLeague = useCallback((leagueKey) => {
    setCollapsedLeagues(prev => ({
      ...prev,
      [leagueKey]: !prev[leagueKey]
    }));
  }, []);

  const hasAvailableMatches = () => {
    return Object.values(allMatchesForCurrentDate)
      .flat()
      .some(match => 
        (match.status === 'TIMED' || match.status === 'SCHEDULED') && 
        !match.userVote
      );
  };

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
    // First check for live matches in allLiveMatches
    if (Object.keys(allLiveMatches).length > 0) return 'live';

    // Then check current date matches for scheduled and finished
    const currentDateMatches = matches[currentDateKey];
    if (!currentDateMatches) return 'scheduled';

    const hasScheduledMatches = Object.values(currentDateMatches).some(leagueMatches => 
      leagueMatches.some(match => ['TIMED', 'SCHEDULED'].includes(match.status))
    );
    if (hasScheduledMatches) return 'scheduled';

    const hasFinishedMatches = Object.values(currentDateMatches).some(leagueMatches => 
      leagueMatches.some(match => match.status === 'FINISHED')
    );
    if (hasFinishedMatches) return 'finished';

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
          const guestVote = !user ? GuestVotesManager.getVote(match.id) : null;
          
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
            userVote: guestVote || match.userVote,
            voteCounts: guestVote ? {
              ...voteCounts,
              [guestVote]: (voteCounts[guestVote] || 0)
            } : voteCounts,
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
    
  const fetchMatches = useCallback(async (date) => {
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
        
        const guestVote = !user ? GuestVotesManager.getVote(match.id) : null;
        
        // Check if this match exists in allLiveMatches and use its vote data
        let existingLiveMatch;
        Object.values(allLiveMatches).forEach(leagueMatches => {
          const found = leagueMatches.find(m => m.id === match.id);
          if (found) existingLiveMatch = found;
        });

        const updatedMatch = {
          ...match,
          localDate: matchLocalDate,
          userVote: guestVote || match.userVote,
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
}, [userTimeZone, checkForGoals, preloadImages, user, allLiveMatches]); // Add allLiveMatches to dependencies
  
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
    
    // Then fetch current date matches, but only if we're not in live tab
    const formattedDate = format(zonedTimeToUtc(currentDate, userTimeZone), 'yyyy-MM-dd');
    const matchesResponse = activeTab !== 'live' 
      ? await api.fetchMatches(formattedDate)
      : { data: { matches: [] } };
    
    // Combine and process all matches, removing duplicates
    const { liveMatches, regularMatches } = processMatchesResponse(
      [
        ...(liveResponse.data.matches || []),
        // Only include regular matches if not in live tab
        ...(activeTab !== 'live' ? (matchesResponse.data.matches || []) : [])
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
    if (activeTab !== 'live') {
      setMatches(prevMatches => ({
        ...prevMatches,
        [formattedDate]: regularMatches[formattedDate] || {}
      }));
    }

  } catch (error) {
    console.error('Error in soft update:', error);
  } finally {
    setIsRefreshing(false);
  }
}, [userTimeZone, currentDate, matches, allLiveMatches, user, checkForGoals, activeTab]);

  // Event handlers
  const handleTabChange = useCallback((newTab) => {
    setIsManualTabSelect(true);
    if (newTab === 'live' && hasAnyLiveMatches) {
      // For live tab, we don't need to change the date anymore
      setActiveTab('live');
    } else {
      setActiveTab(newTab);
    }
  }, [hasAnyLiveMatches]);

  const handleDateChange = useCallback((days) => {
    setIsManualTabSelect(true);
    const newDate = days > 0 ? addDays(currentDate, days) : subDays(currentDate, Math.abs(days));
    
    fetchMatches(newDate);
    setCurrentDate(newDate);
    // Only change to scheduled tab if we're not in live tab
    if (activeTab === 'live' && hasAnyLiveMatches) {
      // Stay in live tab if there are live matches
      setActiveTab('live');
    } else {
      setActiveTab('scheduled');
    }
    setSelectedContinent('All');
  }, [currentDate, fetchMatches, activeTab, hasAnyLiveMatches]);

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

  const handleAutoVote = async () => {
    if (!user) {
      alert('Please log in to use auto-vote feature');
      return;
    }

    try {
      setIsAutoVoting(true);
      const response = await api.autoVote();
      
      setMatches(prevMatches => {
        const newMatches = { ...prevMatches };
        response.data.votedMatches.forEach(({ matchId, vote, votes }) => {
          for (const dateKey in newMatches) {
            for (const leagueKey in newMatches[dateKey]) {
              newMatches[dateKey][leagueKey] = newMatches[dateKey][leagueKey].map(match => {
                if (match.id === matchId) {
                  return {
                    ...match,
                    userVote: vote,
                    voteCounts: votes
                  };
                }
                return match;
              });
            }
          }
        });
        return newMatches;
      });

      alert(`Auto-voted for ${response.data.votedMatches.length} matches!`);
    } catch (error) {
      console.error('Error in auto-vote:', error);
      alert('Failed to auto-vote. Please try again.');
    } finally {
      setIsAutoVoting(false);
    }
  };

  const handleVote = async (matchId, vote) => {
    try {
      // If user is not logged in, save vote to localStorage
      if (!user) {
        GuestVotesManager.saveVote(matchId, vote);
        // Update the UI immediately for guest users
        setMatches(prevMatches => {
          const updatedMatches = { ...prevMatches };
          for (let date in updatedMatches) {
            for (let league in updatedMatches[date]) {
              updatedMatches[date][league] = updatedMatches[date][league].map(match => 
                match.id === matchId ? { 
                  ...match,
                  userVote: vote,
                  voteCounts: {
                    ...match.voteCounts,
                    [vote]: (match.voteCounts[vote] || 0) + 1
                  }
                } : match
              );
            }
          }
          return updatedMatches;
        });
        return;
      }
  
      // Regular flow for logged-in users
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


  // Render functions
  const renderMatches = (matches) => {
    return Object.entries(matches).sort(([leagueKeyA, matchesA], [leagueKeyB, matchesB]) => {
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
    }).map(([leagueKey, competitionMatches]) => {
      const [leagueName] = leagueKey.split('_');
      return (
        <div key={leagueKey} className="mb-4 last:mb-0">
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
      );
    });
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

  // Effect Hooks
  useEffect(() => {
    setUserTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  useEffect(() => {
    if (userTimeZone && isInitialLoad) {
      // Add fetchLiveMatches() to initial load
      Promise.all([
        fetchLiveMatches(),
        fetchMatches(currentDate),
        fetchAccuracyData()
      ]).then(() => {
        setIsInitialLoad(false);
      });
    }
  }, [currentDate, userTimeZone, fetchMatches, fetchAccuracyData, isInitialLoad, fetchLiveMatches]);
  
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
    <div className="max-w-3xl mx-auto px-2">
      <NotificationQueue 
        notifications={goalNotifications}
        onDismiss={handleNotificationDismiss}
      />
      
      <ModernAccuracyComparison user={user} />
      
      {/* Only show NextMatchCountdown if there are no live matches */}
      {!hasAnyLiveMatches && (
        <NextMatchCountdown scheduledMatches={scheduledMatches} />
      )}
  
      {/* Match Voting Box */}
      {hasAvailableMatches() ? (
        <div className="mb-8 flex justify-center gap-4">
          {isVotingBoxVisible ? (
            <MatchVotingBox 
              matches={Object.values(allMatchesForCurrentDate)
                .reduce((acc, leagueMatches) => [...acc, ...leagueMatches], [])
                .filter(match => 
                  (match.status === 'TIMED' || match.status === 'SCHEDULED')
                )
                .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))}
              onVote={handleVote}
              onSkip={(matchId) => {
                console.log('Skipped match:', matchId);
              }}
              onClose={() => setIsVotingBoxVisible(false)}
              user={user}
            />
          ) : (
            <div className="flex gap-4">
              <button
                onClick={() => setIsVotingBoxVisible(true)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg 
                          shadow transition-all duration-200"
              >
                Start Voting
              </button>
              {user && (
                <button
                  onClick={handleAutoVote}
                  disabled={isAutoVoting}
                  className={`px-4 py-2 rounded-lg text-sm font-medium
                    ${isAutoVoting 
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white shadow transition-all duration-200'}`}
                >
                  {isAutoVoting ? 'Auto-voting...' : 'Auto Vote'}
                </button>
              )}
            </div>
          )}
        </div>
      ) : null}

      {isLoading ? (
        <LoadingLogo />
      ) : !imagesLoaded ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-pulse text-gray-600">Loading images...</div>
        </div>
      ) : (
        <>
          <div className="flex flex-col space-y-4 mb-4">
            {/* Tab Filters */}
            <div className="flex justify-center">
              <div className="inline-flex bg-gray-100 p-0.5 rounded-lg shadow-md">
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
            </div>

            {/* Continent Filters */}
            <div className="flex justify-center">
              <div className="inline-flex bg-gray-100 p-0.5 rounded-lg shadow-md">
                {['All', 'Europe', 'Americas', 'Asia', 'Africa', 'International'].map((continent) => (
                  <button
                    key={continent}
                    onClick={() => setSelectedContinent(continent)}
                    className={`
                      px-2 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ease-in-out
                      ${selectedContinent === continent
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    {continent}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Centered Date Navigation */}
          <div className="flex justify-center my-4">
            <div className="flex items-center gap-2">
              <CustomButton 
                onClick={() => handleDateChange(-1)}
                className="w-10 h-10 flex items-center justify-center"
              >
                <span className="text-xl font-bold">&lt;</span>
              </CustomButton>
              
              <h2 className="text-sm sm:text-lg font-bold text-gray-800">
                {format(currentDate, 'dd MMM yyyy')}
              </h2>
              
              <CustomButton 
                onClick={() => handleDateChange(1)}
                className="w-10 h-10 flex items-center justify-center"
              >
                <span className="text-xl font-bold">&gt;</span>
              </CustomButton>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-2 sm:p-3 max-w-2xl mx-auto">
            {renderTabContent()}
          </div>

          {/* Subtle refresh indicator */}
          {isRefreshing && (
            <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm shadow-lg opacity-75 transition-opacity duration-300">
              Updating...
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Matches;