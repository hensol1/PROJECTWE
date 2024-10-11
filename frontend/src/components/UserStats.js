import React, { useState, useEffect } from 'react';
import api from '../api';
import { format, parseISO } from 'date-fns';

const UserStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <div className="max-w-4xl mx-auto mt-4 sm:mt-8 p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-xl sm:text-2xl font-bold mb-4">User Statistics</h1>
      
      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-bold mt-4 sm:mt-6 mb-2">Overall Stats</h2>
        <p><strong>Total Votes:</strong> {stats.totalVotes}</p>
        <p><strong>Correct Votes:</strong> {stats.correctVotes}</p>
        <p><strong>Overall Accuracy:</strong> {stats.accuracy.toFixed(1)}%</p>
      </div>

      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-bold mb-2">League Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
          {stats.leagueStats.map((league, index) => (
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

      <div>
        <h2 className="text-lg sm:text-xl font-bold mb-2">Vote History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-xs sm:text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-1 sm:py-2 px-1 sm:px-2 border-b">Date</th>
                <th className="py-1 sm:py-2 px-1 sm:px-2 border-b">Competition</th>
                <th className="py-1 sm:py-2 px-1 sm:px-2 border-b">Match</th>
                <th className="py-1 sm:py-2 px-1 sm:px-2 border-b">Vote</th>
                <th className="py-1 sm:py-2 px-1 sm:px-2 border-b">Result</th>
              </tr>
            </thead>
            <tbody>
              {stats.voteHistory.map((vote, index) => (
                <tr key={index} className={vote.isCorrect === true ? 'bg-green-100' : (vote.isCorrect === false ? 'bg-red-100' : '')}>
                  <td className="py-1 sm:py-2 px-1 sm:px-2 border-b">{format(parseISO(vote.date), 'dd MMM HH:mm')}</td>
                  <td className="py-1 sm:py-2 px-1 sm:px-2 border-b">
                    <div className="flex items-center">
                      <img src={vote.competition.emblem} alt={vote.competition.name} className="w-4 h-4 sm:w-6 sm:h-6 mr-1" />
                      <span className="text-xs sm:text-sm truncate">{vote.competition.name}</span>
                    </div>
                  </td>
                  <td className="py-1 sm:py-2 px-1 sm:px-2 border-b">
                    <div className="flex flex-col sm:flex-row sm:items-center">
                      <span className="truncate">{vote.homeTeam}</span>
                      <span className="hidden sm:inline mx-1">vs</span>
                      <span className="truncate">{vote.awayTeam}</span>
                    </div>
                  </td>
                  <td className="py-1 sm:py-2 px-1 sm:px-2 border-b capitalize">{vote.vote}</td>
                  <td className="py-1 sm:py-2 px-1 sm:px-2 border-b">
                    {vote.status === 'FINISHED' 
                      ? `${vote.score.home} - ${vote.score.away}`
                      : vote.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserStats;