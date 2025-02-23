import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { useMatchData } from '../../hooks/useMatchData';
import { useMatchNotifications } from '../../hooks/useMatchNotifications';
import { useMatchTabManagement } from '../../hooks/useMatchTabManagement';
import { filterMatchesByStatus, extractLeagues, getDateForSelection } from '../../utils/matchUtils';
import { MatchFilters } from './MatchFilters';
import NotificationQueue from '../NotificationQueue';
import ModernAccuracyComparison from '../AccuracyComparison';
import LoadingLogo from '../LoadingLogo';
import LeagueFilter from '../LeagueFilter';
import api from '../../api';
import _ from 'lodash';
import TodaysOdds from '../TodaysOdds';
import APIStyleMatches from '../APIStyleMatches';


const Matches = ({ user, onOpenAuthModal }) => {
  // State declarations
  const [selectedDay, setSelectedDay] = useState('today');
  const [collapsedLeagues, setCollapsedLeagues] = useState({});
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

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
    initializeData  // Add this line
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
    // Add null checks
    if (!allLiveMatches) return 'scheduled';
    if (Object.keys(allLiveMatches || {}).length > 0) {
      return 'live';
    }
    if (Object.keys(scheduledMatches || {}).length > 0) {
      return 'scheduled';
    }
    if (Object.keys(finishedMatches || {}).length > 0) {
      return 'finished';
    }
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

  // Effects
  useEffect(() => {
    if (!userTimeZone || isInitialized) return;
    
    const initialize = async () => {
      try {
        await initializeData(); // Use the new initializeData function
        const initialTab = determineInitialTab();
        setActiveTab(initialTab);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error during initialization:', error);
      }
    };
  
    initialize();
  }, [userTimeZone, isInitialized, initializeData, determineInitialTab, setActiveTab]);
          
  useEffect(() => {
    if (!isInitialized) return;

    const updateTimer = setInterval(softUpdateMatches, activeTab === 'live' ? 15000 : 30000);
    return () => clearInterval(updateTimer);
  }, [isInitialized, softUpdateMatches, activeTab]);

  // Callbacks
  const handleLeagueSelect = useCallback((leagueId) => {
    setSelectedLeague(leagueId);
    setActiveTab(determineAppropriateTab(leagueId));
  }, [determineAppropriateTab, setActiveTab]);

  const toggleLeague = useCallback((leagueKey) => {
    setCollapsedLeagues(prev => ({
      ...prev,
      [leagueKey]: !prev[leagueKey]
    }));
  }, []);

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
    switch (activeTab) {
      case 'live':
        return allLiveMatches || {};
      case 'finished':
        return finishedMatches || {};
      case 'scheduled':
        return scheduledMatches || {};
      default:
        return {};
    }
  }, [activeTab, allLiveMatches, finishedMatches, scheduledMatches]);
  
  
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
      
      <ModernAccuracyComparison 
        user={user}
        onSignInClick={onOpenAuthModal}
        allLiveMatches={allLiveMatches}
        scheduledMatches={scheduledMatches}
        selectedDate={selectedDate}
        matches={matches}
        setMatches={setMatches}
      />

      {/* Mobile Today's Odds - Moved here */}
      <div className="md:hidden mb-6">
        <TodaysOdds matches={getCurrentMatches()} />
      </div>

      <div className="relative flex flex-col items-center mb-24">
      <MatchFilters
  selectedDay={selectedDay}
  setSelectedDay={handleDayChange}
  activeTab={activeTab}
  onTabChange={handleTabChange}
  hasAnyLiveMatches={allLiveMatches ? Object.keys(allLiveMatches).length > 0 : false}
  getDateForSelection={getDateForSelection}
/>


        <div className="w-full max-w-5xl relative">
          <div className="flex relative pb-8">
            {/* Desktop League Filter */}
            <div className="hidden md:block absolute -left-36 top-0 w-[280px]">
              <div className="sticky top-4 pb-24">
              <LeagueFilter
  leagues={extractLeagues(matchesForCurrentDate || {}, allLiveMatches || {})}
  selectedLeague={selectedLeague}
  onLeagueSelect={handleLeagueSelect}
  isMobileOpen={isMobileFilterOpen}
  onClose={() => setIsMobileFilterOpen(false)}
/>
              </div>
            </div>

            {/* Desktop Today's Odds */}
            <div className="hidden md:block absolute -right-36 top-0 w-[280px]">
              <div className="sticky top-4 pb-24">
                <TodaysOdds matches={getCurrentMatches()} />
              </div>
            </div>

{/* Main Content Area */}
<div className="w-full">
  <div className="max-w-md mx-auto">
    {Object.keys(getCurrentMatches()).length === 0 ? (
      <div className="text-center py-10 text-gray-500">
        {activeTab === 'live' && "No Live matches at the moment"}
        {activeTab === 'finished' && "No Finished matches at the moment"}
        {activeTab === 'scheduled' && "No Scheduled matches at the moment"}
      </div>
    ) : (
      <APIStyleMatches
        matches={getCurrentMatches()}
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

        {/* Mobile League Filter Button */}
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

          <LeagueFilter
  leagues={extractLeagues(matchesForCurrentDate || {}, allLiveMatches || {})}
  selectedLeague={selectedLeague}
  onLeagueSelect={handleLeagueSelect}
  isMobileOpen={isMobileFilterOpen}
  onClose={() => setIsMobileFilterOpen(false)}
/>

        </div>
      </div>
    </div>
  );
};

export default Matches;