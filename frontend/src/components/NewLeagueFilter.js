// src/components/NewLeagueFilter.js
import React, { useMemo, useState } from 'react';

const NewLeagueFilter = ({ matches, onSelectLeague, selectedLeague }) => {
    const [searchQuery, setSearchQuery] = useState('');
    
    // Add debug logging
    console.log('Matches passed to NewLeagueFilter:', matches);
    console.log('Match keys:', Object.keys(matches || {}));
    
    // Extract unique leagues from the matches data
    const leagues = useMemo(() => {
      if (!matches || Object.keys(matches).length === 0) {
        console.log('No matches data available for league filter');
        return [];
      }
      
      const leagueMap = new Map();
      
      Object.entries(matches).forEach(([leagueKey, leagueMatches]) => {
        // Skip if no matches
        if (!leagueMatches || leagueMatches.length === 0) {
          console.log(`No matches for league ${leagueKey}`);
          return;
        }
        
        console.log(`Processing league ${leagueKey} with ${leagueMatches.length} matches`);
        
        // Extract league info
        const league = {
          key: leagueKey,
          name: leagueMatches[0]?.competition?.name || leagueKey.split('_')[0],
          competition: leagueMatches[0]?.competition,
          country: leagueMatches[0]?.competition?.country,
          matchCount: leagueMatches.length
        };
        
        // Add to map (ensures uniqueness)
        if (!leagueMap.has(leagueKey)) {
          leagueMap.set(leagueKey, league);
        }
      });
      
      // Convert Map to Array and sort by league name
      return Array.from(leagueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [matches]);
    
  // Filter leagues by search query
  const filteredLeagues = useMemo(() => {
    if (!searchQuery.trim()) return leagues;
    
    const query = searchQuery.toLowerCase();
    return leagues.filter(league => 
      league.name.toLowerCase().includes(query) || 
      league.country?.name?.toLowerCase().includes(query)
    );
  }, [leagues, searchQuery]);
  
  // Return early if no leagues
  if (!leagues || leagues.length === 0) {
    return (
      <div className="bg-[#1a1f2b] rounded-lg p-4 text-center text-gray-400 text-sm">
        No leagues available
      </div>
    );
  }
  
  return (
    <div className="bg-[#1a1f2b] rounded-lg overflow-hidden">
      <div className="p-4 bg-[#242938] border-b border-gray-700">
        <h3 className="text-white font-medium text-sm">Today's Events</h3>
      </div>
      
      {/* League search */}
      <div className="p-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search leagues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#242938] border border-gray-700 rounded-md py-2 px-3 pl-9 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 absolute left-3 top-2.5 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      {/* All Leagues button */}
      <button 
        className={`w-full p-3 text-left hover:bg-[#2a2f3d] transition-colors ${!selectedLeague ? 'bg-[#2a2f3d] text-emerald-400' : 'text-white'}`}
        onClick={() => onSelectLeague(null)}
      >
        <div className="flex items-center">
          <span className="text-sm font-medium">All Leagues</span>
        </div>
      </button>
      
      {/* League list */}
      <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
        {filteredLeagues.map((league) => (
          <button 
            key={league.key}
            className={`w-full p-3 text-left hover:bg-[#2a2f3d] transition-colors ${selectedLeague === league.key ? 'bg-[#2a2f3d] text-emerald-400' : 'text-white'}`}
            onClick={() => onSelectLeague(league.key)}
          >
            <div className="flex items-center">
              {/* League icon/flag if available */}
              <div className="mr-3 flex items-center space-x-2">
                {league.country?.flag && (
                  <img 
                    src={league.country.flag} 
                    alt={league.country.name}
                    className="w-4 h-3 object-cover rounded-sm"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
                {league.competition?.emblem && (
                  <img 
                    src={league.competition.emblem} 
                    alt={league.name}
                    className="w-4 h-4 object-contain"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
              </div>
              
              {/* League name */}
              <div className="flex-grow">
                <span className="text-sm font-medium">{league.name}</span>
              </div>
              
              {/* Match count */}
              <div className="ml-2 text-xs bg-[#1a1f2b] rounded-full px-2 py-1">
                {league.matchCount}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default NewLeagueFilter;