import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useMatchData } from '../../hooks/useMatchData';
import { useMatchNotifications } from '../../hooks/useMatchNotifications';
import { useMatchTabManagement } from '../../hooks/useMatchTabManagement';
import { filterMatchesByStatus, extractLeagues, getDateForSelection } from '../../utils/matchUtils';
import { MatchFilters } from './MatchFilters';
import NotificationQueue from '../NotificationQueue';
import LoadingLogo from '../LoadingLogo';
import api from '../../api';
import _ from 'lodash';
import APIStyleMatches from '../APIStyleMatches';
import TodaysOdds from '../TodaysOdds';

// Custom hook to expose match data to other components
export const useMatchesData = () => {
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Create a new instance of the hook
  const {
    matches,
    allLiveMatches,
    isLoading,
    isInitialDataLoaded,
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
};

const Matches = ({ user, onOpenAuthModal, disableSidebars = false, selectedLeague = null }) => {
  // Get navigate function for redirection
  const navigate = useNavigate();
  
  // State declarations
  const [selectedDay, setSelectedDay] = useState('today');
  const [collapsedLeagues, setCollapsedLeagues] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [predictionFilter, setPredictionFilter] = useState('all'); // Options: 'all', 'correct', 'incorrect'
  
  const navigateToOddsPage = useCallback(() => {
    if (!disableSidebars) {
      navigate('/odds');
    }
  }, [navigate, disableSidebars]);

  // Time zone setup
  const userTimeZone = useMemo(() => 
    Intl.DateTimeFormat().resolvedOptions().timeZone, 
    []
  );  

  // Custom hooks
  const {
    matches,
    allLiveMatches,
    isLoading,
    fetchMatches,
    fetchLiveMatches,
    fetchMatchesSoft,
    fetchLiveMatchesSoft,
    setMatches,
    setAllLiveMatches,
    initializeData
  } = useMatchData(userTimeZone);
    
  const {
    goalNotifications,
    checkForGoals,
    handleNotificationDismiss
  } = useMatchNotifications();

  // Derived state
  const selectedDate = getDateForSelection(selectedDay);
  const currentDateKey = format(selectedDate, 'yyyy-MM-dd');
  const matchesForCurrentDate = (matches && matches[currentDateKey]) || {};
  const filteredMatches = matchesForCurrentDate || {};
    
  const liveMatches = filterMatchesByStatus(filteredMatches, ['IN_PLAY', 'HALFTIME', 'PAUSED', 'LIVE'], userTimeZone, selectedDate);
  const finishedMatches = filterMatchesByStatus(filteredMatches, ['FINISHED'], userTimeZone, selectedDate);
  const scheduledMatches = filterMatchesByStatus(filteredMatches, ['TIMED', 'SCHEDULED'], userTimeZone, selectedDate);

  const determineInitialTab = useCallback(() => {
    // First priority: Live matches
    if (allLiveMatches && Object.keys(allLiveMatches).length > 0) {
      return 'live';
    }
    
    // Second priority: Scheduled matches
    if (scheduledMatches && Object.keys(scheduledMatches).length > 0) {
      return 'scheduled';
    }
    
    // Third priority: Finished matches
    if (finishedMatches && Object.keys(finishedMatches).length > 0) {
      return 'finished';
    }
    
    // Fallback to scheduled (even if empty)
    return 'scheduled';
  }, [allLiveMatches, scheduledMatches, finishedMatches]);
      
  const {
    activeTab,
    handleTabChange,
    determineAppropriateTab,
    setActiveTab,
    isManualTabSelect,
    setIsManualTabSelect
  } = useMatchTabManagement(allLiveMatches, scheduledMatches, finishedMatches);

  // Optimized soft update logic
  const softUpdateMatches = useCallback(async () => {
    if (isLoading) return;

    try {
      const [newLiveMatches, newMatchesData] = await Promise.all([
        fetchLiveMatchesSoft(),
        fetchMatchesSoft(selectedDate)
      ]);

      // Optimized match comparison function
      const hasMatchChanged = (newMatch, oldMatch) => {
        if (!oldMatch) return true;
        
        const fieldsToCompare = [
          'status',
          'score.fullTime.home',
          'score.fullTime.away',
          'minute',
          'voteCounts.home',
          'voteCounts.away',
          'voteCounts.draw'
        ];

        return fieldsToCompare.some(field => 
          !_.isEqual(_.get(newMatch, field), _.get(oldMatch, field))
        );
      };

      // Handle live matches update
      if (newLiveMatches) {
        setAllLiveMatches(prev => {
          const updatedMatches = {};
          let hasAnyChanges = false;

          Object.entries(newLiveMatches).forEach(([leagueId, matches]) => {
            updatedMatches[leagueId] = matches.map(newMatch => {
              const oldMatch = prev[leagueId]?.find(m => m.id === newMatch.id);
              if (!hasMatchChanged(newMatch, oldMatch)) {
                return oldMatch; // Keep reference if unchanged
              }
              hasAnyChanges = true;
              return {
                ...oldMatch,
                ...newMatch,
                // Preserve certain fields from old match if they exist
                localDate: oldMatch?.localDate || newMatch.localDate,
                userVote: oldMatch?.userVote || newMatch.userVote
              };
            });
          });

          return hasAnyChanges ? updatedMatches : prev;
        });
      }

      // Handle regular matches update
      if (newMatchesData) {
        setMatches(prev => {
          const updatedMatches = { ...prev };
          let hasChanges = false;

          Object.entries(newMatchesData).forEach(([leagueId, matches]) => {
            if (!updatedMatches[currentDateKey]) {
              updatedMatches[currentDateKey] = {};
            }
            if (!updatedMatches[currentDateKey][leagueId]) {
              updatedMatches[currentDateKey][leagueId] = [];
            }

            updatedMatches[currentDateKey][leagueId] = matches.map(newMatch => {
              const oldMatch = prev[currentDateKey]?.[leagueId]?.find(m => m.id === newMatch.id);
              if (!hasMatchChanged(newMatch, oldMatch)) {
                return oldMatch;
              }
              hasChanges = true;
              return {
                ...oldMatch,
                ...newMatch,
                localDate: oldMatch?.localDate || newMatch.localDate,
                userVote: oldMatch?.userVote || newMatch.userVote
              };
            });
          });

          return hasChanges ? updatedMatches : prev;
        });
      }

      // Check for goals after updates
      const prevState = {
        ...matches,
        live: allLiveMatches
      };

      const newState = {
        ...matches,
        [currentDateKey]: newMatchesData,
        live: newLiveMatches
      };

      checkForGoals(newState, prevState);

    } catch (error) {
      console.error('Error in soft update:', error);
    }
  }, [
    isLoading,
    fetchLiveMatchesSoft,
    fetchMatchesSoft,
    selectedDate,
    currentDateKey,
    matches,
    allLiveMatches,
    checkForGoals
  ]);

    const getAllTodayMatches = useCallback(() => {
    if (disableSidebars) return {};
    
    // Original implementation
    const combinedMatches = {};
    
    // Helper function to merge matches from a source into combinedMatches
    const mergeMatches = (source) => {
      Object.entries(source || {}).forEach(([leagueId, leagueMatches]) => {
        if (!combinedMatches[leagueId]) {
          combinedMatches[leagueId] = [];
        }
        combinedMatches[leagueId] = [...combinedMatches[leagueId], ...leagueMatches];
      });
    };
  
    // Merge matches from all three sources
    mergeMatches(allLiveMatches);
    mergeMatches(finishedMatches);
    mergeMatches(scheduledMatches);
    
    return combinedMatches;
  }, [allLiveMatches, finishedMatches, scheduledMatches, disableSidebars]);


  // Effects
  useEffect(() => {
    if (!userTimeZone || isInitialized) return;
    
    const initialize = async () => {
      try {
        // initializeData already handles loading state internally
        await initializeData(); // Initial data load
        
        // Determine and set the most appropriate tab after data is loaded
        const initialTab = determineInitialTab();
        setActiveTab(initialTab);
        setIsInitialized(true);
        
        // Immediately perform a soft update to get latest data
        await softUpdateMatches();
      } catch (error) {
        console.error('Error during initialization:', error);
        setIsInitialized(true); // Still mark as initialized to prevent infinite retries
      }
    };
  
    initialize();
  }, [userTimeZone, isInitialized, initializeData, determineInitialTab, setActiveTab, softUpdateMatches]);
                
  useEffect(() => {
    if (!isInitialized) return;

    const updateTimer = setInterval(softUpdateMatches, activeTab === 'live' ? 15000 : 30000);
    return () => clearInterval(updateTimer);
  }, [isInitialized, softUpdateMatches, activeTab]);

  const handleDayChange = useCallback((newDay) => {
    setSelectedDay(newDay);
    const appropriateTab = determineAppropriateTab(newDay);
    setActiveTab(appropriateTab);
    setIsManualTabSelect(false);
  }, [determineAppropriateTab, setActiveTab, setIsManualTabSelect]);

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

  const getCurrentMatches = useCallback(() => {
    let matches;
    switch (activeTab) {
      case 'live':
        matches = allLiveMatches || {};
        break;
      case 'finished':
        matches = finishedMatches || {};
        break;
      case 'scheduled':
        matches = scheduledMatches || {};
        break;
      default:
        matches = {};
    }
  
    // If no league is selected, return all matches
    if (!selectedLeague) {
      return matches;
    }
  
    // Filter matches for the selected league
    return Object.entries(matches).reduce((filtered, [leagueId, leagueMatches]) => {
      if (leagueId === selectedLeague) {  // Use exact match instead of includes
        filtered[leagueId] = leagueMatches;
      }
      return filtered;
    }, {});
  }, [activeTab, allLiveMatches, finishedMatches, scheduledMatches, selectedLeague]);

  const getFilteredMatches = useCallback(() => {
    let currentMatches = getCurrentMatches();
        
    // Only apply filter when showing finished matches and the toggle is on
    if (activeTab === 'finished' && predictionFilter !== 'all') {
      const filteredMatches = {};
      
      Object.entries(currentMatches).forEach(([leagueKey, leagueMatches]) => {
        // Filter matches based on prediction accuracy
        const filteredLeagueMatches = leagueMatches.filter(match => {
          const isPredictionCorrect = (
            (match.aiPrediction === 'HOME_TEAM' && match.score.fullTime.home > match.score.fullTime.away) ||
            (match.aiPrediction === 'AWAY_TEAM' && match.score.fullTime.away > match.score.fullTime.home) ||
            (match.aiPrediction === 'DRAW' && match.score.fullTime.home === match.score.fullTime.away)
          );
          
          // Return matches based on the selected filter
          return predictionFilter === 'correct' ? isPredictionCorrect : !isPredictionCorrect;
        });
        
        // Only include league if it has matches after filtering
        if (filteredLeagueMatches.length > 0) {
          filteredMatches[leagueKey] = filteredLeagueMatches;
        }
      });
      
      return filteredMatches;
    }
    
    // Return unfiltered matches if not on finished tab or filter is set to 'all'
    return currentMatches;
  }, [activeTab, getCurrentMatches, predictionFilter]);  
  
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-2">
        <LoadingLogo />
      </div>
    );
  }
      
  return (
    <div className="max-w-6xl mx-auto px-2">
      <NotificationQueue 
        notifications={goalNotifications}
        onDismiss={handleNotificationDismiss}
      />
      
      <div className="relative flex flex-col items-center mb-24">
        <MatchFilters
          selectedDay={selectedDay}
          setSelectedDay={handleDayChange}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          hasAnyLiveMatches={allLiveMatches ? Object.keys(allLiveMatches).length > 0 : false}
          getDateForSelection={getDateForSelection}
          predictionFilter={predictionFilter}
          setPredictionFilter={setPredictionFilter}
        />

        <div className="w-full max-w-5xl relative">
          <div className="flex relative pb-8">
            {/* Main Content Area */}
            <div className="w-full">
              {Object.keys(getCurrentMatches()).length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  {activeTab === 'live' && "No Live matches at the moment"}
                  {activeTab === 'finished' && "No Finished matches at the moment"}
                  {activeTab === 'scheduled' && "No Scheduled matches at the moment"}
                </div>
              ) : (
                <APIStyleMatches
                  matches={getFilteredMatches()}
                  activeTab={activeTab}
                  collapsedLeagues={collapsedLeagues}
                  onVote={handleVote}
                  selectedLeague={selectedLeague}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Matches;