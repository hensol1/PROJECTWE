import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const TopLeaguesPerformance = ({ displayMode = 'desktop' }) => {
  const [topLeagues, setTopLeagues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTopLeagues = async () => {
      try {
        setIsLoading(true);
        
        // First check for cached data
        const cachedData = sessionStorage.getItem('topLeagues');
        const cachedTimestamp = sessionStorage.getItem('topLeaguesTimestamp');
        const now = Date.now();
        const CACHE_VALIDITY = 15 * 60 * 1000; // 15 minutes
        
        // Use cached data if it's fresh
        if (cachedData && cachedTimestamp && (now - parseInt(cachedTimestamp) < CACHE_VALIDITY)) {
          const parsed = JSON.parse(cachedData);
          setTopLeagues(parsed);
          setIsLoading(false);
        }
        
        // Fetch fresh data (even if we showed cached data)
        const response = await api.fetchLeagueStats();
        
        // Handle different response formats
        let leaguesData;
        if (Array.isArray(response)) {
          // Direct array response from new endpoint
          leaguesData = response;
        } else if (response?.data && Array.isArray(response.data)) {
          // Traditional axios response with data property
          leaguesData = response.data;
        } else if (response?.stats && Array.isArray(response.stats)) {
          // New format with stats property
          leaguesData = response.stats;
        } else {
          throw new Error('Unexpected data format from API');
        }
        
        // Filter leagues with 15 or more matches, then sort by accuracy
        const filteredAndSorted = [...leaguesData]
          .filter(league => league.totalPredictions >= 15)
          .sort((a, b) => b.accuracy - a.accuracy)
          .slice(0, 3);
        
        // Save to state
        setTopLeagues(filteredAndSorted);
        setIsLoading(false);
        
        // Cache the data with timestamp
        sessionStorage.setItem('topLeagues', JSON.stringify(filteredAndSorted));
        sessionStorage.setItem('topLeaguesTimestamp', now.toString());
      } catch (error) {
        console.error('Error fetching top leagues:', error);
        setIsLoading(false);
      }
    };
  
    fetchTopLeagues();
  }, []);
  
  const handleTableClick = () => {
    navigate('/stats', { state: { activeTab: 'league' } });
  };

  if (isLoading && topLeagues.length === 0) {
    return (
      <div className={`bg-gray-900 rounded-lg ${displayMode === 'desktop' ? 'p-4' : 'p-2'} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (displayMode === 'mobile') {
    return (
      <div 
        className="bg-[#1a1f2b] rounded-lg overflow-hidden cursor-pointer"
        onClick={handleTableClick}
      >
        {/* Perfectly matching the Today's Odds mobile header style */}
        <div className="p-3">
          <Trophy size={14} className="text-emerald-400 inline-block mr-2" />
          <span className="text-emerald-400 text-sm">
            Top Performing Leagues
          </span>
        </div>

        {/* Leagues List */}
        <div className="space-y-2 px-3 pb-3">
          {topLeagues.length > 0 ? (
            topLeagues.map((league, index) => (
              <div key={league.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-400">#{index + 1}</span>
                  <div className="flex items-center gap-1.5">
                    {league.country?.flag && (
                      <img 
                        src={league.country.flag} 
                        alt={league.country.name || ''}
                        className="w-3 h-3 object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <img 
                      src={league.emblem} 
                      alt={league.name}
                      className="w-4 h-4 object-contain"
                      onError={(e) => {
                        e.target.src = '/placeholder-emblem.png';
                      }}
                    />
                    <span className="text-xs text-gray-300 truncate max-w-[110px]">
                      {league.name}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-medium text-emerald-400">
                  {parseFloat(league.accuracy).toFixed(1)}%
                </span>
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-400 text-center py-2">
              No league data available
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div 
      className="bg-gray-900 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-800"
      onClick={handleTableClick}
    >
      {/* Updated header to match Today's Odds style */}
      <div className="bg-[#242938] p-3 border-b border-gray-700">
        <div className="flex items-center gap-2 justify-between">
          <h2 className="text-emerald-400 text-sm font-medium">
            Top Performing Leagues
          </h2>
          <Trophy size={16} className="text-gray-400" />
        </div>
      </div>
        
      <div className="space-y-2 p-4">
        {topLeagues.length > 0 ? (
          topLeagues.map((league, index) => (
            <div 
              key={league.id} 
              className="flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-sm font-medium">
                  #{index + 1}
                </span>
                <div className="flex items-center gap-1.5">
                  {league.country?.flag && (
                    <img 
                      src={league.country.flag} 
                      alt={league.country.name || ''}
                      className="w-4 h-4 object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <img 
                    src={league.emblem} 
                    alt={league.name}
                    className="w-5 h-5 object-contain"
                    onError={(e) => {
                      e.target.src = '/placeholder-emblem.png';
                    }}
                  />
                  <span className="text-sm text-gray-200">
                    {league.name}
                  </span>
                </div>
              </div>
              <span className="text-sm font-medium text-emerald-400">
                {parseFloat(league.accuracy).toFixed(1)}%
              </span>
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-400 text-center py-4">
            No league data available
          </div>
        )}
      </div>
    </div>
  );
};

export default TopLeaguesPerformance;