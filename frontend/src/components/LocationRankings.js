// frontend/src/components/LocationRankings.js

import React, { useState, useEffect } from 'react';
import api from '../api';

const LocationRankings = ({ user }) => {
  const [locationData, setLocationData] = useState(null);
  const [userLocationRank, setUserLocationRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [globalRankings, userRankings] = await Promise.all([
          api.get('/api/user/rankings/locations'),
          user ? api.get('/api/user/rankings/my-location') : null
        ]);

        setLocationData(globalRankings.data);
        if (userRankings) {
          setUserLocationRank(userRankings.data);
        }
      } catch (error) {
        console.error('Error fetching location rankings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return <div className="animate-pulse">Loading rankings...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Top Countries */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Top Countries</h2>
        <div className="space-y-4">
          {locationData?.topCountries.map((country, index) => (
            <div key={country.country} className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-lg font-semibold mr-2">#{index + 1}</span>
                <span>{country.country}</span>
              </div>
              <div className="text-right">
                <div className="font-medium">{country.averageScore.toFixed(1)}%</div>
                <div className="text-sm text-gray-500">{country.userCount} users</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Cities */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Top Cities</h2>
        <div className="space-y-4">
          {locationData?.topCities.map((city, index) => (
            <div key={`${city.country}-${city.city}`} className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-lg font-semibold mr-2">#{index + 1}</span>
                <div>
                  <div>{city.city}</div>
                  <div className="text-sm text-gray-500">{city.country}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">{city.averageScore.toFixed(1)}%</div>
                <div className="text-sm text-gray-500">{city.userCount} users</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User's Rankings */}
      {user && userLocationRank && (
        <div className="md:col-span-2 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Your Rankings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">In {userLocationRank.country.name}</h3>
              <div className="text-3xl font-bold mb-1">
                #{userLocationRank.country.rank}
                <span className="text-sm text-gray-500 ml-2">
                  of {userLocationRank.country.totalUsers}
                </span>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">In {userLocationRank.city.name}</h3>
              <div className="text-3xl font-bold mb-1">
                #{userLocationRank.city.rank}
                <span className="text-sm text-gray-500 ml-2">
                  of {userLocationRank.city.totalUsers}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationRankings;