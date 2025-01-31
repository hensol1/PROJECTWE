import React, { useState, useEffect } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import api from '../api';

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
        const response = await api.fetchLeagueStats();
        if (response?.data) {
          setLeagueStats(response.data);
        } else {
          throw new Error('No data received from the API');
        }
      } catch (err) {
        console.error('League stats fetch error:', err);
        setError(err.message || 'Failed to load league statistics');
      } finally {
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
    if (!leagueStats) return [];
    
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-2 sm:p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
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
              <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-600">
                League
              </th>
              <th className="text-center px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-600">
                Matches
              </th>
              <th className="text-center px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-600">
                Correct
              </th>
              <th className="text-center px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-600">
                Accuracy
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedData.map((league) => (
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
        src={league.emblem} 
        alt={league.name}
        className="w-4 h-4 sm:w-5 sm:h-5 object-contain"
        onError={(e) => {
          e.target.src = '/placeholder-emblem.png';
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
                    {league.accuracy}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeagueStats;