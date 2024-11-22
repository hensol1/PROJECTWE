import React, { useState, useEffect } from 'react';
import { IoExitOutline, IoPersonOutline } from "react-icons/io5";
import api from '../api';
import { FaPeopleGroup } from "react-icons/fa6";
import { FaBrain } from "react-icons/fa";
import { Country } from 'country-state-city';

const formatCountryCode = (countryName) => {
  if (!countryName) return '';
  
  // If it's already a 2-letter code, just return it lowercase
  if (countryName.length === 2) {
    return countryName.toLowerCase();
  }

  // Find the country code using country-state-city
  const country = Country.getAllCountries().find(
    country => country.name.toLowerCase() === countryName.toLowerCase()
  );

  return country ? country.isoCode.toLowerCase() : countryName.toLowerCase();
};

const ScoreDisplay = ({ icon: Icon, score, title, position = 'middle', color = 'bg-blue-500', isUser = false, userCountry = null, username = null }) => {
  return (
    <div className={`flex flex-col items-center ${position === 'winner' ? 'order-2' : position === 'left' ? 'order-1' : 'order-3'}`}>
      <div className={`
        relative 
        ${position === 'winner' ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-12 h-12 sm:w-16 sm:h-16'} 
        ${position === 'winner' ? 'mb-3' : 'mb-2'}
      `}>
        {isUser && userCountry ? (
          <div className={`w-full h-full rounded-full ${color} p-[2px] flex items-center justify-center overflow-hidden`}>
            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-white">
              <img 
                src={`https://flagcdn.com/w160/${formatCountryCode(userCountry)}.png`}
                alt={userCountry}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.log(`Failed to load flag for country: ${userCountry}`);
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>
        ) : (
          <div className={`${color} rounded-full p-3 w-full h-full flex items-center justify-center`}>
            <Icon className="w-full h-full text-white" />
          </div>
        )}
      </div>
      <span className={`
        font-bold text-gray-800
        ${position === 'winner' ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'}
      `}>
        {score.toFixed(1)}%
      </span>
      <span className="text-xs sm:text-sm text-gray-500 mt-0.5">
        {isUser ? (username || 'Sign In') : title}
      </span>
    </div>
  );
};

export default function ModernAccuracyComparison({ user }) {
  const [accuracyData, setAccuracyData] = useState({
    fanAccuracy: 0,
    aiAccuracy: 0,
    lastUpdated: new Date()
  });
  const [dailyStats, setDailyStats] = useState(null);
  const [animatedFanAccuracy, setAnimatedFanAccuracy] = useState(0);
  const [animatedAiAccuracy, setAnimatedAiAccuracy] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [accuracyResponse, dailyResponse] = await Promise.all([
        api.fetchAccuracy(),
        api.fetchDailyAccuracy()
      ]);

      setAccuracyData(accuracyResponse.data);
      setDailyStats(dailyResponse.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching accuracy data:', error);
      setError('Failed to fetch accuracy data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const refreshInterval = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    const targetFan = accuracyData.fanAccuracy;
    const targetAi = accuracyData.aiAccuracy;
    const duration = 1500;
    const steps = 60;
    
    const interval = setInterval(() => {
      setAnimatedFanAccuracy(prev => {
        const next = prev + (targetFan / steps);
        return next >= targetFan ? targetFan : next;
      });
      
      setAnimatedAiAccuracy(prev => {
        const next = prev + (targetAi / steps);
        return next >= targetAi ? targetAi : next;
      });
    }, duration / steps);

    return () => clearInterval(interval);
  }, [accuracyData]);

  const calculateUserAccuracy = () => {
    if (!user || !user.stats) return 0;
    const { finishedVotes, correctVotes } = user.stats;
    if (!finishedVotes || finishedVotes === 0) return 0;
    return (correctVotes / finishedVotes) * 100;
  };

  const userScore = calculateUserAccuracy();
  const scores = [
    { score: animatedAiAccuracy, title: 'Our Experts', icon: FaBrain, color: 'bg-green-500' },
    { score: animatedFanAccuracy, title: 'Fans', icon: FaPeopleGroup, color: 'bg-blue-500' },
    { 
      score: userScore, 
      title: 'Your Score',
      isUser: true,
      userCountry: user?.country,
      username: user?.username,
      icon: IoPersonOutline,
      color: 'bg-yellow-500' 
    }
  ].sort((a, b) => b.score - a.score);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm py-3 px-4 mb-4">
        <div className="flex justify-between items-end gap-4 sm:gap-6">
          <ScoreDisplay
            {...scores[1]}
            position="left"
          />
          <ScoreDisplay
            {...scores[0]}
            position="winner"
          />
          <ScoreDisplay
            {...scores[2]}
            position="right"
          />
        </div>
      </div>
    </div>
  );
}
