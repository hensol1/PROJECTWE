import React, { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import MatchDetailsModal from './MatchDetailsModal';
import StandingsModal from './StandingsModal';


const APIStyleMatches = ({ matches, activeTab, onVote, selectedLeague }) => {
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [collapsedLeagues, setCollapsedLeagues] = useState({});
    const [selectedLeagueForStandings, setSelectedLeagueForStandings] = useState(null);
  
    const toggleLeague = (leagueKey) => {
      setCollapsedLeagues(prev => ({
        ...prev,
        [leagueKey]: !prev[leagueKey]
      }));
    };
  
    // Group matches by league and sort leagues by earliest match time
    const sortedLeagues = React.useMemo(() => {
      const leagueGroups = {};
      
      // Group matches by league
      Object.entries(matches).forEach(([leagueKey, leagueMatches]) => {
        const [leagueName, leagueId] = leagueKey.split('_');
        if (!leagueGroups[leagueKey]) {
          leagueGroups[leagueKey] = {
            name: leagueName,
            id: leagueId,
            matches: leagueMatches,
            earliestTime: Math.min(...leagueMatches.map(m => new Date(m.utcDate).getTime()))
          };
        }
      });
  
      // Sort leagues by earliest match time
      return Object.entries(leagueGroups)
        .sort((a, b) => a[1].earliestTime - b[1].earliestTime);
    }, [matches]);
  
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
            {activeTab === 'live' && "No Live matches at the moment"}
            {activeTab === 'finished' && "No Finished matches at the moment"}
            {activeTab === 'scheduled' && "No Scheduled matches at the moment"}
          </div>
        ) : (
          sortedLeagues.map(([leagueKey, league]) => (
              <div key={leagueKey} className="border-b border-gray-700 last:border-b-0">
            <div 
              className="px-4 py-3 bg-[#242938] flex items-center justify-between cursor-pointer hover:bg-[#2a2f3d]"
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
                <span className="font-semibold text-sm">{league.name}</span>
              </div>
              <div className="flex items-center">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLeagueForStandings(league.matches[0].competition);
                  }} 
                  className="text-emerald-400 hover:text-emerald-300 text-xs mr-4 flex items-center gap-1"
                >
                  ❯Standings
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
                {league.matches.map((match) => (
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
                            : 'text-gray-400'
                        }`}>
                          {match.status === 'FINISHED' ? 'FT' : 
                           match.status === 'HALFTIME' ? 'HT' :
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
      ))
    )}
  </div>
);
  };
  
  export default APIStyleMatches;
  