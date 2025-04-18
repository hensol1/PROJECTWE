import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import useMatchData from '../../hooks/useMatchData';
import { useMatchNotifications } from '../../hooks/useMatchNotifications';
import { filterMatchesByStatus, getDateForSelection } from '../../utils/matchUtils';
import { MatchFilters } from './MatchFilters';
import NotificationQueue from '../NotificationQueue';
// Removed LoadingLogo import as we'll use a custom spinner
import api from '../../api';
import APIStyleMatches from '../APIStyleMatches';

const Matches = ({ user, onOpenAuthModal, disableSidebars = false, selectedLeague = null }) => {
  // Get navigate function for redirection
  const navigate = useNavigate();
  
  // State declarations
  const [selectedDay, setSelectedDay] = useState('today');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [dataLoadedForCurrentDate, setDataLoadedForCurrentDate] = useState(false);
  
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
    
  // Progressive loading implementation
  useEffect(() => {
    if (!userTimeZone || isInitialized) return;
    
    const initialize = async () => {
      try {
        // Show initial content quickly
        setIsInitialized(true);
        
        // Load data in the background
        await initializeData();
        
        // Immediately perform a soft update to get latest data
        await softUpdateMatches();
        
        // Mark that data has been loaded for the current date
        setDataLoadedForCurrentDate(true);
      } catch (error) {
        console.error('Error during initialization:', error);
        // Still mark as loaded even if there was an error, to show "no matches" instead of infinite loading
        setDataLoadedForCurrentDate(true);
      }
    };
  
    initialize();
  }, [userTimeZone, isInitialized]);
  
  // Handle day change
  const handleDayChange = useCallback((newDay) => {
    setSelectedDay(newDay);
    // Reset data loaded flag when changing day
    setDataLoadedForCurrentDate(false);
    
    // Fetch data for the new day
    const newDate = getDateForSelection(newDay);
    const newDateKey = format(newDate, 'yyyy-MM-dd');
    
    // Check if we already have data for this date
    if (matches && matches[newDateKey]) {
      // We already have data for this date, mark as loaded
      setDataLoadedForCurrentDate(true);
    } else {
      // Need to fetch data for this date
      const fetchNewDayData = async () => {
        try {
          await fetchMatches(newDate);
          setDataLoadedForCurrentDate(true);
        } catch (error) {
          console.error('Error fetching data for new day:', error);
          setDataLoadedForCurrentDate(true);
        }
      };
      fetchNewDayData();
    }
  }, [matches, fetchMatches]);
  
  // Optimized soft update logic
  const softUpdateMatches = useCallback(async () => {
    if (isLoading || isRefreshingData) return;

    setIsRefreshingData(true);
    
    try {
      // Update both live matches and regular matches
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

      // Check for goals after updates
      const prevState = {
        ...matches,
        live: allLiveMatches
      };

      const newState = {
        ...matches,
        [currentDateKey]: newMatchesData || {},
        live: newLiveMatches || {}
      };

      checkForGoals(newState, prevState);
      
      // Mark that data has been loaded
      setDataLoadedForCurrentDate(true);

    } catch (error) {
      console.error('Error in soft update:', error);
      // Still mark as loaded even if there was an error
      setDataLoadedForCurrentDate(true);
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
    setAllLiveMatches,
    setMatches
  ]);

  // Periodic updates
  useEffect(() => {
    if (!isInitialized) return;

    // More frequent updates for live matches
    const updateTimer = setInterval(softUpdateMatches, 15000);
    return () => clearInterval(updateTimer);
  }, [isInitialized, softUpdateMatches]);

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

  // Combine all matches with priority ordering
  const getAllMatches = useCallback(() => {
    const combinedMatches = {};
    const liveMatches = allLiveMatches || {};
    const scheduledMatches = filterMatchesByStatus(matchesForCurrentDate, ['TIMED', 'SCHEDULED'], userTimeZone, selectedDate) || {};
    const finishedMatches = filterMatchesByStatus(matchesForCurrentDate, ['FINISHED'], userTimeZone, selectedDate) || {};
    
    // Only include live matches if we're looking at today
    if (selectedDay === 'today') {
      // 1. First add leagues with live matches
      Object.entries(liveMatches).forEach(([leagueKey, matches]) => {
        if (!combinedMatches[leagueKey]) {
          combinedMatches[leagueKey] = [];
        }
        combinedMatches[leagueKey] = [...matches];
      });
    }
    
    // 2. Add leagues with scheduled matches
    Object.entries(scheduledMatches).forEach(([leagueKey, matches]) => {
      if (!combinedMatches[leagueKey]) {
        combinedMatches[leagueKey] = [];
      }
      // Add matches that aren't already included
      const existingMatchIds = new Set(combinedMatches[leagueKey].map(m => m.id));
      const newMatches = matches.filter(m => !existingMatchIds.has(m.id));
      combinedMatches[leagueKey] = [...combinedMatches[leagueKey], ...newMatches];
    });
    
    // 3. Add leagues with finished matches
    Object.entries(finishedMatches).forEach(([leagueKey, matches]) => {
      if (!combinedMatches[leagueKey]) {
        combinedMatches[leagueKey] = [];
      }
      // Add matches that aren't already included
      const existingMatchIds = new Set(combinedMatches[leagueKey].map(m => m.id));
      const newMatches = matches.filter(m => !existingMatchIds.has(m.id));
      combinedMatches[leagueKey] = [...combinedMatches[leagueKey], ...newMatches];
    });
    
    // If league is selected, filter for that league only
    if (selectedLeague) {
      return Object.entries(combinedMatches)
        .filter(([leagueKey]) => leagueKey === selectedLeague)
        .reduce((obj, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {});
    }
    
    return combinedMatches;
  }, [allLiveMatches, matchesForCurrentDate, selectedDate, userTimeZone, selectedLeague, selectedDay]);
  
  // Show loading state for initial app load
  if (isLoading && !isInitialized) {
    return (
      <div className="max-w-6xl mx-auto px-2 flex justify-center items-center py-20">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }
      
  return (
    <div className="max-w-6xl mx-auto">
      <NotificationQueue 
        notifications={goalNotifications}
        onDismiss={handleNotificationDismiss}
      />
      
      <div className="relative flex flex-col items-center">
        {/* Tabs styled to match the matches component */}
        <MatchFilters
          selectedDay={selectedDay}
          setSelectedDay={handleDayChange}
          getDateForSelection={getDateForSelection}
        />

        {/* No margin/padding between tabs and matches */}
        <div className="w-full">
          {isRefreshingData && isInitialized && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-6 flex items-center justify-center bg-emerald-600 text-white text-xs px-3 py-1 rounded-full z-10">
              <div className="w-3 h-3 mr-1 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              Updating...
            </div>
          )}
          
          <div className="w-full">
            {(isLoading || !dataLoadedForCurrentDate) ? (
              <div className="w-full max-w-2xl mx-auto bg-[#1a1f2b] text-white rounded-b-lg shadow-lg overflow-hidden flex justify-center items-center py-16">
                <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
              </div>
            ) : Object.keys(getAllMatches()).length === 0 ? (
              <div className="w-full max-w-2xl mx-auto bg-[#1a1f2b] text-white rounded-b-lg shadow-lg overflow-hidden">
                <div className="text-center py-10 text-gray-500">
                  No matches found for this day
                </div>
              </div>
            ) : (
              <div className="rounded-b-lg overflow-hidden"> {/* This ensures rounded corners only at the bottom */}
                <APIStyleMatches
                  matches={getAllMatches()}
                  onVote={handleVote}
                  selectedLeague={selectedLeague}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Matches;