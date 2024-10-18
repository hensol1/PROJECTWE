import React, { useState, useEffect } from 'react';
import api from '../api';
import { format, parseISO } from 'date-fns';

const UserStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState('league');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.getUserStats();
        console.log('Received stats:', response.data); // Add this line for debugging
        setStats(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching stats:', err); // Add this line for debugging
        setError('Failed to load stats');
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <div className="text-center mt-8">Loading...</div>;
  if (error) return <div className="text-center mt-8 text-red-500">{error}</div>;
  if (!stats) return null;

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const sortedVoteHistory = [...stats.voteHistory].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  const sortedLeagueStats = [...stats.leagueStats].sort((a, b) => b.accuracy - a.accuracy);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedVoteHistory.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="max-w-4xl mx-auto mt-4 sm:mt-8 p-2 sm:p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 text-center">User Statistics</h1>
      
      <div className="mb-6 text-center">
        <p><strong>Total Votes:</strong> {stats.totalVotes}</p>
        <p><strong>Finished Matches:</strong> {stats.finishedVotes}</p>
        <p><strong>Correct Votes:</strong> {stats.correctVotes}</p>
        <p><strong>Overall Accuracy:</strong> {stats.finishedVotes > 0 ? ((stats.correctVotes / stats.finishedVotes) * 100).toFixed(1) : 0}%</p>
      </div>

      <div className="mb-4 flex justify-center">
        <button
          onClick={() => setActiveTab('league')}
          className={`px-4 py-2 mr-2 rounded ${activeTab === 'league' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          League Statistics
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded ${activeTab === 'history' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Vote History
        </button>
      </div>

      {activeTab === 'league' && (
        <div>
          <h2 className="text-lg sm:text-xl font-bold mb-2 text-center">League Statistics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
            {sortedLeagueStats.map((league, index) => (
              <div key={index} className="bg-gray-100 p-2 rounded flex items-center text-sm">
                {league.leagueEmblem && (
                  <img 
                    src={league.leagueEmblem} 
                    alt={`${league.leagueName} emblem`} 
                    className="w-6 h-6 sm:w-8 sm:h-8 mr-2"
                  />
                )}
                <div>
                  <p><strong>{league.leagueName}</strong></p>
                  <p>{league.accuracy.toFixed(1)}% accuracy</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          <h2 className="text-lg sm:text-xl font-bold mb-2 text-center">Vote History</h2>
          <div className="mb-2 flex justify-between items-center">
            <button 
              onClick={toggleSortOrder}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 sm:py-2 sm:px-4 rounded text-sm"
            >
              Sort {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
            <div className="text-sm">
              Page {currentPage} of {Math.ceil(sortedVoteHistory.length / itemsPerPage)}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full bg-white text-xs sm:text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-1 px-1 sm:px-2 border-b">Date</th>
                  <th className="py-1 px-1 sm:px-2 border-b hidden sm:table-cell">Competition</th>
                  <th className="py-1 px-1 sm:px-2 border-b">Match</th>
                  <th className="py-1 px-1 sm:px-2 border-b">Vote</th>
                  <th className="py-1 px-1 sm:px-2 border-b">Result</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((vote, index) => (
                  <tr key={index} className={vote.isCorrect === true ? 'bg-green-100' : (vote.isCorrect === false ? 'bg-red-100' : '')}>
                    <td className="py-1 px-1 sm:px-2 border-b">{format(parseISO(vote.date), 'dd MMM')}</td>
                    <td className="py-1 px-1 sm:px-2 border-b hidden sm:table-cell">
                      <div className="flex items-center">
                        <img src={vote.competition.emblem} alt={vote.competition.name} className="w-4 h-4 sm:w-6 sm:h-6 mr-1" />
                        <span className="text-xs sm:text-sm truncate">{vote.competition.name}</span>
                      </div>
                    </td>
                    <td className="py-1 px-1 sm:px-2 border-b">
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="truncate">{vote.homeTeam}</span>
                        <span className="hidden sm:inline mx-1">vs</span>
                        <span className="truncate">{vote.awayTeam}</span>
                      </div>
                    </td>
                    <td className="py-1 px-1 sm:px-2 border-b capitalize">{vote.vote}</td>
                    <td className="py-1 px-1 sm:px-2 border-b">
                      {vote.status === 'FINISHED' 
                        ? `${vote.score.home}-${vote.score.away}`
                        : vote.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-center">
            {Array.from({ length: Math.ceil(sortedVoteHistory.length / itemsPerPage) }, (_, i) => (
              <button
                key={i}
                onClick={() => paginate(i + 1)}
                className={`mx-1 px-2 py-1 rounded text-sm ${
                  currentPage === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserStats;