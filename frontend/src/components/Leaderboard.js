import React, { useState, useEffect } from 'react';
import api from '../api';
import { InfoIcon } from 'lucide-react';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [userRank, setUserRank] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const itemsPerPage = 15;

  const fetchLeaderboard = async () => {
    try {
      console.log('Fetching leaderboard');
      const response = await api.getLeaderboard();
      console.log('Leaderboard data received:', response.data);
      setLeaderboard(response.data);

      console.log('All localStorage items:', { ...localStorage });

      const userId = localStorage.getItem('userId');
      console.log('User ID from localStorage:', userId);
      if (userId) {
        // Try to find the user by exact match first
        let userIndex = response.data.findIndex(user => user._id === userId);
        
        // If not found, try to match the last part of the ID (in case of ObjectId vs string mismatch)
        if (userIndex === -1) {
          userIndex = response.data.findIndex(user => user._id.endsWith(userId) || userId.endsWith(user._id));
        }
        
        console.log('User index in leaderboard:', userIndex);
        if (userIndex !== -1) {
          setUserRank(userIndex + 1);
          console.log('User rank set:', userIndex + 1);
        } else {
          console.log('User not found in leaderboard data');
        }
      } else {
        console.log('No userId found in localStorage');
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(`Failed to load leaderboard: ${err.response?.data?.message || err.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeaderboard();
    }, 1000); // 1 second delay

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'userId') {
        console.log('userId changed in localStorage, refetching leaderboard');
        fetchLeaderboard();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (loading) return <div className="text-center mt-8">Loading...</div>;
  if (error) return <div className="text-center mt-8 text-red-500">{error}</div>;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = leaderboard.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

return (
  <div className="max-w-full mx-auto mt-4 p-1 sm:p-6 bg-white rounded-lg shadow-md overflow-x-auto">
    <div className="flex justify-center items-center mb-2 sm:mb-4">
      <h1 className="text-xl sm:text-2xl font-bold">Leaderboard</h1>
      <div 
        className="ml-1 sm:ml-2 cursor-pointer relative"
        onClick={() => setShowTooltip(!showTooltip)}
      >
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
    
    {userRank !== null && (
      <div className="mb-2 sm:mb-4 p-1 sm:p-2 bg-blue-100 rounded text-center text-sm">
        Your rank: {userRank}
      </div>
    )}      
<table className="w-full table-fixed">
  <thead>
    <tr className="bg-gray-100 text-xs sm:text-base">
      <th className="py-1 px-1 sm:py-2 sm:px-4 text-left w-[10%]">#</th>
      <th className="py-1 px-1 sm:py-2 sm:px-4 text-left w-[30%]">User</th>
      <th className="py-1 px-1 sm:py-2 sm:px-4 text-left w-[20%]">
        <span className="hidden sm:inline">Matches</span>
        <span className="sm:hidden">Matches</span>
      </th>
      <th className="py-1 px-1 sm:py-2 sm:px-4 text-left w-[15%]">Acc</th>
      <th className="py-1 px-1 sm:py-2 sm:px-4 text-left w-[25%]">Score</th>
    </tr>
  </thead>
  <tbody className="text-xs sm:text-base">
    {currentItems.map((user, index) => (
      <tr 
        key={user._id} 
        className={`${index % 2 === 0 ? 'bg-gray-50' : ''} 
          ${user._id === localStorage.getItem('userId') ? 'bg-blue-50' : ''}`}
      >
        <td className="py-1 px-1 sm:py-2 sm:px-4">
          {indexOfFirstItem + index + 1}
        </td>
        <td className="py-1 px-1 sm:py-2 sm:px-4">
          <div className="flex items-center space-x-1">
            <img 
              src={`https://flagcdn.com/24x18/${user.country.toLowerCase()}.png`}
              alt={`${user.country} flag`}
              className="w-4 h-3 sm:w-6 sm:h-4"
            />
            <span className="truncate">{user.username}</span>
          </div>
        </td>
        <td className="py-1 px-1 sm:py-2 sm:px-4">
          {user.finishedVotes}
        </td>
        <td className="py-1 px-1 sm:py-2 sm:px-4">
          {user.accuracy}%
        </td>
        <td className="py-1 px-1 sm:py-2 sm:px-4 font-medium">
          {user.score}
        </td>
      </tr>
    ))}
  </tbody>
</table>
    
    <div className="mt-2 sm:mt-4 flex justify-center">
      {Array.from({ length: Math.ceil(leaderboard.length / itemsPerPage) }, (_, i) => (
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
  </div>
);
};

export default Leaderboard;