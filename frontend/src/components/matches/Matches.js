import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import useMatchData from '../../hooks/useMatchData'; // Import as default
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

const Matches = ({ user, onOpenAuthModal, disableSidebars = false, selectedLeague = null }) => {
  // Get navigate function for redirection
  const navigate = useNavigate();
  
  // State declarations
  const [selectedDay, setSelectedDay] = useState('today');
  const [collapsedLeagues, setCollapsedLeagues] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [predictionFilter, setPredictionFilter] = useState('all');
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  
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
    
  const liveMatches = useMemo(() => 
    allLiveMatches || {}, 
    [allLiveMatches]
  );
  
  const finishedMatches = useMemo(() => 
    filterMatchesByStatus(filteredMatches, ['FINISHED'], userTimeZone, selectedDate),
    [filteredMatches, userTimeZone, selectedDate]
  );
  
  const scheduledMatches = useMemo(() => 
    filterMatchesByStatus(filteredMatches, ['TIMED', 'SCHEDULED'], userTimeZone, selectedDate),
    [filteredMatches, userTimeZone, selectedDate]
  );

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

  // Progressive loading implementation
  useEffect(() => {
    if (!userTimeZone || isInitialized) return;
    
    const initialize = async () => {
      try {
        // Show initial content quickly
        setIsInitialized(true);
        
        // Load data in the background
        await initializeData();
        
        // Determine and set the most appropriate tab after data is loaded
        const initialTab = determineInitialTab();
        setActiveTab(initialTab);
        
        // Immediately perform a soft update to get latest data
        await softUpdateMatches();
      } catch (error) {
        console.error('Error during initialization:', error);
      }
    };
  
    initialize();
  }, [userTimeZone, isInitialized, initializeData, determineInitialTab, setActiveTab]);
  
  // Optimized soft update logic
  const softUpdateMatches = useCallback(async () => {
    if (isLoading || isRefreshingData) return;

    setIsRefreshingData(true);
    
    try {
      // Prioritize updates based on active tab
      if (activeTab === 'live') {
        // For live tab, update live matches first, then regular matches
        const newLiveMatches = await fetchLiveMatchesSoft();
        if (newLiveMatches) {
          setAllLiveMatches(newLiveMatches);
        }
        
        // Then update regular matches
        const newMatchesData = await fetchMatchesSoft(selectedDate);
        if (newMatchesData) {
          setMatches(prev => ({
            ...prev,
            [currentDateKey]: newMatchesData
          }));
        }
      } else {
        // For other tabs, update both in parallel
        const [newLiveMatches, newMatchesData] = await Promise.all([
          fetchLiveMatchesSoft(),
          fetchMatchesSoft(selectedDate)
        ]);

        if (newLiveMatches) {
          setAllLiveMatches(newLiveMatches);
        }
        
        if (newMatchesData) {
          setMatches(prev => ({
            ...prev,
            [currentDateKey]: newMatchesData
          }));
        }
      }

      // Check for goals after updates
      const prevState = {
        ...matches,
        live: allLiveMatches
      };

      const newState = {
        ...matches,
        [currentDateKey]: await fetchMatchesSoft(selectedDate),
        live: await fetchLiveMatchesSoft()
      };

      checkForGoals(newState, prevState);

    } catch (error) {
      console.error('Error in soft update:', error);
    } finally {
      setIsRefreshingData(false);
    }
  }, [
    isLoading,
    isRefreshingData,
    fetchLiveMatchesSoft,
    fetchMatchesSoft,
    selectedDate,
    currentDateKey,
    matches,
    allLiveMatches,
    checkForGoals,
    activeTab,
    setAllLiveMatches,
    setMatches
  ]);

  // Periodic updates
  useEffect(() => {
    if (!isInitialized) return;

    const updateTimer = setInterval(softUpdateMatches, activeTab === 'live' ? 15000 : 30000);
    return () => clearInterval(updateTimer);
  }, [isInitialized, softUpdateMatches, activeTab]);

  // Handle day change
  const handleDayChange = useCallback((newDay) => {
    setSelectedDay(newDay);
    const appropriateTab = determineAppropriateTab(newDay);
    setActiveTab(appropriateTab);
    setIsManualTabSelect(false);
  }, [determineAppropriateTab, setActiveTab, setIsManualTabSelect]);

  // Vote handler
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

  // Get current matches based on active tab
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

  // Apply prediction filtering for finished matches
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
  
  // Show loading state
  if (isLoading && !isInitialized) {
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
          {isRefreshingData && isInitialized && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-6 flex items-center justify-center bg-emerald-600 text-white text-xs px-3 py-1 rounded-full z-10">
              <div className="w-3 h-3 mr-1 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              Updating...
            </div>
          )}
          
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