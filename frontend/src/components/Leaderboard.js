import React, { useState, useEffect } from 'react';
import api from '../api';
import { InfoIcon, MapPinIcon } from 'lucide-react';
import LoadingLogo from './LoadingLogo';
import { Country } from 'country-state-city';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [userRank, setUserRank] = useState(null);
  const [weeklyUserRank, setWeeklyUserRank] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [locationRankings, setLocationRankings] = useState(null);
  const [showLocationRankings, setShowLocationRankings] = useState(false);
  const [activeTab, setActiveTab] = useState('weekly');
  const itemsPerPage = 15;

  const [lastFetchTime, setLastFetchTime] = useState(0);
  const REFRESH_INTERVAL = 60 * 1000;

  const formatCountryCode = (countryName) => {
    if (!countryName) return '';
    
    // If it's already a 2-letter code, just return it lowercase
    if (countryName.length === 2) {
      return countryName.toLowerCase();
    }

    // Find the country code using country-state-city
    const country = Country.getAllCountries().find(
      country => country.name.toLowerCase() === countryName.toLowerCase()
    );

    return country ? country.isoCode.toLowerCase() : countryName.toLowerCase();
  };

  const fetchAllRankings = async (force = false) => {
    try {
      const currentTime = Date.now();
      if (!force && lastFetchTime && currentTime - lastFetchTime < REFRESH_INTERVAL) {
        return;
      }

      const [allTimeResponse, weeklyResponse, locationResponse] = await Promise.all([
        api.getLeaderboard(),
        api.getWeeklyLeaderboard(),
        api.getLocationRankings()
      ]);

      setLeaderboard(allTimeResponse.data);
      setWeeklyLeaderboard(weeklyResponse.data);
      setLocationRankings(locationResponse.data);
      setLastFetchTime(currentTime);

      const userId = localStorage.getItem('userId');
      if (userId) {
        // Set all-time rank
        const userIndex = allTimeResponse.data.findIndex(user => 
          user._id === userId || user._id.endsWith(userId) || userId.endsWith(user._id)
        );
        if (userIndex !== -1) setUserRank(userIndex + 1);

        // Set weekly rank
        const weeklyUserIndex = weeklyResponse.data.findIndex(user => 
          user._id === userId || user._id.endsWith(userId) || userId.endsWith(user._id)
        );
        if (weeklyUserIndex !== -1) setWeeklyUserRank(weeklyUserIndex + 1);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching rankings:', err);
      setError(`Failed to load rankings: ${err.response?.data?.message || err.message}`);
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Initial fetch with delay
    const timer = setTimeout(() => {
      fetchAllRankings(true);
    }, 1000);

    // Set up periodic refresh
    const refreshInterval = setInterval(() => {
      fetchAllRankings();
    }, REFRESH_INTERVAL);

    return () => {
      clearTimeout(timer);
      clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'userId') {
        fetchAllRankings(true);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (loading) return <LoadingLogo />;

  if (error) return (
    <div className="text-center mt-8 text-red-500">
      <p>{error}</p>
      <button 
        onClick={() => fetchAllRankings(true)}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Try Again
      </button>
    </div>
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = leaderboard.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const LocationRankings = () => (
    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Top Countries */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-bold mb-4 flex items-center">
          <MapPinIcon className="mr-2 h-5 w-5 text-blue-500" />
          Top Countries
        </h2>
        <div className="space-y-3">
          {locationRankings?.topCountries.map((country, index) => (
            <div key={country.country} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-semibold w-6">#{index + 1}</span>
                <img 
                  src={`https://flagcdn.com/24x18/${formatCountryCode(country.country)}.png`}
                  alt={`${country.country} flag`}
                  className="w-6 h-4"
                  onError={(e) => {
                    console.log(`Failed to load flag for country: ${country.country}`);
                    e.target.style.display = 'none';
                  }}
                />
                <span>{country.country}</span>
              </div>
              <div className="text-right">
                <div className="font-medium text-blue-600">{country.averageScore.toFixed(1)}%</div>
                <div className="text-xs text-gray-500">{country.userCount} users</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Cities */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-bold mb-4 flex items-center">
          <MapPinIcon className="mr-2 h-5 w-5 text-green-500" />
          Top Cities
        </h2>
        <div className="space-y-3">
          {locationRankings?.topCities.map((city, index) => (
            <div key={`${city.country}-${city.city}`} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-semibold w-6">#{index + 1}</span>
                <div>
                  <div className="font-medium">{city.city}</div>
                  <div className="text-xs text-gray-500">{city.country}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-green-600">{city.averageScore.toFixed(1)}%</div>
                <div className="text-xs text-gray-500">{city.userCount} users</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-full mx-auto mt-4 space-y-6">
      <div className="p-1 sm:p-6 bg-white rounded-lg shadow-md overflow-x-auto">
        <div className="flex justify-between items-center mb-2 sm:mb-4">
          <div className="flex items-center">
            <h1 className="text-xl sm:text-2xl font-bold">Leaderboard</h1>
            <div className="ml-1 sm:ml-2 cursor-pointer relative" onClick={() => setShowTooltip(!showTooltip)}>
              <InfoIcon size={18} className="text-gray-500" />
              {showTooltip && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                  <div className="bg-white rounded-lg p-4 max-w-xs w-full shadow-lg">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTooltip(false);
                      }}
                      className="float-right text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                    <p className="text-sm text-gray-700 mb-2">We use a fair ranking system called the Wilson score. Here's how it works:</p>
                    <ul className="list-disc pl-4 text-sm text-gray-700">
                      <li>It balances your accuracy with the number of predictions you've made.</li>
                      <li>Making more predictions gives a more reliable score.</li>
                      <li>High accuracy with few predictions won't unfairly outrank consistent predictors.</li>
                      <li>It rewards both accuracy and participation.</li>
                      <li>Keep predicting to improve your rank!</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('weekly')}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  activeTab === 'weekly' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setActiveTab('allTime')}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  activeTab === 'allTime' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'
                }`}
              >
                All Time
              </button>
            </div>
            <button
              onClick={() => setShowLocationRankings(!showLocationRankings)}
              className="flex items-center px-3 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-600 text-sm"
            >
              <MapPinIcon className="mr-1 h-4 w-4" />
              {showLocationRankings ? 'Show Global' : 'Show Locations'}
            </button>
          </div>
        </div>
  
        {!showLocationRankings && (
          <>
            {((activeTab === 'weekly' && weeklyUserRank !== null) || 
              (activeTab === 'allTime' && userRank !== null)) && (
              <div className="mb-2 sm:mb-4 p-1 sm:p-2 bg-blue-100 rounded text-center text-sm">
                Your rank: {activeTab === 'weekly' ? weeklyUserRank : userRank}
              </div>
            )}
            <table className="w-full table-fixed text-center">
              <thead>
                <tr className="bg-gray-100 text-xs sm:text-base">
                  <th className="py-1 px-1 sm:py-2 sm:px-4 text-center w-[10%]">#</th>
                  <th className="py-1 px-1 sm:py-2 sm:px-4 text-left w-[30%]">User</th>
                  <th className="py-1 px-1 sm:py-2 sm:px-4 text-center w-[20%]">
                    <span className="hidden sm:inline">Matches</span>
                    <span className="sm:hidden">Matches</span>
                  </th>
                  <th className="py-1 px-1 sm:py-2 sm:px-4 text-center w-[15%]">Acc</th>
                  <th className="py-1 px-1 sm:py-2 sm:px-4 text-center w-[25%]">Score</th>
                </tr>
              </thead>
              <tbody className="text-xs sm:text-base">
                {(activeTab === 'weekly' ? weeklyLeaderboard : leaderboard)
                  .slice(indexOfFirstItem, indexOfLastItem)
                  .map((user, index) => (
                    <tr 
                      key={user._id} 
                      className={`${index % 2 === 0 ? 'bg-gray-50' : ''} 
                        ${user._id === localStorage.getItem('userId') ? 'bg-blue-50' : ''}`}
                    >
                      <td className="py-1 px-1 sm:py-2 sm:px-4 text-center">
                        {indexOfFirstItem + index + 1}
                      </td>
                      <td className="py-1 px-1 sm:py-2 sm:px-4">
                        <div className="flex items-center justify-start space-x-1">
                          {user.country && (
                            <img 
                              src={`https://flagcdn.com/24x18/${formatCountryCode(user.country)}.png`}
                              alt={`${user.country} flag`}
                              className="w-4 h-3 sm:w-6 sm:h-4"
                              onError={(e) => {
                                console.log(`Failed to load flag for country: ${user.country}`);
                                e.target.style.display = 'none';
                              }}
                            />
                          )}
                          <span className="truncate">{user.username}</span>
                        </div>
                      </td>
                      <td className="py-1 px-1 sm:py-2 sm:px-4 text-center">
                        {user.finishedVotes}
                      </td>
                      <td className="py-1 px-1 sm:py-2 sm:px-4 text-center">
                        {user.accuracy}%
                      </td>
                      <td className="py-1 px-1 sm:py-2 sm:px-4 text-center font-medium">
                        {user.score}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
  
            <div className="mt-2 sm:mt-4 flex justify-center">
              {Array.from({ 
                length: Math.ceil(
                  (activeTab === 'weekly' ? weeklyLeaderboard : leaderboard).length / itemsPerPage
                )}, (_, i) => (
                <button
                  key={i}
                  onClick={() => paginate(i + 1)}
                  className={`mx-0.5 sm:mx-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded text-xs sm:text-base ${
                    currentPage === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </>
        )}
  
        {showLocationRankings && locationRankings && <LocationRankings />}
      </div>
    </div>
  );
};

export default Leaderboard;