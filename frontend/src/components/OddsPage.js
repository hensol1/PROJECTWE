import React, { useState, useEffect, useMemo } from 'react';
import LeagueFilter from './LeagueFilter';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { Calendar, Loader, ChevronLeft, ChevronRight, ChevronDown, Filter } from 'lucide-react';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday, isSameDay, parseISO } from 'date-fns';

const OddsPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [matches, setMatches] = useState({});
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [collapsedLeagues, setCollapsedLeagues] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

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

  // Parse league ID from URL if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const leagueId = params.get('league');
    if (leagueId) {
      setSelectedLeague(parseInt(leagueId));
    }
  }, [location.search]);

  // Update URL when league is selected
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    if (selectedLeague) {
      params.set('league', selectedLeague);
    } else {
      params.delete('league');
    }
    
    const newSearch = params.toString();
    const newPath = `${location.pathname}${newSearch ? `?${newSearch}` : ''}`;
    
    if (newPath !== location.pathname + location.search) {
      navigate(newPath, { replace: true });
    }
  }, [selectedLeague, navigate, location.pathname, location.search]);

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
    
    Object.entries(matchesData).forEach(([leagueId, leagueMatches]) => {
      if (leagueMatches && leagueMatches.length > 0 && !leagueSet.has(leagueId)) {
        const firstMatch = leagueMatches[0];
        leagueSet.add(leagueId);
        
        leagueList.push({
          id: parseInt(leagueId), // Ensure it's a number
          name: firstMatch.competition.name,
          emblem: firstMatch.competition.emblem,
          country: firstMatch.competition.area
        });
      }
    });
    
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

  // Fetch matches and leagues data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch matches for selected date
        const matchesResponse = await api.fetchMatches(apiDateStr);
        
        // Process matches by competition
        const processedMatches = {};
        
        // Extract and organize matches by league ID
        if (matchesResponse.data && typeof matchesResponse.data === 'object') {
          // Check if the response is already organized by date
          const responseData = matchesResponse.data[apiDateStr] || matchesResponse.data;
          
          Object.entries(responseData).forEach(([leagueKey, leagueMatches]) => {
            if (Array.isArray(leagueMatches)) {
              // Filter matches for the selected date only that have odds
              leagueMatches.forEach(match => {
                const matchDate = parseISO(match.utcDate);
                if (isSameDay(matchDate, selectedDate) && match.odds?.harmonicMeanOdds) {
                  // Use competition ID as the key
                  const compId = match.competition.id;
                  if (!processedMatches[compId]) {
                    processedMatches[compId] = [];
                  }
                  processedMatches[compId].push(match);
                }
              });
            }
          });
        }
        
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
  }, [selectedDate, apiDateStr]);

  // Filter matches based on selected league
  const filteredMatches = selectedLeague
    ? { [selectedLeague]: matches[selectedLeague] || [] }
    : matches;

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
      
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Sidebar with league filter - only visible on desktop */}
        <div className="hidden md:block md:w-64 flex-shrink-0">
          <LeagueFilter
            leagues={leagues}
            selectedLeague={selectedLeague}
            onLeagueSelect={setSelectedLeague}
            isMobileOpen={false}
            onClose={() => {}}
          />
        </div>
        
        {/* Main content area */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader className="animate-spin text-[#40c456]" size={32} />
            </div>
          ) : sortedLeagues.length === 0 ? (
            <div className="w-full rounded-xl p-8 text-center text-gray-500 bg-white shadow">
              No odds available for {getDateLabel(selectedDate)}
            </div>
          ) : (
            <div className="w-full max-w-2xl mx-auto bg-[#1a1f2b] text-white rounded-lg shadow-lg overflow-hidden">
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
                              
                              {/* Teams */}
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
                              
                              {/* Odds display with highlighting for finished matches */}
                              {hasOdds && (
                                <div className="flex items-center justify-end gap-1">
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
      
      {/* Mobile league filter - only visible on mobile */}
      <div className="md:hidden">
        <LeagueFilter
          leagues={leagues}
          selectedLeague={selectedLeague}
          onLeagueSelect={setSelectedLeague}
          isMobileOpen={isMobileFilterOpen}
          onClose={() => setIsMobileFilterOpen(false)}
        />
      </div>
    </div>
  );
};

export default OddsPage;