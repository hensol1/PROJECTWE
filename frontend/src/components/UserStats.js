import React, { useState, useEffect } from 'react';
import api from '../api';
import { format, parseISO } from 'date-fns';
import { BiTrophy, BiHistory } from "react-icons/bi";

const UserStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [leaguePage, setLeaguePage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState('league');
  const leaguesPerPage = 5;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.getUserStats();
        setStats(response.data);
        setLoading(false);
      } catch (err) {
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
  
  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedVoteHistory.slice(indexOfFirstItem, indexOfLastItem);
  
  const indexOfLastLeague = leaguePage * leaguesPerPage;
  const indexOfFirstLeague = indexOfLastLeague - leaguesPerPage;
  const currentLeagues = sortedLeagueStats.slice(indexOfFirstLeague, indexOfLastLeague);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const paginateLeagues = (pageNumber) => setLeaguePage(pageNumber);


  return (
    <div className="max-w-4xl mx-auto mt-4 sm:mt-8 p-2 sm:p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 text-center">User Statistics</h1>
      
      {/* Even smaller Stats Cards - Single row on all devices */}
      <div className="flex flex-row justify-between gap-2 mb-6">
        <div className="bg-blue-50 p-1.5 sm:p-2 rounded-lg shadow-sm text-center flex-1">
          <div className="text-lg sm:text-xl font-bold text-blue-600">{stats.totalVotes}</div>
          <div className="text-[10px] sm:text-xs text-gray-600">Total Votes</div>
        </div>
        <div className="bg-green-50 p-1.5 sm:p-2 rounded-lg shadow-sm text-center flex-1">
          <div className="text-lg sm:text-xl font-bold text-green-600">{stats.finishedVotes}</div>
          <div className="text-[10px] sm:text-xs text-gray-600">Finished Matches</div>
        </div>
        <div className="bg-purple-50 p-1.5 sm:p-2 rounded-lg shadow-sm text-center flex-1">
          <div className="text-lg sm:text-xl font-bold text-purple-600">{stats.correctVotes}</div>
          <div className="text-[10px] sm:text-xs text-gray-600">Correct Votes</div>
        </div>
        <div className="bg-yellow-50 p-1.5 sm:p-2 rounded-lg shadow-sm text-center flex-1">
          <div className="text-lg sm:text-xl font-bold text-yellow-600">
            {stats.finishedVotes > 0 ? ((stats.correctVotes / stats.finishedVotes) * 100).toFixed(1) : 0}%
          </div>
          <div className="text-[10px] sm:text-xs text-gray-600">Overall Accuracy</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-gray-100 p-0.5 rounded-lg shadow-md">
          <button
            onClick={() => setActiveTab('league')}
            className={`
              px-3 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all
              flex items-center justify-center
              ${activeTab === 'league' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}
            `}
          >
            <BiTrophy className="mr-1 sm:mr-2" />
            League Statistics
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`
              px-3 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all
              flex items-center justify-center
              ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}
            `}
          >
            <BiHistory className="mr-1 sm:mr-2" />
            Vote History
          </button>
        </div>
      </div>

      {/* League Statistics Tab - With fixed width logo column */}
      {activeTab === 'league' && (
        <div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-center w-full">League</th>
                  <th className="px-4 py-2 text-center w-24">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {currentLeagues.map((league, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div className="flex items-center">
                        <div className="w-8 flex justify-center">
                          <img 
                            src={league.leagueEmblem} 
                            alt={league.leagueName}
                            className="w-6 h-6"
                          />
                        </div>
                        <span className="ml-2">{league.leagueName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`inline-block min-w-[60px] px-2 py-0.5 rounded text-sm ${
                        league.accuracy >= 70 ? 'bg-green-100 text-green-800' :
                        league.accuracy >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {league.accuracy.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* League Pagination */}
          <div className="mt-4 flex justify-center gap-1">
            {Array.from({ length: Math.ceil(sortedLeagueStats.length / leaguesPerPage) }, (_, i) => (
              <button
                key={i}
                onClick={() => paginateLeagues(i + 1)}
                className={`min-w-[32px] px-2 py-1 rounded text-sm ${
                  leaguePage === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Vote History Tab */}
      {activeTab === 'history' && (
        <div>
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
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-center">Date</th>
                  <th className="px-2 py-2 hidden sm:table-cell text-center">Competition</th>
                  <th className="px-2 py-2 text-center">Match</th>
                  <th className="px-2 py-2 text-center">Vote</th>
                  <th className="px-2 py-2 text-center">Result</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((vote, index) => (
                  <tr key={index} className={`border-b ${
                    vote.isCorrect === true ? 'bg-green-50' : 
                    vote.isCorrect === false ? 'bg-red-50' : ''
                  }`}>
                    <td className="px-2 py-2 text-center">{format(parseISO(vote.date), 'dd MMM')}</td>
                    <td className="px-2 py-2 hidden sm:table-cell">
                      <div className="flex items-center justify-center">
                        <img src={vote.competition.emblem} alt="" className="w-4 h-4 mr-1" />
                        <span className="truncate">{vote.competition.name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <span className="truncate">{vote.homeTeam}</span>
                        <span>vs</span>
                        <span className="truncate">{vote.awayTeam}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center capitalize">{vote.vote}</td>
                    <td className="px-2 py-2 text-center">
                      {vote.status === 'FINISHED' ? 
                        `${vote.score.home}-${vote.score.away}` : 
                        vote.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Vote History Pagination */}
          <div className="mt-4 flex justify-center">
            {Array.from({ length: Math.ceil(sortedVoteHistory.length / itemsPerPage) }, (_, i) => (
              <button
                key={i}
                onClick={() => paginate(i + 1)}
                className={`mx-1 px-3 py-1 rounded ${
                  currentPage === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
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