import React, { useState, useEffect } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import api from '../api';
import { LogoService } from '../services/logoService';

const LeagueStats = () => {
  const [leagueStats, setLeagueStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: 'accuracy',
    direction: 'desc'
  });

  useEffect(() => {
    const fetchLeagueStats = async () => {
      try {
        setIsLoading(true);
        
        // First check for cached data to show something immediately
        const cachedData = sessionStorage.getItem('leagueStats');
        const cachedTimestamp = sessionStorage.getItem('leagueStatsTimestamp');
        const now = Date.now();
        const CACHE_VALIDITY = 5 * 60 * 1000; // 5 minutes
        
        // Use cached data if it's fresh (less than 5 minutes old)
        if (cachedData && cachedTimestamp && (now - parseInt(cachedTimestamp) < CACHE_VALIDITY)) {
          const parsed = JSON.parse(cachedData);
          setLeagueStats(parsed);
          setIsLoading(false);
        }
        
        // Always fetch fresh data (even if we showed cached data)
        const response = await api.fetchLeagueStats();
        
        // Handle both possible response formats
        let statsData;
        if (Array.isArray(response)) {
          // Direct array response from new endpoint
          statsData = response;
        } else if (response?.data && Array.isArray(response.data)) {
          // Traditional axios response with data property
          statsData = response.data;
        } else if (response?.stats && Array.isArray(response.stats)) {
          // New format with stats property
          statsData = response.stats;
        } else {
          throw new Error('Unexpected data format from API');
        }
        
        // Save to state
        setLeagueStats(statsData);
        setIsLoading(false);
        
        // Cache the data with timestamp
        sessionStorage.setItem('leagueStats', JSON.stringify(statsData));
        sessionStorage.setItem('leagueStatsTimestamp', now.toString());
      } catch (err) {
        console.error('League stats fetch error:', err);
        setError(err.message || 'Failed to load league statistics');
        setIsLoading(false);
      }
    };

    fetchLeagueStats();
  }, []);

  const handleSort = (key) => {
    setSortConfig((currentSort) => {
      if (currentSort.key === key) {
        return {
          key,
          direction: currentSort.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return {
        key,
        direction: 'desc'
      };
    });
  };

  const getSortedData = () => {
    if (!leagueStats || !leagueStats.length) return [];
    
    const sortedData = [...leagueStats].sort((a, b) => {
      if (sortConfig.key === 'name') {
        return sortConfig.direction === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      
      const aValue = parseFloat(a[sortConfig.key]) || 0;
      const bValue = parseFloat(b[sortConfig.key]) || 0;
      
      return sortConfig.direction === 'asc'
        ? aValue - bValue
        : bValue - aValue;
    });

    return sortedData;
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 ml-1 inline-block text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 ml-1 inline-block text-green-500" />
      : <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4 ml-1 inline-block text-green-500" />;
  };

  const renderSortableHeader = (mobileLabel, desktopLabel, key, className = '') => (
    <th 
      className={`px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 ${className}`}
      onClick={() => handleSort(key)}
    >
      <div className="flex items-center justify-center">
        <span className="sm:hidden">{mobileLabel}</span>
        <span className="hidden sm:inline">{desktopLabel}</span>
        <SortIcon columnKey={key} />
      </div>
    </th>
  );

  if (isLoading && !leagueStats.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-2 sm:p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  if (error && !leagueStats.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-2 sm:p-6">
        <div className="text-center text-red-500 p-4">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  const sortedData = getSortedData();

  return (
    <div className="bg-white rounded-xl shadow-lg p-2 sm:p-6">
      <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-4">League Performance</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-full table-auto">
          <thead>
            <tr className="border-b border-gray-200">
              {renderSortableHeader('League', 'League', 'name', 'text-left')}
              {renderSortableHeader('M', 'Matches', 'totalPredictions', 'text-center')}
              {renderSortableHeader('C', 'Correct', 'correctPredictions', 'text-center')}
              {renderSortableHeader('Acc', 'Accuracy', 'accuracy', 'text-center')}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedData.length > 0 ? (
              sortedData.map((league) => (
                <tr key={league.id} className="hover:bg-gray-50">
                  <td className="px-2 sm:px-4 py-2 sm:py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        {league.country?.flag && (
                          <img 
                            src={league.country.flag} 
                            alt={league.country.name || ''}
                            className="w-3 h-3 sm:w-3.5 sm:h-3.5 object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        )}
                        <img 
                          src={LogoService.getCompetitionLogoPath(league.id).localPath} 
                          alt={league.name}
                          className="w-4 h-4 sm:w-5 sm:h-5 object-contain"
                          onError={(e) => {
                            // If local path fails, try API path
                            const paths = LogoService.getCompetitionLogoPath(league.id);
                            e.target.src = paths.apiPath;
                            // Add another error handler for API path failure
                            e.target.onerror = () => {
                              e.target.src = '/placeholder-emblem.png';
                              e.target.onerror = null; // Prevent infinite loop
                            };
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-900">{league.name}</span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-sm text-gray-600">
                    {league.totalPredictions}
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-sm text-gray-600">
                    {league.correctPredictions}
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                    <div 
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" 
                      style={{
                        backgroundColor: `rgba(${league.accuracy >= 50 ? '52, 211, 153' : '239, 68, 68'}, 0.1)`,
                        color: league.accuracy >= 50 ? 'rgb(4, 120, 87)' : 'rgb(185, 28, 28)'
                      }}
                    >
                      {parseFloat(league.accuracy).toFixed(1)}%
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                  No league stats available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeagueStats;