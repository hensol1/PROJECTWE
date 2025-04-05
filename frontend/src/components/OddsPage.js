import React, { useState, useEffect, useMemo } from 'react';
import LeagueFilter from './LeagueFilter';
import OddsBreakdownModal from './OddsBreakdownModal'; // Import the new component
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { Calendar, Loader, ChevronLeft, ChevronRight, ChevronDown, Filter, Info, X } from 'lucide-react';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday, isSameDay, parseISO } from 'date-fns';

const OddsPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [matches, setMatches] = useState({});
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [collapsedLeagues, setCollapsedLeagues] = useState({});
  const [showTooltip, setShowTooltip] = useState(false);
  // New state for the odds breakdown modal
  const [selectedMatch, setSelectedMatch] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [showOnlyCorrectPredictions, setShowOnlyCorrectPredictions] = useState(false);

  // Format date for display
  const formattedDate = useMemo(() => {
    return format(selectedDate, 'EEEE, MMMM d, yyyy');
  }, [selectedDate]);

  // Date for API request
  const apiDateStr = useMemo(() => {
    return format(selectedDate, 'yyyy-MM-dd');
  }, [selectedDate]);

  // Date navigation
  const handlePreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Toggle tooltip visibility
  const handleInfoClick = (e) => {
    e.stopPropagation();
    setShowTooltip(!showTooltip);
  };

  // Add this function to toggle the filter
const toggleCorrectPredictions = () => {
  setShowOnlyCorrectPredictions(prev => !prev);
};

const hasCorrectPrediction = (match) => {
  // Only check finished matches
  if (match.status !== 'FINISHED' || !match.aiPrediction) return false;
  
  const homeScore = match.score.fullTime.home;
  const awayScore = match.score.fullTime.away;
  
  if (homeScore > awayScore && match.aiPrediction === 'HOME_TEAM') return true;
  if (homeScore === awayScore && match.aiPrediction === 'DRAW') return true;
  if (homeScore < awayScore && match.aiPrediction === 'AWAY_TEAM') return true;
  
  return false;
};


  // League selection handler with logging
  const handleLeagueSelect = (leagueId) => {
    console.log("League selected:", leagueId);
    
    // If league ID is a string that contains an underscore, extract the numeric part
    if (typeof leagueId === 'string' && leagueId.includes('_')) {
      const parts = leagueId.split('_');
      const numericPart = parseInt(parts[1]);
      if (!isNaN(numericPart)) {
        setSelectedLeague(numericPart);
        return;
      }
    }
    
    // Otherwise, use as-is
    setSelectedLeague(leagueId);
  };
  
// Parse league ID from URL if present
useEffect(() => {
  const params = new URLSearchParams(location.search);
  const leagueId = params.get('league');
  // Only update selected league from URL if:
  // 1. There is a league param in the URL, AND
  // 2. It's different from the current selection
  if (leagueId && parseInt(leagueId) !== selectedLeague) {
    setSelectedLeague(parseInt(leagueId));
  }
}, [location.search]); // Dependency only on location.search

// Update URL when league is selected - but ONLY when it changes
useEffect(() => {
  // Skip the first render
  const params = new URLSearchParams(location.search);
  const currentLeagueParam = params.get('league');
  const currentLeagueId = currentLeagueParam ? parseInt(currentLeagueParam) : null;
  
  // Only update URL if the selection has actually changed
  if (selectedLeague !== currentLeagueId) {
    const params = new URLSearchParams(location.search);
    
    if (selectedLeague) {
      params.set('league', selectedLeague);
    } else {
      params.delete('league');
    }
    
    const newSearch = params.toString();
    const newPath = `${location.pathname}${newSearch ? `?${newSearch}` : ''}`;
    
    // Use replace to avoid adding to navigation history
    navigate(newPath, { replace: true });
  }
}, [selectedLeague]); // Only depend on selectedLeague

