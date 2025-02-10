import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { useMatchData } from '../../hooks/useMatchData';
import { useMatchNotifications } from '../../hooks/useMatchNotifications';
import { useMatchTabManagement } from '../../hooks/useMatchTabManagement';
import { filterMatchesByStatus, extractLeagues, getDateForSelection } from '../../utils/matchUtils';
import { MatchFilters } from './MatchFilters';
import { LeagueListing } from './LeagueListing';
import NotificationQueue from '../NotificationQueue';
import ModernAccuracyComparison from '../AccuracyComparison';
import LoadingLogo from '../LoadingLogo';
import LeagueFilter from '../LeagueFilter';
import api from '../../api';

const Matches = ({ user, onOpenAuthModal }) => {
  // Time zone setup
  const userTimeZone = useMemo(() => 
    Intl.DateTimeFormat().resolvedOptions().timeZone, 
    []
  );

  // State
  const [selectedDay, setSelectedDay] = useState('today');
  const [collapsedLeagues, setCollapsedLeagues] = useState({});
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Custom hooks
  const {
    matches,
    allLiveMatches,
    isLoading,
    imagesLoaded,
    fetchMatches,
    fetchLiveMatches,
    setMatches
  } = useMatchData(userTimeZone);

  const {
    goalNotifications,
    checkForGoals,
    handleNotificationDismiss
  } = useMatchNotifications();

  // Derived state
  const selectedDate = getDateForSelection(selectedDay);
  const currentDateKey = format(selectedDate, 'yyyy-MM-dd');
  const matchesForCurrentDate = matches[currentDateKey] || {};

  const filteredMatches = matchesForCurrentDate;
  const liveMatches = filterMatchesByStatus(filteredMatches, ['IN_PLAY', 'HALFTIME', 'PAUSED', 'LIVE'], userTimeZone, selectedDate);
  const finishedMatches = filterMatchesByStatus(filteredMatches, ['FINISHED'], userTimeZone, selectedDate);
  const scheduledMatches = filterMatchesByStatus(filteredMatches, ['TIMED', 'SCHEDULED'], userTimeZone, selectedDate);

  const {
    activeTab,
    handleTabChange,
    determineAppropriateTab,
    setActiveTab,
    isManualTabSelect,     // Add this
    setIsManualTabSelect   // Add this
  } = useMatchTabManagement(allLiveMatches, scheduledMatches, finishedMatches);
      
  // Callbacks
  const handleLeagueSelect = useCallback((leagueId) => {
    setSelectedLeague(leagueId);
    setActiveTab(determineAppropriateTab(leagueId));
  }, [determineAppropriateTab]);

  const toggleLeague = useCallback((leagueKey) => {
    setCollapsedLeagues(prev => ({
      ...prev,
      [leagueKey]: !prev[leagueKey]
    }));
  }, []);

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

  const handleDayChange = useCallback((newDay) => {
    setSelectedDay(newDay);
    // Automatically set the appropriate tab based on the selected day
    const appropriateTab = determineAppropriateTab(newDay);
    setActiveTab(appropriateTab);
    setIsManualTabSelect(false); // Reset manual selection when changing days
  }, [determineAppropriateTab]);
  
  // Update the useEffect that handles initial data loading and tab selection
  useEffect(() => {
    if (!isInitialized || isLoading) return;
  
    // Set appropriate tab based on current day and available matches
    if (!isManualTabSelect) {
      const appropriateTab = determineAppropriateTab(selectedDay);
      setActiveTab(appropriateTab);
    }
  }, [
    isInitialized,
    isLoading,
    isManualTabSelect,
    selectedDay,
    determineAppropriateTab,
    allLiveMatches,
    scheduledMatches,
    finishedMatches
  ]);
  

  // Effects
  useEffect(() => {
    const initialize = async () => {
      if (!userTimeZone || isInitialized) return;
      
      try {
        await Promise.all([
          fetchLiveMatches(),
          fetchMatches(getDateForSelection('today')),
          fetchMatches(getDateForSelection('yesterday')),
          fetchMatches(getDateForSelection('tomorrow'))
        ]);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error during initialization:', error);
      }
    };
  
    initialize();
  }, [userTimeZone, isInitialized, fetchLiveMatches, fetchMatches]);
  
  useEffect(() => {
    if (!isInitialized) return;

    const updateTimer = setInterval(() => {
      if (!isLoading) {
        fetchLiveMatches();
        fetchMatches(selectedDate);
      }
    }, activeTab === 'live' ? 15000 : 30000);

    return () => clearInterval(updateTimer);
  }, [isInitialized, isLoading, activeTab, selectedDate, fetchLiveMatches, fetchMatches]);

  useEffect(() => {
    if (!isInitialized || !userTimeZone) return;
    
    const date = getDateForSelection(selectedDay);
    fetchMatches(date);
  }, [selectedDay, isInitialized, userTimeZone, fetchMatches]);
  

  // Get current matches based on active tab
  const getCurrentMatches = useCallback(() => {
    switch (activeTab) {
      case 'live':
        return allLiveMatches;
      case 'finished':
        return finishedMatches;
      case 'scheduled':
        return scheduledMatches;
      default:
        return {};
    }
  }, [activeTab, allLiveMatches, finishedMatches, scheduledMatches]);

  // Render
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
        <div className="relative flex flex-col items-center mb-24">
<MatchFilters
  selectedDay={selectedDay}
  setSelectedDay={handleDayChange}  // Use the new handler here
  activeTab={activeTab}
  onTabChange={handleTabChange}
  hasAnyLiveMatches={Object.keys(allLiveMatches).length > 0}
  getDateForSelection={getDateForSelection}
/>

          <div className="w-full max-w-5xl relative">
            <div className="flex relative pb-8">
              <div className="hidden md:block absolute -left-36 top-0 w-[280px]">
                <div className="sticky top-4 pb-24">
                  <LeagueFilter
                    leagues={extractLeagues(matchesForCurrentDate, allLiveMatches)}
                    selectedLeague={selectedLeague}
                    onLeagueSelect={handleLeagueSelect}
                    isMobileOpen={isMobileFilterOpen}
                    onClose={() => setIsMobileFilterOpen(false)}
                  />
                </div>
                </div>
            </div>

            {/* Matches Content */}
            <div className="w-full min-h-[500px]">
              <div className="max-w-md mx-auto">
              <div className="md:hidden">
  <button
    onClick={() => setIsMobileFilterOpen(true)}
    className="fixed left-4 bottom-4 w-12 h-12 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-colors hover:bg-blue-700 z-50"
    aria-label="Filter Leagues"
  >
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="w-5 h-5"
    >
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  </button>
</div>

                {/* League Listing */}
                <LeagueListing
                  matches={getCurrentMatches()}
                  collapsedLeagues={collapsedLeagues}
                  onLeagueToggle={toggleLeague}
                  onVote={handleVote}
                  selectedLeague={selectedLeague}
                  activeTab={activeTab}
                />

                {/* Mobile padding */}
                <div className="h-16 md:hidden"></div>
              </div>
            </div>
          </div>

          {/* Mobile League Filter Modal */}
          <div className="md:hidden">
            <LeagueFilter
              leagues={extractLeagues(matchesForCurrentDate, allLiveMatches)}
              selectedLeague={selectedLeague}
              onLeagueSelect={handleLeagueSelect}
              isMobileOpen={isMobileFilterOpen}
              onClose={() => setIsMobileFilterOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Matches;