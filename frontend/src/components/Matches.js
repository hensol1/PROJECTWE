// Part 1: Imports
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';
import { format, addDays, subDays, parseISO, startOfDay, endOfDay, isToday } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import AccuracyComparison from './AccuracyComparison';
import { BiAlarm, BiAlarmOff } from "react-icons/bi";
import CustomButton from './CustomButton';
import NextMatchCountdown from './NextMatchCountdown';
import LoadingLogo from './LoadingLogo';
import NotificationQueue from './NotificationQueue';
import AnimatedVotingBox from './AnimatedVotingBox';
import LeagueHeader from './LeagueHeader';
import MatchBox from './MatchBox';

// Part 2: Component Definition and Initial States
const Matches = ({ user }) => {
  const [matches, setMatches] = useState({});
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

  const currentDateKey = format(currentDate, 'yyyy-MM-dd');
  const matchesForCurrentDate = matches[currentDateKey] || {};
  const allMatchesForCurrentDate = matches[currentDateKey] || {};

  // Part 3: Constants and Utility Functions
  const hasAnyLiveMatches = Object.values(matches).some(dateMatches => 
    Object.values(dateMatches).some(leagueMatches =>
      leagueMatches.some(match => 
        ['IN_PLAY', 'HALFTIME', 'PAUSED', 'LIVE'].includes(match.status)
      )
    )
  );

  const continentalLeagues = {
    Europe: [2, 3, 39, 40, 61, 62, 78, 79, 81, 88, 94, 103, 106, 113, 119, 135, 140, 143, 144, 172, 179, 197, 203, 207, 210, 218, 235, 271, 283, 286, 318, 327, 333, 345, 373, 383, 848],
    International: [4, 5, 6, 10, 34],
    Americas: [11, 13, 71, 128, 253],
    Asia: [17, 30, 169, 188, 307],
    Africa: [12, 20, 29]
  };
  
  const priorityLeagues = [2, 3, 39, 140, 78, 135, 61];

const filterMatchesByStatus = (matches, statuses) => {
  return Object.entries(matches).reduce((acc, [leagueKey, leagueMatches]) => {
    const filteredMatches = leagueMatches.filter(match => {
      // First check if the status matches
      const statusMatches = statuses.includes(match.status);
      
      // For TIMED matches, we need to check if they're within the current date in user's timezone
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

  // Part 4: Callback Functions
  const findDateWithLiveMatches = useCallback(() => {
    for (const [date, dateMatches] of Object.entries(matches)) {
      const hasLive = Object.values(dateMatches).some(leagueMatches =>
        leagueMatches.some(match => 
          ['IN_PLAY', 'HALFTIME', 'PAUSED', 'LIVE'].includes(match.status)
        )
      );
      if (hasLive) {
        return date;
      }
    }
    return null;
  }, [matches]);

  const determineActiveTab = useCallback((matches) => {
    const hasMatchesWithStatus = (matches, statuses) => {
      return Object.values(matches).some(leagueMatches => 
        leagueMatches.some(match => statuses.includes(match.status))
      );
    };

    const hasLiveMatches = hasMatchesWithStatus(matches, ['IN_PLAY', 'HALFTIME', 'PAUSED', 'LIVE']);
    if (hasLiveMatches) return 'live';

    const hasScheduledMatches = hasMatchesWithStatus(matches, ['TIMED', 'SCHEDULED']);
    if (hasScheduledMatches) return 'scheduled';

    const hasFinishedMatches = hasMatchesWithStatus(matches, ['FINISHED']);
    if (hasFinishedMatches) return 'finished';

    return 'scheduled';
  }, []);

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
  
  Object.keys(newMatches).forEach(dateKey => {
    if (!prevMatches[dateKey]) return;
    
    Object.keys(newMatches[dateKey]).forEach(leagueKey => {
      if (!prevMatches[dateKey][leagueKey]) return;
      
      newMatches[dateKey][leagueKey].forEach(newMatch => {
        const prevMatch = prevMatches[dateKey][leagueKey]
          .find(m => m.id === newMatch.id);
        
        if (prevMatch) {
          const newScore = newMatch.score.fullTime;
          const prevScore = prevMatch.score.fullTime;
          const scoreKey = `${newMatch.id}-${newScore.home}-${newScore.away}`;
          
          // Skip if we've already processed this score state or if it's 0-0
          if (processedScoreUpdates.has(scoreKey)) return;
          if (newScore.home === 0 && newScore.away === 0) return;
          
          if (newScore.home !== prevScore.home || newScore.away !== prevScore.away) {
            // Add this score state to processed set
            processedScoreUpdates.add(scoreKey);
            
            if (newScore.home > prevScore.home) {
              newNotifications.push({
                id: scoreKey + '-home',
                match: newMatch,
                scoringTeam: 'home'
              });
            }
            if (newScore.away > prevScore.away) {
              newNotifications.push({
                id: scoreKey + '-away',
                match: newMatch,
                scoringTeam: 'away'
              });
            }
          }
        }
      });
    });
  });

  if (newNotifications.length > 0) {
    setGoalNotifications(prev => [...prev, ...newNotifications]);
  }
}, [processedScoreUpdates]);


// Add this handler
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

  
const softUpdateMatches = useCallback(async () => {
  if (!currentDate || !userTimeZone) return;
  
  setIsRefreshing(true);
  try {
    const formattedDate = format(zonedTimeToUtc(currentDate, userTimeZone), 'yyyy-MM-dd');
    const response = await api.fetchMatches(formattedDate);
    
    const groupedMatches = response.data.matches.reduce((acc, match) => {
      const matchLocalDate = utcToZonedTime(parseISO(match.utcDate), userTimeZone);
      const dateKey = format(matchLocalDate, 'yyyy-MM-dd');
      const leagueKey = `${match.competition.name}_${match.competition.id}`;
      
      if (!acc[dateKey]) {
        acc[dateKey] = {};
      }
      if (!acc[dateKey][leagueKey]) {
        acc[dateKey][leagueKey] = [];
      }
      acc[dateKey][leagueKey].push({
        ...match,
        localDate: matchLocalDate
      });
      return acc;
    }, {});

  setMatches(prevMatches => {
    const prevMatchesCopy = JSON.parse(JSON.stringify(prevMatches));
    const newState = {
      ...prevMatches,
      [formattedDate]: groupedMatches[formattedDate] || {}
    };

    // Create a batch of new notifications
    const newNotifications = [];
    const processedScores = new Set();

    Object.keys(groupedMatches[formattedDate] || {}).forEach(leagueKey => {
      const newLeagueMatches = groupedMatches[formattedDate][leagueKey];
      const prevLeagueMatches = prevMatchesCopy[formattedDate]?.[leagueKey] || [];

      newLeagueMatches.forEach(newMatch => {
        const prevMatch = prevLeagueMatches.find(m => m.id === newMatch.id);
        
        if (prevMatch) {
          const newScore = newMatch.score.fullTime;
          const prevScore = prevMatch.score.fullTime;
          const scoreKey = `${newMatch.id}-${newScore.home}-${newScore.away}`;

          // Skip if already processed or initial 0-0
          if (processedScores.has(scoreKey)) return;
          if (prevScore.home === 0 && prevScore.away === 0 &&
              newScore.home === 0 && newScore.away === 0) return;

          if (newScore.home > prevScore.home || newScore.away > prevScore.away) {
            processedScores.add(scoreKey);

            if (newScore.home > prevScore.home) {
              newNotifications.push({
                id: `${newMatch.id}-home-${newScore.home}-${newScore.away}`,
                match: newMatch,
                scoringTeam: 'home'
              });
            }
            if (newScore.away > prevScore.away) {
              newNotifications.push({
                id: `${newMatch.id}-away-${newScore.home}-${newScore.away}`,
                match: newMatch,
                scoringTeam: 'away'
              });
            }
          }
        }
      });
    });

    // Set all new notifications at once
    if (newNotifications.length > 0) {
      console.log('Setting new batch of notifications:', newNotifications);
      setGoalNotifications(newNotifications);
    }

    return newState;
  });

  } catch (error) {
    console.error('Error in soft update:', error);
  } finally {
    setIsRefreshing(false);
  }
}, [currentDate, userTimeZone]);


  // Part 5: Main Data Fetching Function
const fetchMatches = useCallback(async (date) => {
  setIsLoading(true);
  let formattedDate;

  try {
    formattedDate = format(zonedTimeToUtc(date, userTimeZone), 'yyyy-MM-dd');
    const response = await api.fetchMatches(formattedDate);
    
    const groupedMatches = response.data.matches.reduce((acc, match) => {
      // Convert UTC date to user's timezone
      const matchLocalDate = utcToZonedTime(parseISO(match.utcDate), userTimeZone);
      const dateKey = format(matchLocalDate, 'yyyy-MM-dd');
      const leagueKey = `${match.competition.name}_${match.competition.id}`;
      
      // Check if match is within the selected date (in user's timezone)
      const selectedStartOfDay = startOfDay(date);
      const selectedEndOfDay = endOfDay(date);
      
      if (matchLocalDate >= selectedStartOfDay && matchLocalDate <= selectedEndOfDay) {
        if (!acc[dateKey]) {
          acc[dateKey] = {};
        }
        if (!acc[dateKey][leagueKey]) {
          acc[dateKey][leagueKey] = [];
        }
        acc[dateKey][leagueKey].push({
          ...match,
          localDate: matchLocalDate
        });
      }
      
      return acc;
    }, {});

    setMatches(prevMatches => {
      const newState = {
        ...prevMatches,
        [formattedDate]: groupedMatches[formattedDate] || {}
      };
      
      // Check for goals with the new state
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
}, [userTimeZone, checkForGoals]);

  // Part 6: Effect Hooks
  useEffect(() => {
    setUserTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  useEffect(() => {
    if (userTimeZone && isInitialLoad) {
      fetchMatches(currentDate);
      fetchAccuracyData();
      setIsInitialLoad(false);
    }
  }, [currentDate, userTimeZone, fetchMatches, fetchAccuracyData, isInitialLoad]);

  useEffect(() => {
    if (!isLoading && !isInitialLoad && !isManualTabSelect) {
      const liveMatchDate = findDateWithLiveMatches();
      if (liveMatchDate) {
        setCurrentDate(new Date(liveMatchDate));
        setActiveTab('live');
      } else {
        const currentDateMatches = matches[currentDateKey];
        if (currentDateMatches) {
          const appropriateTab = determineActiveTab(currentDateMatches);
          setActiveTab(appropriateTab);
        }
      }
    }
  }, [matches, findDateWithLiveMatches, determineActiveTab, currentDateKey, isManualTabSelect, isLoading, isInitialLoad]);

useEffect(() => {
  const pollInterval = setInterval(() => {
    if (!isLoading) {
      softUpdateMatches();
    }
  }, 30000);

  return () => clearInterval(pollInterval);
}, [softUpdateMatches, isLoading]);

  
  // Part 7: Event Handlers
  const handleTabChange = useCallback((newTab) => {
    setIsManualTabSelect(true);
    if (newTab === 'live') {
      const liveMatchDate = findDateWithLiveMatches();
      if (liveMatchDate) {
        setCurrentDate(new Date(liveMatchDate));
      } else {
        setCurrentDate(new Date());
      }
    }
    setActiveTab(newTab);
  }, [findDateWithLiveMatches]);

  const handleDateChange = useCallback((days) => {
    setIsManualTabSelect(true);
    const newDate = days > 0 ? addDays(currentDate, days) : subDays(currentDate, Math.abs(days));
    const formattedNewDate = format(newDate, 'yyyy-MM-dd');
    
    fetchMatches(newDate);
    setCurrentDate(newDate);
    setActiveTab('scheduled');
    setSelectedContinent('All');
  }, [currentDate, fetchMatches]);

  const handleVote = async (matchId, vote) => {
    try {
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

// Part 8: Utility Functions
  const getLeagueContinent = (leagueId) => {
    for (const [continent, leagues] of Object.entries(continentalLeagues)) {
      if (leagues.includes(leagueId)) {
        return continent;
      }
    }
    return 'Other';
  };

  const toggleLeague = (leagueKey) => {
    setCollapsedLeagues(prev => ({
      ...prev,
      [leagueKey]: !prev[leagueKey]
    }));
  };

  const formatMatchDate = (date) => {
    return format(date, 'HH:mm');
  };

  // Part 9: Match Status and Voting Components
  const renderMatchStatus = (match) => {
    const statusStyle = (status) => {
      switch (status) {
        case 'FINISHED': return 'bg-gray-500 text-white';
        case 'IN_PLAY':
        case 'HALFTIME':
        case 'LIVE': return 'bg-green-500 text-white';
        case 'TIMED':
        case 'SCHEDULED': return '';
        default: return 'bg-gray-200 text-gray-800';
      }
    };

    const getMatchMinute = (match) => {
      if (match.status === 'TIMED') return '';
      if (!match.minute) return match.status;
      
      switch (match.status) {
        case 'IN_PLAY': return `${match.minute}'`;
        case 'HALFTIME': return 'HT';
        case 'PAUSED': return `${match.minute}' (Paused)`;
        default: return match.status;
      }
    };

    const isLiveStatus = ['IN_PLAY', 'HALFTIME', 'PAUSED', 'LIVE'].includes(match.status);

    if (match.status === 'TIMED') {
      return null;
    }

    return (
      <span 
        className={`
          inline-block px-1 py-0.5 rounded text-xs font-medium 
          ${statusStyle(match.status)}
          ${isLiveStatus ? 'animate-pulse' : ''}
        `}
      >
        {getMatchMinute(match)}
      </span>
    );
  };

  const renderVoteButtons = useCallback((match, isLiveTab) => {
    // Don't show the vote bar visualization on live tab
    if (isLiveTab) return null;
  
    const totalVotes = match.voteCounts.home + match.voteCounts.draw + match.voteCounts.away;
    
    const getPercentage = (voteCount) => {
      return totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
    };
  
    const homePercent = getPercentage(match.voteCounts.home);
    const drawPercent = getPercentage(match.voteCounts.draw);
    const awayPercent = getPercentage(match.voteCounts.away);
    
    return (
      <div className="mt-2">
        <div className="w-1/2 mx-auto">
          <div className="flex justify-between px-1 text-xs text-gray-600">
            <span>{homePercent}%</span>
            <span>{drawPercent}%</span>
            <span>{awayPercent}%</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden flex">
            <div 
              className="bg-blue-500 transition-all duration-500 hover:brightness-110"
              style={{ width: `${homePercent}%` }}
            />
            <div 
              className="bg-yellow-500 transition-all duration-500 hover:brightness-110"
              style={{ width: `${drawPercent}%` }}
            />
            <div 
              className="bg-red-500 transition-all duration-500 hover:brightness-110"
              style={{ width: `${awayPercent}%` }}
            />
          </div>
        </div>
      </div>
    );
  }, []);
  

  // Part 10: Predictions Component
  const renderPredictions = useCallback((match, isLiveTab) => {
    const getTeamPrediction = (prediction) => {
      switch(prediction) {
        case 'HOME_TEAM':
          return (
            <>
              {match.homeTeam.name} <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="w-3 h-3 inline-block ml-0.5" />
            </>
          );
        case 'AWAY_TEAM':
          return (
            <>
              {match.awayTeam.name} <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="w-3 h-3 inline-block ml-0.5" />
            </>
          );
        case 'DRAW':
          return 'Draw';
        default:
          return 'No prediction';
      }
    };
  
    const getHighestVotePercentage = () => {
      const totalVotes = match.voteCounts.home + match.voteCounts.draw + match.voteCounts.away;
      
      if (totalVotes === 0) return null;
      
      const getPercentage = (voteCount) => {
        return totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
      };
  
      const homePercent = getPercentage(match.voteCounts.home);
      const drawPercent = getPercentage(match.voteCounts.draw);
      const awayPercent = getPercentage(match.voteCounts.away);
  
      const highest = Math.max(homePercent, drawPercent, awayPercent);
      
      if (highest === 0) return null;
      return `(${highest}%)`;
    };
  
    const getUserVote = () => {
      if (!match.userVote) return null;
  
      let highlightColor = 'bg-yellow-100';
      if (match.status === 'FINISHED') {
        const homeScore = match.score.fullTime.home;
        const awayScore = match.score.fullTime.away;
        const result = homeScore > awayScore ? 'home' : (awayScore > homeScore ? 'away' : 'draw');
        highlightColor = match.userVote === result ? 'bg-green-100' : 'bg-red-100';
      }
  
      let voteContent;
      switch(match.userVote) {
        case 'home':
          voteContent = (
            <>
              {match.homeTeam.name} <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="w-3 h-3 inline-block ml-0.5" />
            </>
          );
          break;
        case 'away':
          voteContent = (
            <>
              {match.awayTeam.name} <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="w-3 h-3 inline-block ml-0.5" />
            </>
          );
          break;
        case 'draw':
          voteContent = 'Draw';
          break;
        default:
          return null;
      }
  
      return (
        <div className="flex justify-center mt-1">
          <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded ${highlightColor}`}>
            Your vote: {voteContent}
          </span>
        </div>
      );
    };
  
    const isPredictionCorrect = (prediction) => {
      if (match.status !== 'FINISHED') return false;
      const homeScore = match.score.fullTime.home;
      const awayScore = match.score.fullTime.away;
      const actualResult = homeScore > awayScore ? 'HOME_TEAM' : (awayScore > homeScore ? 'AWAY_TEAM' : 'DRAW');
      return prediction === actualResult;
    };
  
    return (
      <div className="mt-1 text-xs space-y-1">
        <div className="flex justify-between">
          <p className={`p-0.5 rounded ${match.status === 'FINISHED' ? (isPredictionCorrect(match.fanPrediction) ? 'bg-green-100' : 'bg-red-100') : ''}`}>
            Fans: {match.fanPrediction ? getTeamPrediction(match.fanPrediction) : 'No votes yet'}
            {isLiveTab && match.fanPrediction && (
              <span className="text-gray-500 ml-1">{getHighestVotePercentage()}</span>
            )}
          </p>
          {match.aiPrediction && (
            <p className={`p-0.5 rounded ${match.status === 'FINISHED' ? (isPredictionCorrect(match.aiPrediction) ? 'bg-green-100' : 'bg-red-100') : ''}`}>
              AI: {getTeamPrediction(match.aiPrediction)}
            </p>
          )}
        </div>
        {getUserVote()}
      </div>
    );
  }, []);

// Part 11: Match List Filtering and Rendering
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

  // Part 12: League Sorting and Rendering
  const sortedLeagues = (matches) => Object.entries(matches).sort((a, b) => {
    const [leagueKeyA, matchesA] = a;
    const [leagueKeyB, matchesB] = b;
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
  });

  const renderMatches = (matches) => {
    return sortedLeagues(matches).map(([leagueKey, competitionMatches]) => {
      const [leagueName, leagueId] = leagueKey.split('_');
      return (
<div key={leagueKey} className={`${!collapsedLeagues[leagueKey] ? 'mb-2' : ''}`}>
<button 
  className="w-full text-left flex items-center justify-between bg-indigo-50 rounded-lg p-1.5 hover:bg-indigo-100 transition-colors duration-200 relative"
  onClick={() => toggleLeague(leagueKey)}
>
  <LeagueHeader 
    leagueName={leagueName}
    leagueEmblem={competitionMatches[0].competition.emblem}
    country={competitionMatches[0].competition.country}
  />
  <span className="ml-2 text-indigo-400 text-xs">{collapsedLeagues[leagueKey] ? '▼' : '▲'}</span>
</button>
          
          {!collapsedLeagues[leagueKey] && (
  <div className="space-y-2"> {/* Changed from grid to vertical stack */}
    {competitionMatches.map(match => (
      <MatchBox 
        key={match.id} 
        match={match}
        onVote={handleVote}
        isLiveTab={activeTab === 'live'}
      />
    ))}
  </div>
)}
        </div>
      );
    });
  };
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'live':
        return Object.keys(liveMatches).length > 0 ? renderMatches(liveMatches) : (
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

  // Part 13: Component Return
return (
  <div className="max-w-3xl mx-auto px-2">
    <NotificationQueue 
      notifications={goalNotifications}
      onDismiss={handleNotificationDismiss}
    />
    
    <AccuracyComparison fanAccuracy={accuracyData.fanAccuracy} aiAccuracy={accuracyData.aiAccuracy} />
    
    {/* Only show NextMatchCountdown if there are no live matches */}
    {Object.keys(liveMatches).length === 0 && (
      <NextMatchCountdown scheduledMatches={scheduledMatches} />
    )}

{/* Match Voting Box */}
<div className="mb-8">
<AnimatedVotingBox 
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
  user={user}
/>
</div>

    {isLoading ? (
      <LoadingLogo />
    ) : (
      <>
        <div className="flex flex-col space-y-4 mb-4">
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

          <div className="flex justify-between items-center my-4 sm:px-4 md:px-12 lg:px-20">
            <div className="sm:flex-grow sm:flex sm:justify-end sm:pr-4">
              <CustomButton onClick={() => handleDateChange(-1)}>
                Previous Day
              </CustomButton>
            </div>
            <h2 className="text-sm sm:text-lg font-bold text-gray-800 sm:flex-shrink-0">
              {format(currentDate, 'dd MMM yyyy')}
            </h2>
            <div className="sm:flex-grow sm:flex sm:justify-start sm:pl-4">
              <CustomButton onClick={() => handleDateChange(1)}>
                Next Day
              </CustomButton>
            </div>
          </div>
        <div className="bg-white rounded-lg shadow-md p-2 sm:p-4">
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