// Toggle league collapse
  const toggleLeague = (leagueKey) => {
    setCollapsedLeagues(prev => ({
      ...prev,
      [leagueKey]: !prev[leagueKey]
    }));
  };

  // Function to extract leagues from matches
  const extractLeagues = (matchesData) => {
    const leagueSet = new Set();
    const leagueList = [];
    
    // Debug the matches data
    console.log("Extracting leagues from:", matchesData);
    
    Object.entries(matchesData).forEach(([leagueId, leagueMatches]) => {
      if (leagueMatches && leagueMatches.length > 0 && !leagueSet.has(leagueId)) {
        const firstMatch = leagueMatches[0];
        leagueSet.add(leagueId);
        
        // Ensure leagueId is a valid number or fallback to a string ID
        const numericLeagueId = parseInt(leagueId);
        
        leagueList.push({
          id: !isNaN(numericLeagueId) ? numericLeagueId : leagueId, // Use numeric ID if valid, otherwise use string
          name: firstMatch.competition?.name || `League ${leagueId}`,
          emblem: firstMatch.competition?.emblem || null,
          country: firstMatch.competition?.area || null
        });
      }
    });
    
    // Debug the extracted leagues
    console.log("Extracted leagues:", leagueList);
    
    return leagueList;
  };
  
  // Function to determine the winner
  const getMatchWinner = (match) => {
    if (match.status !== 'FINISHED') return null;
    
    const homeScore = match.score.fullTime.home;
    const awayScore = match.score.fullTime.away;
    
    if (homeScore > awayScore) return 'home';
    if (awayScore > homeScore) return 'away';
    return 'draw';
  };
  
  // Handle click on a match to show odds breakdown
  const handleMatchClick = (match) => {
    setSelectedMatch(match);
  };

  // Close the odds breakdown modal
  const closeOddsBreakdown = () => {
    setSelectedMatch(null);
  };

  // Fetch matches and leagues data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch matches using the optimized method that tries static file first
        const processedMatches = await api.fetchMatchesForDisplay(selectedDate);
        
        console.log(`Processed ${Object.values(processedMatches).flat().length} matches for display`);
        setMatches(processedMatches);
        
        // Extract leagues from processed matches
        const extractedLeagues = extractLeagues(processedMatches);
        setLeagues(extractedLeagues);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedDate]);
  
  // Filter matches based on selected league
  const filteredMatches = useMemo(() => {
    // Start with matches filtered by league
    let result = {};
    
    if (selectedLeague) {
      // Find the matching league key, handling numeric/string conversion if needed
      const selectedLeagueStr = selectedLeague.toString();
      
      // Look for an exact match first
      if (matches[selectedLeague]) {
        result = { [selectedLeague]: matches[selectedLeague] };
      } else {
        // Then look for matches where the league ID is in the key
        const matchingKey = Object.keys(matches).find(key => {
          // If the key contains an underscore, check if the numeric part matches
          if (key.includes('_')) {
            const parts = key.split('_');
            return parts[1] === selectedLeagueStr;
          }
          return key === selectedLeagueStr;
        });
        
        if (matchingKey) {
          result = { [matchingKey]: matches[matchingKey] };
        } else {
          result = {};
        }
      }
    } else {
      result = matches;
    }
    
    // If we're not filtering for correct predictions, return the league-filtered matches
    if (!showOnlyCorrectPredictions) {
      return result;
    }
    
    // Filter to only show matches with correct predictions
    const correctPredictionsMatches = {};
    
    Object.entries(result).forEach(([leagueId, leagueMatches]) => {
      const correctMatches = leagueMatches.filter(match => hasCorrectPrediction(match));
      
      if (correctMatches.length > 0) {
        correctPredictionsMatches[leagueId] = correctMatches;
      }
    });
    
    return correctPredictionsMatches;
  }, [matches, selectedLeague, showOnlyCorrectPredictions]);
    
  // Group matches by league and sort by earliest match time
  const sortedLeagues = useMemo(() => {
    const leagueGroups = {};
    
    // Group matches by league
    Object.entries(filteredMatches).forEach(([leagueId, leagueMatches]) => {
      if (leagueMatches && leagueMatches.length > 0) {
        const firstMatch = leagueMatches[0];
        
        leagueGroups[leagueId] = {
          id: leagueId,
          name: firstMatch.competition.name,
          emblem: firstMatch.competition.emblem,
          country: firstMatch.competition.area,
          matches: [...leagueMatches].sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate)),
          earliestTime: Math.min(...leagueMatches.map(m => new Date(m.utcDate).getTime()))
        };
      }
    });

    // Sort leagues by earliest match time
    return Object.entries(leagueGroups)
      .sort((a, b) => a[1].earliestTime - b[1].earliestTime);
  }, [filteredMatches]);

  // Date label helper
  const getDateLabel = (date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  return (
    <div className="container mx-auto py-2 px-2 md:py-4 md:px-4">
      {/* Header with title centered and filter button */}
      <div className="flex items-center mb-2 md:mb-6">
        <div className="flex-1 flex justify-center">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center">
            <Calendar className="mr-2 text-[#40c456]" />
            Betting Odds
            
            {/* Info icon for tooltip */}
            <div className="relative group ml-2">
              <Info 
                className="w-4 h-4 md:w-5 md:h-5 text-gray-400 hover:text-[#40c456] cursor-help"
                onClick={handleInfoClick}
              />
              
              {/* Mobile tooltip - only shown when clicked */}
              {showTooltip && (
                <div 
                  className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:hidden"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTooltip(false);
                  }}
                >
                    <div 
                    className="bg-gray-800 rounded-lg p-4 max-w-xs mx-auto text-xs text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                      className="float-right text-gray-400 hover:text-white"
                      onClick={() => setShowTooltip(false)}
                    >
                      <X size={16} />
                    </button>
                    <p className="mb-2">
                      The displayed odds represent a sophisticated harmonic mean calculation derived from over 15 leading bookmakers.
                    </p>
                    <p>
                      We utilize the harmonic mean methodology as it provides a more conservative and statistically robust average, particularly suitable for betting odds analysis and market consensus evaluation.
                    </p>
                  </div>
                </div>
              )}
              
            {/* Desktop tooltip - shown on hover */}
            <div className="hidden md:block invisible group-hover:visible absolute left-1/2 -translate-x-1/2 mt-2 w-72 p-3 bg-gray-800 rounded-lg shadow-xl text-xs md:text-sm text-white z-[9999]">
                <div className="relative">
                  <div className="text-left">
                    <p className="mb-2">
                      The displayed odds represent a sophisticated harmonic mean calculation derived from over 15 leading bookmakers.
                    </p>
                    <p>
                      We utilize the harmonic mean methodology as it provides a more conservative and statistically robust average, particularly suitable for betting odds analysis and market consensus evaluation.
                    </p>
                  </div>
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-800 rotate-45"></div>
                </div>
              </div>
            </div>
          </h1>
        </div>
        
      {/* Mobile filter button - positioned absolutely to maintain centering */}
      <button 
        className="md:hidden absolute right-4 px-3 py-1 bg-[#40c456] text-white rounded-md flex items-center text-sm"
        onClick={() => setIsMobileFilterOpen(true)}
      >
        <Filter size={16} className="mr-1" /> Filter
      </button>
    </div>

    {/* Date navigation - more compact */}
    <div className="flex items-center justify-center mb-2 md:mb-4 bg-gray-100 rounded-lg p-1 md:p-2">
        <button 
          onClick={handlePreviousDay}
          className="p-1 md:p-2 text-gray-600 hover:text-[#40c456]"
        >
          <ChevronLeft size={18} />
        </button>
        
        <div className="flex items-center mx-2 md:mx-4">
          <div className="text-base md:text-lg font-medium">
            {getDateLabel(selectedDate)}
          </div>
          <div className="text-xs md:text-sm text-gray-500 ml-2">
            {formattedDate}
          </div>
          {!isToday(selectedDate) && (
            <button 
              onClick={handleToday}
              className="ml-2 px-2 py-0.5 text-xs bg-[#40c456] text-white rounded"
            >
              Today
            </button>
          )}
        </div>
        
        <button 
          onClick={handleNextDay}
          className="p-1 md:p-2 text-gray-600 hover:text-[#40c456]"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex justify-center mb-4">
  <button 
    onClick={toggleCorrectPredictions}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
      showOnlyCorrectPredictions 
        ? 'bg-emerald-600 text-white' 
        : 'bg-gray-200 text-gray-800'
    }`}
  >
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className="w-5 h-5"
    >
      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
    {showOnlyCorrectPredictions ? 'Showing Correct Predictions' : 'Show Correct Predictions'}
  </button>
</div>
      
      
      <div className="flex justify-center">
      <div className="hidden md:block md:w-64 flex-shrink-0 mr-4 md:mr-6">
      <LeagueFilter
  leagues={leagues}
  selectedLeague={selectedLeague}
  onLeagueSelect={handleLeagueSelect}
  isMobileOpen={false}
  onClose={() => {}}
/>
      </div>
        
        {/* Main content area */}
        <div className="w-full max-w-2xl">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader className="animate-spin text-[#40c456]" size={32} />
          </div>
        ) : sortedLeagues.length === 0 ? (
          <div className="w-full rounded-xl p-8 text-center text-gray-500 bg-white shadow">
            No odds available for {getDateLabel(selectedDate)}
          </div>
        ) : (
          <div className="w-full bg-[#1a1f2b] text-white rounded-lg shadow-lg overflow-hidden">
              {sortedLeagues.map(([leagueId, league]) => (
                <div key={leagueId} className="border-b border-gray-700 last:border-b-0">
                  {/* League header */}
                  <div 
                    className="px-3 py-2 md:px-4 md:py-3 bg-[#242938] flex items-center justify-between cursor-pointer hover:bg-[#2a2f3d]"
                    onClick={() => toggleLeague(leagueId)}
                  >
                    <div className="flex items-center gap-2">
                      {/* Country flag - using your corrected approach */}
                      {league.matches[0]?.competition?.country?.flag && (
                        <img 
                          src={league.matches[0].competition.country.flag} 
                          alt={league.matches[0].competition.country.name || ''}
                          className="w-4 h-3 md:w-5 md:h-4 object-cover rounded-sm"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      )}
                      {/* Competition logo */}
                      {league.emblem && (
                        <img 
                          src={league.emblem} 
                          alt={league.name}
                          className="w-4 h-4 md:w-5 md:h-5 object-contain"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      )}
                      <span className="font-semibold text-xs md:text-sm">{league.name}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-emerald-400 hover:text-emerald-300 text-[10px] md:text-xs mr-2 md:mr-4 flex items-center gap-1">
                      </span>
                      <ChevronDown 
                        size={18} 
                        className={`text-gray-400 transform transition-transform ${
                          collapsedLeagues[leagueId] ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {showOnlyCorrectPredictions && (
  <div className="bg-emerald-100 border-l-4 border-emerald-500 text-emerald-800 p-3 mb-4 rounded shadow">
    <div className="flex items-center">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className="w-5 h-5 mr-2"
      >
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
      </svg>
      <span className="font-small">only matches with correct predictions</span>
      <button 
        onClick={toggleCorrectPredictions} 
        className="ml-auto text-emerald-600 hover:text-emerald-800"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 20 20" 
          fill="currentColor" 
          className="w-5 h-5"
        >
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  </div>
)}

                  
                  {/* League matches */}
                  {!collapsedLeagues[leagueId] && (
                    <div className="divide-y divide-gray-700">
                      {league.matches.map((match) => {
                        // Format time display
                        const matchTime = format(new Date(match.utcDate), 'HH:mm');
                        // Check if odds exist
                        const hasOdds = match.odds?.harmonicMeanOdds;
                        // Determine winner for finished matches
                        const matchWinner = getMatchWinner(match);
                        
                        return (
                          <div 
                            key={match.id} 
                            className="px-2 py-2 md:px-4 md:py-3 hover:bg-[#2a2f3d] transition-colors cursor-pointer"
                            onClick={() => handleMatchClick(match)}
                          >
                            <div className="flex items-center justify-between gap-2 md:gap-4">
                              {/* Match time */}
                              <div className="w-10 md:w-16 text-center">
                                <span className={`text-[10px] md:text-xs font-medium ${
                                  match.status === 'IN_PLAY' 
                                    ? 'text-emerald-400 animate-pulse' 
                                    : match.status === 'FINISHED'
                                    ? 'text-gray-500'
                                    : 'text-gray-400'
                                }`}>
                                  {match.status === 'FINISHED' ? 'FT' : 
                                   match.status === 'HALFTIME' ? 'HT' :
                                   match.status === 'IN_PLAY' ? `${match.minute}'` :
                                   matchTime}
                                </span>
                              </div>
                              
                              {/* Teams with scores always visible */}
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1 md:mb-2">
                                  <div className="flex items-center gap-1 md:gap-2">
                                    {match.homeTeam?.crest && (
                                      <img 
                                        src={match.homeTeam.crest} 
                                        alt={match.homeTeam.name} 
                                        className="w-3 h-3 md:w-4 md:h-4 object-contain"
                                        onError={(e) => e.target.style.display = 'none'}
                                      />
                                    )}
                                    <span className="text-xs md:text-sm">{match.homeTeam.name}</span>
                                  </div>
                                  <span className="text-xs md:text-sm font-semibold">
                                    {match.status !== 'TIMED' && match.status !== 'SCHEDULED' && match.score.fullTime.home !== null ? match.score.fullTime.home : '-'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 md:gap-2">
                                    {match.awayTeam?.crest && (
                                      <img 
                                        src={match.awayTeam.crest} 
                                        alt={match.awayTeam.name} 
                                        className="w-3 h-3 md:w-4 md:h-4 object-contain"
                                        onError={(e) => e.target.style.display = 'none'}
                                      />
                                    )}
                                    <span className="text-xs md:text-sm">{match.awayTeam.name}</span>
                                  </div>
                                  <span className="text-xs md:text-sm font-semibold">
                                    {match.status !== 'TIMED' && match.status !== 'SCHEDULED' && match.score.fullTime.away !== null ? match.score.fullTime.away : '-'}
                                  </span>
                                </div>
                              </div>

{/* Odds display with enhanced styling for correct outcomes */}
{hasOdds && (
  <div className="flex items-center justify-end gap-1" style={{ display: 'flex', minWidth: '90px' }}>
    {/* HOME ODDS */}
    <div className="relative">
      {match.status === 'FINISHED' && matchWinner === 'home' && match.aiPrediction === 'HOME_TEAM' ? (
        <div 
          className="px-1 py-1 md:px-2 md:py-1 text-xs md:text-sm rounded flex flex-col items-center min-w-[28px] md:min-w-[32px] transform scale-105 bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 text-white border border-emerald-300 shadow-lg shadow-emerald-500/50"
        >
          <span className="text-white font-semibold">{match.odds.harmonicMeanOdds.home.toFixed(2)}</span>
          <span className="text-[8px] md:text-[10px] text-emerald-200">
            {match.odds.impliedProbabilities.home}%
          </span>
          
          {/* Checkmark indicator for correct outcome */}
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center border border-emerald-500 shadow-md">
            <span className="text-emerald-600 text-[9px] font-bold">✓</span>
          </div>
        </div>
      ) : (
        <div 
          className={`px-1 py-1 md:px-2 md:py-1 text-xs md:text-sm rounded flex flex-col items-center min-w-[28px] md:min-w-[32px] ${
            matchWinner === 'home' 
              ? 'bg-emerald-600' 
              : 'bg-gray-700'
          }`}
        >
          <span className="text-white font-semibold">{match.odds.harmonicMeanOdds.home.toFixed(2)}</span>
          <span className={`text-[8px] md:text-[10px] ${matchWinner === 'home' ? 'text-emerald-200' : 'text-gray-400'}`}>
            {match.odds.impliedProbabilities.home}%
          </span>
        </div>
      )}
    </div>
    
    {/* DRAW ODDS */}
    <div className="relative">
      {match.status === 'FINISHED' && matchWinner === 'draw' && match.aiPrediction === 'DRAW' ? (
        <div 
          className="px-1 py-1 md:px-2 md:py-1 text-xs md:text-sm rounded flex flex-col items-center min-w-[28px] md:min-w-[32px] transform scale-105 bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 text-white border border-emerald-300 shadow-lg shadow-emerald-500/50"
        >
          <span className="text-white font-semibold">{match.odds.harmonicMeanOdds.draw.toFixed(2)}</span>
          <span className="text-[8px] md:text-[10px] text-emerald-200">
            {match.odds.impliedProbabilities.draw}%
          </span>
          
          {/* Checkmark indicator for correct outcome */}
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center border border-emerald-500 shadow-md">
            <span className="text-emerald-600 text-[9px] font-bold">✓</span>
          </div>
        </div>
      ) : (
        <div 
          className={`px-1 py-1 md:px-2 md:py-1 text-xs md:text-sm rounded flex flex-col items-center min-w-[28px] md:min-w-[32px] ${
            matchWinner === 'draw' 
              ? 'bg-emerald-600' 
              : 'bg-gray-700'
          }`}
        >
          <span className="text-white font-semibold">{match.odds.harmonicMeanOdds.draw.toFixed(2)}</span>
          <span className={`text-[8px] md:text-[10px] ${matchWinner === 'draw' ? 'text-emerald-200' : 'text-gray-400'}`}>
            {match.odds.impliedProbabilities.draw}%
          </span>
        </div>
      )}
    </div>
    
    {/* AWAY ODDS */}
    <div className="relative">
      {match.status === 'FINISHED' && matchWinner === 'away' && match.aiPrediction === 'AWAY_TEAM' ? (
        <div 
          className="px-1 py-1 md:px-2 md:py-1 text-xs md:text-sm rounded flex flex-col items-center min-w-[28px] md:min-w-[32px] transform scale-105 bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 text-white border border-emerald-300 shadow-lg shadow-emerald-500/50"
        >
          <span className="text-white font-semibold">{match.odds.harmonicMeanOdds.away.toFixed(2)}</span>
          <span className="text-[8px] md:text-[10px] text-emerald-200">
            {match.odds.impliedProbabilities.away}%
          </span>
          
          {/* Checkmark indicator for correct outcome */}
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center border border-emerald-500 shadow-md">
            <span className="text-emerald-600 text-[9px] font-bold">✓</span>
          </div>
        </div>
      ) : (
        <div 
          className={`px-1 py-1 md:px-2 md:py-1 text-xs md:text-sm rounded flex flex-col items-center min-w-[28px] md:min-w-[32px] ${
            matchWinner === 'away' 
              ? 'bg-emerald-600' 
              : 'bg-gray-700'
          }`}
        >
          <span className="text-white font-semibold">{match.odds.harmonicMeanOdds.away.toFixed(2)}</span>
          <span className={`text-[8px] md:text-[10px] ${matchWinner === 'away' ? 'text-emerald-200' : 'text-gray-400'}`}>
            {match.odds.impliedProbabilities.away}%
          </span>
        </div>
      )}
    </div>
  </div>
)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {isMobileFilterOpen && (
  <LeagueFilter
    leagues={leagues}
    selectedLeague={selectedLeague}
    onLeagueSelect={handleLeagueSelect}
    isMobileOpen={true}
    onClose={() => setIsMobileFilterOpen(false)}
  />
)}
      
      {/* Odds Breakdown Modal */}
      {selectedMatch && (
      <OddsBreakdownModal 
        match={selectedMatch} 
        onClose={closeOddsBreakdown} 
      />
    )}
  </div>
);
};

export default OddsPage;