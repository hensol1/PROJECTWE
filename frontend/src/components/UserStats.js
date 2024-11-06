import React, { useState, useEffect } from 'react';
import api from '../api';
import { format, parseISO } from 'date-fns';
import { BiTrophy, BiHistory } from "react-icons/bi";
import LoadingLogo from './LoadingLogo';

const UserStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [leaguePage, setLeaguePage] = useState(1);
  const [itemsPerPage] = useState(15); // Changed to 15 to match your screenshot
  const [activeTab, setActiveTab] = useState('league');
  const [selectedCompetition, setSelectedCompetition] = useState('all');
  const leaguesPerPage = 5;
  const calculateLeagueAccuracy = (league) => {
    if (!league.totalVotes || league.totalVotes === 0) return 0;
    return (league.correctVotes / league.totalVotes) * 100;
  };


  // Define priority leagues
  const priorityLeagues = [2, 3, 39, 140, 78, 135, 61];

useEffect(() => {
  const fetchStats = async () => {
    try {
      const response = await api.getUserStats();
      console.log('Fetched stats:', response.data); // Debug log
      setStats(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load stats');
      setLoading(false);
    }
  };

  fetchStats();
}, []);

if (loading) return <LoadingLogo />; 
if (error) return <div className="text-center mt-8 text-red-500">{error}</div>;
if (!stats || !stats.leagueStats) return <div className="text-center mt-8">No stats available</div>;

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

const getUniqueLeagues = () => {
  if (!stats || !stats.voteHistory || !Array.isArray(stats.voteHistory)) return [];
  
  // Create a map for storing leagues with their vote data
  const leaguesMap = new Map();
  
  stats.voteHistory.forEach(vote => {
    if (vote.competition) {
      const leagueKey = `${vote.competition.name}_${vote.competition.id}`;
      let displayName = vote.competition.name;

      // If it's a Premier League or any other duplicate name, add the full competition info
      if (vote.competition.id) {
        displayName = `${vote.competition.name} (${vote.competition.id})`;
      }

      if (!leaguesMap.has(leagueKey)) {
        leaguesMap.set(leagueKey, {
          id: leagueKey,
          name: displayName,
          originalName: vote.competition.name,
          competitionId: vote.competition.id,
          emblem: vote.competition.emblem
        });
      }
    }
  });

  // Convert to array and sort
  return Array.from(leaguesMap.values())
    .sort((a, b) => {
      // First sort by original name
      const nameCompare = a.originalName.localeCompare(b.originalName);
      if (nameCompare !== 0) return nameCompare;
      // Then by ID if names are the same
      return (a.competitionId || 0) - (b.competitionId || 0);
    })
    .map(league => ({
      ...league,
      // Format the display name only for selection display
      name: league.originalName + (league.competitionId ? ` #${league.competitionId}` : '')
    }));
};

  const sortedVoteHistory = [...stats.voteHistory].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

const filteredAndSortedVoteHistory = sortedVoteHistory
  .filter(vote => {
    if (selectedCompetition === 'all') return true;
    return vote.competition && 
           `${vote.competition.name}_${vote.competition.id}` === selectedCompetition;
  });

  const sortedLeagueStats = stats.leagueStats 
    ? [...stats.leagueStats]
        .map(league => ({
          ...league,
          accuracy: calculateLeagueAccuracy(league)
        }))
        .sort((a, b) => b.accuracy - a.accuracy)
    : [];
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSortedVoteHistory.slice(indexOfFirstItem, indexOfLastItem);
  
  const indexOfLastLeague = leaguePage * leaguesPerPage;
  const indexOfFirstLeague = indexOfLastLeague - leaguesPerPage;
  const currentLeagues = sortedLeagueStats.slice(indexOfFirstLeague, indexOfLastLeague);

  const renderLeagueStats = () => (
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
            {currentLeagues.map((league, index) => {
              // Ensure we have valid numbers before calculation
              const accuracy = league.accuracy || 0;

              return (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="flex items-center">
                      <div className="w-8 flex justify-center">
                        {league.leagueEmblem && (
                          <img 
                            src={league.leagueEmblem} 
                            alt={league.leagueName}
                            className="w-6 h-6"
                          />
                        )}
                      </div>
                      <span className="ml-2">{league.leagueName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-block min-w-[60px] px-2 py-0.5 rounded text-sm ${
                      accuracy >= 70 ? 'bg-green-100 text-green-800' :
                      accuracy >= 50 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {accuracy.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* League Pagination */}
      {sortedLeagueStats.length > leaguesPerPage && (
        <div className="mt-4 flex justify-center gap-1">
          {Array.from({ length: Math.ceil(sortedLeagueStats.length / leaguesPerPage) }, (_, i) => (
            <button
              key={i}
              onClick={() => setLeaguePage(i + 1)}
              className={`min-w-[32px] px-2 py-1 rounded text-sm ${
                leaguePage === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderVoteHistory = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleSortOrder}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
          >
            Sort ↓
          </button>
          
<select
  value={selectedCompetition}
  onChange={(e) => {
    setSelectedCompetition(e.target.value);
    setCurrentPage(1);
  }}
  className="border rounded px-3 py-2 text-sm"
>
  <option key="all" value="all">All Leagues</option>
  {getUniqueLeagues().map(league => (
    <option key={league.id} value={league.id}>
      {league.name}
    </option>
  ))}
</select>
        </div>

        <div className="text-sm">
          Page {currentPage} of {Math.ceil(filteredAndSortedVoteHistory.length / itemsPerPage)}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-2 text-left">Date</th>
              <th className="py-2 text-left">Competition</th>
              <th className="py-2 text-left">Match</th>
              <th className="py-2 text-center">Vote</th>
              <th className="py-2 text-center">Result</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((vote, index) => (
              <tr key={index} className={`${
                vote.isCorrect === true ? 'bg-green-50' : 
                vote.isCorrect === false ? 'bg-red-50' : ''
              }`}>
                <td className="py-2">{format(parseISO(vote.date), 'dd MMM')}</td>
                <td className="py-2">
                  <div className="flex items-center">
                    <img src={vote.competition.emblem} alt="" className="w-4 h-4 mr-2" />
                    {vote.competition.name}
                  </div>
                </td>
                <td className="py-2">{vote.homeTeam} vs {vote.awayTeam}</td>
                <td className="py-2 text-center capitalize">{vote.vote}</td>
                <td className="py-2 text-center">
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
      {filteredAndSortedVoteHistory.length > itemsPerPage && (
        <div className="mt-4 flex justify-center gap-1">
          {Array.from({ length: Math.ceil(filteredAndSortedVoteHistory.length / itemsPerPage) }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`min-w-[32px] px-2 py-1 rounded text-sm ${
                currentPage === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto mt-4 sm:mt-8 p-2 sm:p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 text-center">User Statistics</h1>
      
      {/* Stats Cards */}
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
      <div className="flex justify-center mb-6 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('league')}
          className={`flex items-center px-4 py-2 rounded-lg transition-all ${
            activeTab === 'league' 
              ? 'bg-white text-blue-600 shadow' 
              : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          <BiTrophy className="mr-2" />
          League Statistics
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center px-4 py-2 rounded-lg transition-all ${
            activeTab === 'history' 
              ? 'bg-white text-blue-600 shadow' 
              : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          <BiHistory className="mr-2" />
          Vote History
        </button>
      </div>

      {/* Content */}
      {activeTab === 'league' ? renderLeagueStats() : renderVoteHistory()}
    </div>
  );
};

export default UserStats;
