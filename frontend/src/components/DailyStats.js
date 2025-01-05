import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import api from '../api';

const DailyStats = () => {
  const [stats, setStats] = useState({
    totalVotes: 0,
    totalMatches: 0
  });

  const fetchStats = async () => {
    try {
      const response = await api.getDailyPredictions();
      console.log('Daily predictions API response:', response);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching daily stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-gray-900 mt-2 border-t border-b border-gray-700">
      <div className="relative h-10">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center px-4 whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#40c456]" />
              <strong className="text-[#40c456] text-sm">
                {stats.totalVotes.toLocaleString()}
              </strong>
            </div>
            
            {/* Dot separator */}
            <span className="mx-3 text-gray-600">•</span>
            
            <span className="text-white text-sm">
              Predictions Made Today!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyStats;