import React, { useState, useEffect } from 'react';
import api from '../api';
import { format, parseISO } from 'date-fns';

const UserProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.getUserProfile();
        setProfile(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load profile');
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) return <div className="text-center mt-8">Loading...</div>;
  if (error) return <div className="text-center mt-8 text-red-500">{error}</div>;
  if (!profile) return null;

  const renderVoteHistory = () => {
    return (
      <div className="mt-4 sm:mt-8">
        <h2 className="text-lg sm:text-xl font-bold mb-2 sm:mb-4">Vote History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-xs sm:text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-1 sm:py-2 px-2 sm:px-4 border-b">Date</th>
                <th className="py-1 sm:py-2 px-2 sm:px-4 border-b">Competition</th>
                <th className="py-1 sm:py-2 px-2 sm:px-4 border-b">Match</th>
                <th className="py-1 sm:py-2 px-2 sm:px-4 border-b">Your Vote</th>
                <th className="py-1 sm:py-2 px-2 sm:px-4 border-b">Result</th>
              </tr>
            </thead>
            <tbody>
              {profile.voteHistory.map((vote, index) => (
                <tr key={index} className={vote.isCorrect === true ? 'bg-green-100' : (vote.isCorrect === false ? 'bg-red-100' : '')}>
                  <td className="py-1 sm:py-2 px-2 sm:px-4 border-b">{format(parseISO(vote.date), 'dd MMM yyyy HH:mm')}</td>
                  <td className="py-1 sm:py-2 px-2 sm:px-4 border-b flex items-center">
                    <img src={vote.competition.emblem} alt={vote.competition.name} className="w-4 h-4 sm:w-6 sm:h-6 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">{vote.competition.name}</span>
                  </td>
                  <td className="py-1 sm:py-2 px-2 sm:px-4 border-b">{vote.homeTeam} vs {vote.awayTeam}</td>
                  <td className="py-1 sm:py-2 px-2 sm:px-4 border-b capitalize">{vote.vote}</td>
                  <td className="py-1 sm:py-2 px-2 sm:px-4 border-b">
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
    );
  };

  return (
    <div className="max-w-4xl mx-auto mt-4 sm:mt-8 p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4">User Profile</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm sm:text-base">
        <p><strong>Username:</strong> {profile.username}</p>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Country:</strong> {profile.country}</p>
        <p><strong>Total Votes:</strong> {profile.totalVotes}</p>
        <p><strong>Correct Votes:</strong> {profile.correctVotes}</p>
        <p><strong>Overall Accuracy:</strong> {profile.accuracy.toFixed(1)}%</p>
      </div>
      
      <h2 className="text-lg sm:text-xl font-bold mt-4 sm:mt-6 mb-2">League Statistics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
        {profile.leagueStats.map((league, index) => (
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

      {renderVoteHistory()}
    </div>
  );
};

export default UserProfile;