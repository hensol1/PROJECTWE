import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import LoadingLogo from './LoadingLogo';

const UserProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const navigate = useNavigate();

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

  const handleDeleteAccount = async () => {
    try {
      await api.deleteAccount();
      localStorage.removeItem('token'); // Clear the auth token
      navigate('/'); // Redirect to home page
      window.location.reload(); // Refresh to update the app state
    } catch (err) {
      setError('Failed to delete account');
    }
  };

  if (loading) return <LoadingLogo />;
  if (error) return <div className="text-center mt-8 text-red-500">{error}</div>;
  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto mt-4 sm:mt-8 p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-xl sm:text-2xl font-bold mb-4">User Profile</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm sm:text-base mb-6">
        <p><strong>Username:</strong> {profile.username}</p>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Country:</strong> {profile.country}</p>
      </div>

      {/* Delete Account Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Delete you Account</h2>
        {!showConfirmDelete ? (
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-red-700 mb-4">
              Are you sure you want to delete your account? This action cannot be undone.
              All your data, including voting history and statistics, will be permanently deleted.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleDeleteAccount}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Yes, Delete My Account
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;