import React, { useEffect, useState } from 'react';
import { X, Search, ChevronDown, Calendar } from 'lucide-react';

const LeagueFilter = ({ leagues, selectedLeague, onLeagueSelect, isMobileOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  
  // Debug the specific league IDs to identify duplicates
  console.log("League IDs:", leagues.map(league => league.id));
  
  // Filter leagues based on search query
  const filteredLeagues = leagues.filter(league => 
    league.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (league.country?.name && league.country.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get leagues to display based on showAll state and screen size
  const displayedLeagues = isMobileOpen ? filteredLeagues : (showAll ? filteredLeagues : filteredLeagues.slice(0, 5));

  // Prevent body scroll when mobile filter is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen]);

  // Generate a unique key for a league
  const getUniqueLeagueKey = (league, index) => {
    // If the league has a name, use it as part of the key to make it more unique
    if (league.name) {
      return `${league.name.replace(/\s+/g, '-').toLowerCase()}-${league.id || index}`;
    }
    
    // Fallback to index if no other unique identifier exists
    return `league-${index}`;
  };

  // Compare league IDs properly for selection
  const isLeagueSelected = (league) => {
    if (typeof selectedLeague === 'string' && typeof league.id === 'number') {
      // Handle string vs number comparisons
      return selectedLeague === league.id.toString();
    } else if (typeof selectedLeague === 'number' && typeof league.id === 'string') {
      // Handle number vs string comparisons
      return selectedLeague.toString() === league.id;
    }
    // Direct comparison for same types
    return selectedLeague === league.id;
  };

  // Desktop version
  if (!isMobileOpen) {
    return (
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        {/* Updated header to match NewLeagueFilter style */}
        <div className="bg-[#242938] p-3 border-b border-gray-700">
          <div className="flex items-center gap-2 justify-between">
            <h2 className="text-emerald-400 text-sm font-medium">Today's Events</h2>
            <Calendar size={16} className="text-gray-400" />
          </div>
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={14} />
          </div>
        </div>
        
        {/* All Leagues button */}
        <button 
          className={`w-full p-3 text-left hover:bg-[#2a2f3d] transition-colors ${!selectedLeague ? 'bg-[#2a2f3d] text-emerald-400' : 'text-white'}`}
          onClick={() => onLeagueSelect(null)}
        >
          <div className="flex items-center">
            <span className="text-sm font-medium">All Leagues</span>
          </div>
        </button>
        
        {/* League list */}
        <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
          {displayedLeagues.map((league, index) => {
            const uniqueKey = getUniqueLeagueKey(league, index);
            
            return (
              <button 
                key={uniqueKey}
                className={`w-full p-3 text-left hover:bg-[#2a2f3d] transition-colors ${isLeagueSelected(league) ? 'bg-[#2a2f3d] text-emerald-400' : 'text-white'}`}
                onClick={() => onLeagueSelect(league.id)}
              >
                <div className="flex items-center">
                  {/* League icon/flag if available */}
                  <div className="mr-3 flex items-center space-x-2">
                    {league.country?.flag && (
                      <img 
                        src={league.country.flag} 
                        alt={league.country.name || ''}
                        className="w-4 h-3 object-cover rounded-sm"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    {league.emblem && (
                      <img 
                        src={league.emblem} 
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
                </div>
              </button>
            );
          })}
          
          {/* Show More button */}
          {filteredLeagues.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full p-3 text-sm text-gray-400 hover:bg-[#2a2f3d] flex items-center justify-center gap-1"
            >
              {showAll ? 'Show Less' : 'Show More'}
              <ChevronDown 
                size={16}
                className={`transform transition-transform ${showAll ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>
      </div>
    );
  }
  
  // Mobile version
  return (
    <div className={`fixed inset-0 z-50 bg-black bg-opacity-75 transition-opacity ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className={`fixed right-0 top-0 bottom-0 w-72 bg-gray-900 transform transition-transform ${isMobileOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-emerald-400 text-sm font-medium flex items-center gap-2">
            <Calendar size={16} className="text-emerald-400" />
            Today's Events
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={14} />
          </div>
        </div>
        
        {/* All Leagues button */}
        <button 
          className={`w-full p-3 text-left hover:bg-[#2a2f3d] transition-colors ${!selectedLeague ? 'bg-[#2a2f3d] text-emerald-400' : 'text-white'}`}
          onClick={() => {
            onLeagueSelect(null);
            onClose();
          }}
        >
          <div className="flex items-center">
            <span className="text-sm font-medium">All Leagues</span>
          </div>
        </button>
        
        {/* League list */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 130px)' }}>
          {filteredLeagues.map((league, index) => {
            const uniqueKey = getUniqueLeagueKey(league, index);
            
            return (
              <button 
                key={uniqueKey}
                className={`w-full p-3 text-left hover:bg-[#2a2f3d] transition-colors ${isLeagueSelected(league) ? 'bg-[#2a2f3d] text-emerald-400' : 'text-white'}`}
                onClick={() => {
                  onLeagueSelect(league.id);
                  onClose();
                }}
              >
                <div className="flex items-center">
                  {/* League icon/flag if available */}
                  <div className="mr-3 flex items-center space-x-2">
                    {league.country?.flag && (
                      <img 
                        src={league.country.flag} 
                        alt={league.country.name || ''}
                        className="w-4 h-3 object-cover rounded-sm"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    {league.emblem && (
                      <img 
                        src={league.emblem} 
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
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LeagueFilter;