import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import MatchDetailsModal from './MatchDetailsModal';
import StandingsModal from './StandingsModal';
import { GiPodium } from "react-icons/gi";

const APIStyleMatches = ({ matches, onVote, selectedLeague }) => {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [collapsedLeagues, setCollapsedLeagues] = useState({});
  const [selectedLeagueForStandings, setSelectedLeagueForStandings] = useState(null);
  const [isStandingsLoading, setIsStandingsLoading] = useState(false);
  
  const toggleLeague = (leagueKey) => {
    setCollapsedLeagues(prev => ({
      ...prev,
      [leagueKey]: !prev[leagueKey]
    }));
  };
  
  // Group matches by league and sort leagues by priority:
  // 1. Leagues with live matches
  // 2. Leagues with upcoming matches (sorted by start time)
  // 3. Leagues with finished matches
  const sortedLeagues = React.useMemo(() => {
    const leagueGroups = {};
    
    // Group matches by league
    Object.entries(matches).forEach(([leagueKey, leagueMatches]) => {
      const [leagueName, leagueId] = leagueKey.split('_');
      
      if (!leagueGroups[leagueKey]) {
        // Check if league has any live matches
        const hasLiveMatches = leagueMatches.some(m => 
          m.status === 'IN_PLAY' || m.status === 'PAUSED' || m.status === 'HALFTIME'
        );
        
        // Get the earliest upcoming match time
        const upcomingMatches = leagueMatches.filter(m => 
          m.status === 'TIMED' || m.status === 'SCHEDULED'
        );
        
        const earliestUpcomingTime = upcomingMatches.length > 0 
          ? Math.min(...upcomingMatches.map(m => new Date(m.utcDate).getTime()))
          : Number.MAX_SAFE_INTEGER;
        
        // Check if league has any finished matches
        const hasFinishedMatches = leagueMatches.some(m => m.status === 'FINISHED');
        
        leagueGroups[leagueKey] = {
          name: leagueName,
          id: leagueId,
          matches: leagueMatches,
          hasLiveMatches,
          earliestUpcomingTime,
          hasFinishedMatches,
          // Sort matches by time (live first, then upcoming by start time, then finished)
          sortedMatches: [...leagueMatches].sort((a, b) => {
            // Live matches come first
            if ((a.status === 'IN_PLAY' || a.status === 'PAUSED' || a.status === 'HALFTIME') && 
                !(b.status === 'IN_PLAY' || b.status === 'PAUSED' || b.status === 'HALFTIME')) {
              return -1;
            }
            if (!(a.status === 'IN_PLAY' || a.status === 'PAUSED' || a.status === 'HALFTIME') && 
                (b.status === 'IN_PLAY' || b.status === 'PAUSED' || b.status === 'HALFTIME')) {
              return 1;
            }
            
            // Then upcoming matches by start time
            if ((a.status === 'TIMED' || a.status === 'SCHEDULED') && 
                (b.status === 'TIMED' || b.status === 'SCHEDULED')) {
              return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
            }
            
            // Upcoming matches before finished matches
            if ((a.status === 'TIMED' || a.status === 'SCHEDULED') && b.status === 'FINISHED') {
              return -1;
            }
            if (a.status === 'FINISHED' && (b.status === 'TIMED' || b.status === 'SCHEDULED')) {
              return 1;
            }
            
            // Default sort by match time
            return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
          })
        };
      }
    });

    // Sort leagues by priority:
    // 1. Leagues with live matches
    // 2. Leagues with upcoming matches (sorted by earliest start time)
    // 3. Leagues with only finished matches
    return Object.entries(leagueGroups)
      .sort((a, b) => {
        const leagueA = a[1];
        const leagueB = b[1];
        
        // Leagues with live matches come first
        if (leagueA.hasLiveMatches && !leagueB.hasLiveMatches) return -1;
        if (!leagueA.hasLiveMatches && leagueB.hasLiveMatches) return 1;
        
        // Then leagues with upcoming matches, sorted by earliest match time
        if (!leagueA.hasLiveMatches && !leagueB.hasLiveMatches) {
          if (leagueA.earliestUpcomingTime !== Number.MAX_SAFE_INTEGER && 
              leagueB.earliestUpcomingTime !== Number.MAX_SAFE_INTEGER) {
            return leagueA.earliestUpcomingTime - leagueB.earliestUpcomingTime;
          }
          
          // Leagues with upcoming matches before leagues with only finished matches
          if (leagueA.earliestUpcomingTime !== Number.MAX_SAFE_INTEGER && 
              leagueB.earliestUpcomingTime === Number.MAX_SAFE_INTEGER) {
            return -1;
          }
          if (leagueA.earliestUpcomingTime === Number.MAX_SAFE_INTEGER && 
              leagueB.earliestUpcomingTime !== Number.MAX_SAFE_INTEGER) {
            return 1;
          }
        }
        
        // If both leagues have the same status, sort alphabetically
        return leagueA.name.localeCompare(leagueB.name);
      });
  }, [matches]);
  
  // Handle standings button click
  const handleStandingsClick = (e, competition) => {
    e.stopPropagation();
    setIsStandingsLoading(true);
    setSelectedLeagueForStandings(competition);
  };

  // Reset standings loading state when modal closes
  useEffect(() => {
    if (!selectedLeagueForStandings) {
      setIsStandingsLoading(false);
    }
  }, [selectedLeagueForStandings]);

// Auto-expand leagues with live matches - only on initial render
useEffect(() => {
  // Only initialize the collapsed state once when the component mounts
  const initialCollapsedState = {};
  
  sortedLeagues.forEach(([leagueKey, league]) => {
    // If league has live matches, don't collapse it
    const hasLiveMatches = league.matches.some(match => 
      match.status === 'IN_PLAY' || match.status === 'PAUSED' || match.status === 'HALFTIME'
    );
    
    initialCollapsedState[leagueKey] = !hasLiveMatches;
  });
  
  setCollapsedLeagues(prevState => {
    // Only update keys that don't already exist in the state
    const newState = { ...prevState };
    Object.entries(initialCollapsedState).forEach(([key, value]) => {
      if (!(key in prevState)) {
        newState[key] = value;
      }
    });
    return newState;
  });
}, []); // Empty dependency array means this only runs once on mount

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#1a1f2b] text-white rounded-lg shadow-lg overflow-hidden">
      {selectedMatch && (
        <MatchDetailsModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}
      
      {selectedLeagueForStandings && (
        <StandingsModal
          league={selectedLeagueForStandings}
          onClose={() => setSelectedLeagueForStandings(null)}
        />
      )}
  
      {sortedLeagues.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No matches available for selected date
        </div>
      ) : (
        sortedLeagues.map(([leagueKey, league]) => {
          // Determine if this league has any live matches
          const hasLiveMatches = league.matches.some(match => 
            match.status === 'IN_PLAY' || match.status === 'PAUSED' || match.status === 'HALFTIME'
          );
          
          return (
            <div key={leagueKey} className="border-b border-gray-700 last:border-b-0">
              <div 
                className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#2a2f3d] ${
                  hasLiveMatches ? 'bg-[#293042]' : 'bg-[#242938]'
                }`}
                onClick={() => toggleLeague(leagueKey)}
              >
                <div className="flex items-center gap-3">
                  {/* Country flag */}
                  {league.matches[0]?.competition?.country?.flag && (
                    <img 
                      src={league.matches[0].competition.country.flag} 
                      alt={league.matches[0].competition.country.name}
                      className="w-5 h-4 object-cover rounded-sm"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  )}
                  {/* Competition logo */}
                  {league.matches[0]?.competition?.emblem && (
                    <img 
                      src={league.matches[0].competition.emblem} 
                      alt={league.name}
                      className="w-5 h-5 object-contain"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  )}
                  <div className="flex items-center">
                    <span className="font-semibold text-sm">{league.name}</span>
                    {hasLiveMatches && (
                      <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    )}
                    <span className="ml-2 min-w-5 h-5 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center px-1.5">{league.matches.length}</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <button 
                    onClick={(e) => handleStandingsClick(e, league.matches[0].competition)} 
                    className="text-emerald-400 hover:text-emerald-300 text-xs mr-4 flex items-center gap-1"
                    disabled={isStandingsLoading}
                  >
                    {isStandingsLoading && selectedLeagueForStandings?.id === league.matches[0].competition.id ? (
                      <span className="inline-block w-3 h-3 mr-1 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin"></span>
                    ) : null}
                    <GiPodium />
                  </button>
                  {collapsedLeagues[leagueKey] ? (
                    <ChevronRight size={20} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-400" />
                  )}
                </div>
              </div>
              
              {!collapsedLeagues[leagueKey] && (
                <div className="divide-y divide-gray-700">
                  {league.sortedMatches.map((match) => (
                    <div 
                      key={match.id} 
                      className="px-4 py-3 hover:bg-[#2a2f3d] transition-colors cursor-pointer"
                      onClick={() => setSelectedMatch(match)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="w-16 text-center">
                          <span className={`text-xs font-medium ${
                            match.status === 'IN_PLAY' 
                              ? 'text-emerald-400 animate-pulse' 
                              : match.status === 'PAUSED' || match.status === 'HALFTIME'
                              ? 'text-yellow-400'
                              : 'text-gray-400'
                          }`}>
                            {match.status === 'FINISHED' ? 'FT' : 
                             match.status === 'HALFTIME' ? 'HT' :
                             match.status === 'PAUSED' ? 'PAUSE' :
                             match.status === 'IN_PLAY' ? `${match.minute}'` :
                             new Date(match.utcDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {match.homeTeam?.crest && (
                                <img 
                                  src={match.homeTeam.crest} 
                                  alt={match.homeTeam.name} 
                                  className="w-4 h-4 object-contain"
                                  onError={(e) => e.target.style.display = 'none'}
                                  loading="lazy"
                                />
                              )}
                              <span className="text-sm">{match.homeTeam.name}</span>
                            </div>
                            <span className="text-sm font-semibold">
                              {match.score.fullTime.home !== null ? match.score.fullTime.home : '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {match.awayTeam?.crest && (
                                <img 
                                  src={match.awayTeam.crest} 
                                  alt={match.awayTeam.name} 
                                  className="w-4 h-4 object-contain"
                                  onError={(e) => e.target.style.display = 'none'}
                                  loading="lazy"
                                />
                              )}
                              <span className="text-sm">{match.awayTeam.name}</span>
                            </div>
                            <span className="text-sm font-semibold">
                              {match.score.fullTime.away !== null ? match.score.fullTime.away : '-'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="w-24 flex flex-col items-end">
                          <div className="text-xs text-gray-400 mb-1">Our Prediction:</div>
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (match.status !== 'FINISHED') {
                                  onVote(match.id, 'HOME_TEAM');
                                }
                              }}
                              className={`px-2 py-1 text-xs rounded ${
                                match.status === 'FINISHED' 
                                  ? match.score.fullTime.home > match.score.fullTime.away
                                    ? 'bg-emerald-500 text-white'
                                    : match.aiPrediction === 'HOME_TEAM'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-700'
                                  : match.aiPrediction === 'HOME_TEAM'
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-gray-700 hover:bg-gray-600'
                              }`}
                            >
                              1
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (match.status !== 'FINISHED') {
                                  onVote(match.id, 'DRAW');
                                }
                              }}
                              className={`px-2 py-1 text-xs rounded ${
                                match.status === 'FINISHED'
                                  ? match.score.fullTime.home === match.score.fullTime.away
                                    ? 'bg-emerald-500 text-white'
                                    : match.aiPrediction === 'DRAW'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-700'
                                  : match.aiPrediction === 'DRAW'
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-gray-700 hover:bg-gray-600'
                              }`}
                            >
                              X
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (match.status !== 'FINISHED') {
                                  onVote(match.id, 'AWAY_TEAM');
                                }
                              }}
                              className={`px-2 py-1 text-xs rounded ${
                                match.status === 'FINISHED'
                                  ? match.score.fullTime.away > match.score.fullTime.home
                                    ? 'bg-emerald-500 text-white'
                                    : match.aiPrediction === 'AWAY_TEAM'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-700'
                                  : match.aiPrediction === 'AWAY_TEAM'
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-gray-700 hover:bg-gray-600'
                              }`}
                            >
                              2
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default APIStyleMatches;