import React, { useState, useEffect } from 'react';
import api from '../api';

const UserProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/api/user/profile');
        setProfile(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load profile');
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">User Profile</h1>
      <p><strong>Username:</strong> {profile.username}</p>
      <p><strong>Email:</strong> {profile.email}</p>
      <p><strong>Country:</strong> {profile.country}</p>
      <p><strong>Total Votes:</strong> {profile.totalVotes}</p>
      <p><strong>Correct Votes:</strong> {profile.correctVotes}</p>
      <p><strong>Overall Accuracy:</strong> {profile.accuracy.toFixed(2)}%</p>
      
      <h2 className="text-xl font-bold mt-6 mb-2">League Statistics</h2>
      {profile.leagueStats.map((league, index) => (
        <div key={index} className="mb-2">
          <p><strong>{league.leagueName}:</strong> {league.accuracy.toFixed(2)}% accuracy</p>
        </div>
      ))}
    </div>
  );
};

export default UserProfile;