import React, { useState, useEffect } from 'react';
import api from '../api';

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

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">User Profile</h1>
      <div className="grid grid-cols-2 gap-4">
        <p><strong>Username:</strong> {profile.username}</p>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Country:</strong> {profile.country}</p>
        <p><strong>Total Votes:</strong> {profile.totalVotes}</p>
        <p><strong>Correct Votes:</strong> {profile.correctVotes}</p>
        <p><strong>Overall Accuracy:</strong> {profile.accuracy ? profile.accuracy.toFixed(2) : 0}%</p>
      </div>
      
      <h2 className="text-xl font-bold mt-6 mb-2">League Statistics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profile.leagueStats && profile.leagueStats.map((league, index) => (
          <div key={index} className="bg-gray-100 p-2 rounded flex items-center">
            {league.leagueLogo && (
              <img 
                src={league.leagueLogo} 
                alt={`${league.leagueName} logo`} 
                className="w-8 h-8 mr-2"
              />
            )}
            <div>
              <p><strong>{league.leagueName}:</strong></p>
              <p>{league.accuracy ? league.accuracy.toFixed(2) : 0}% accuracy</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserProfile;