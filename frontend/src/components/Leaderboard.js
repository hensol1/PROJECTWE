import React, { useState, useEffect } from 'react';
import api from '../api';

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
    <div className="max-w-full mx-auto mt-8 p-2 sm:p-6 bg-white rounded-lg shadow-md overflow-x-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">Leaderboard</h1>
      
      {userRank !== null && (
        <div className="mb-4 p-2 bg-blue-100 rounded text-center">
          Your rank: {userRank}
        </div>
      )}      
      <table className="w-full table-auto">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-2 sm:px-4 text-left">Rank</th>
            <th className="py-2 px-2 sm:px-4 text-left">User</th>
            <th className="py-2 px-2 sm:px-4 text-left hidden sm:table-cell">Finished</th>
            <th className="py-2 px-2 sm:px-4 text-left hidden sm:table-cell">Correct</th>
            <th className="py-2 px-2 sm:px-4 text-left">Accuracy</th>
            <th className="py-2 px-2 sm:px-4 text-left">Score</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((user, index) => (
            <tr key={user._id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
              <td className="py-2 px-2 sm:px-4">{indexOfFirstItem + index + 1}</td>
              <td className="py-2 px-2 sm:px-4">
                <div className="flex items-center">
                  <img 
                    src={`https://flagcdn.com/24x18/${user.country.toLowerCase()}.png`}
                    alt={`${user.country} flag`}
                    className="mr-2"
                  />
                  {user.username}
                </div>
              </td>
              <td className="py-2 px-2 sm:px-4 hidden sm:table-cell">{user.finishedVotes}</td>
              <td className="py-2 px-2 sm:px-4 hidden sm:table-cell">{user.correctVotes}</td>
              <td className="py-2 px-2 sm:px-4">{user.accuracy}%</td>
              <td className="py-2 px-2 sm:px-4">{user.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="mt-4 flex justify-center">
        {Array.from({ length: Math.ceil(leaderboard.length / itemsPerPage) }, (_, i) => (
          <button
            key={i}
            onClick={() => paginate(i + 1)}
            className={`mx-1 px-3 py-1 rounded ${
              currentPage === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="mt-4 text-center relative">
        <span 
          className="text-blue-500 cursor-pointer underline"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          How the scoring system works
        </span>
        {showTooltip && (
          <div className="absolute z-10 p-4 bg-gray-800 text-white text-sm rounded-lg shadow-lg max-w-xs mx-auto left-0 right-0 bottom-full mb-2">
            <p className="mb-2">We use a fair ranking system called the Wilson score. Here's how it works:</p>
            <ul className="list-disc pl-4">
              <li>It balances your accuracy with the number of predictions you've made.</li>
              <li>Making more predictions gives a more reliable score.</li>
              <li>High accuracy with few predictions won't unfairly outrank consistent predictors.</li>
              <li>It rewards both accuracy and participation.</li>
              <li>Keep predicting to improve your rank!</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;