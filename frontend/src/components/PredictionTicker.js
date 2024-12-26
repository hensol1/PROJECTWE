import React, { useEffect, useState } from 'react';
import { Calendar, Medal, Trophy, Award } from 'lucide-react';
import api from '../api';

const StatItem = ({ dayName, aiStats, fanStats }) => {
  const calculatePercentage = (correct, total) => {
    if (!total) return 0;
    return ((correct / total) * 100).toFixed(1);
  };

  return (
    <div className="flex items-center h-10 bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700">
      <div className="flex items-center gap-6 px-6">
        {/* Day indicator */}
        <div className="flex items-center gap-2 bg-gray-700 rounded px-3 py-1">
          <Calendar className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="font-bold text-yellow-400 uppercase tracking-wider text-sm">
            {dayName}
          </span>
        </div>

        {/* Experts Stats */}
        <div className="flex items-center gap-2 min-w-[180px]">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-400 shrink-0 font-medium tracking-wider">
            EXPERTS {calculatePercentage(aiStats.correct, aiStats.total)}%
          </span>
          <span className="text-gray-400 text-sm shrink-0">
            ({aiStats.correct}/{aiStats.total})
          </span>
        </div>

        {/* Fans Stats */}
        <div className="flex items-center gap-2 min-w-[180px]">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <span className="text-blue-400 shrink-0 font-medium tracking-wider">
            FANS {calculatePercentage(fanStats.correct, fanStats.total)}%
          </span>
          <span className="text-gray-400 text-sm shrink-0">
            ({fanStats.correct}/{fanStats.total})
          </span>
        </div>
      </div>
    </div>
  );
};

const TopUsersItem = ({ users }) => {
  const medals = [
    { icon: Trophy, color: 'text-yellow-400' },
    { icon: Medal, color: 'text-gray-300' },
    { icon: Award, color: 'text-amber-600' }
  ];

  return (
    <div className="flex items-center h-10 bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700">
      <div className="flex items-center gap-6 px-6">
        <div className="flex items-center gap-2 bg-gray-700 rounded px-3 py-1">
          <Trophy className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="font-bold text-yellow-400 uppercase tracking-wider text-sm">
            TOP USERS
          </span>
        </div>
        
        <div className="flex gap-6">
          {users.map((user, index) => (
            <div key={user.username} className="flex items-center gap-2 min-w-[180px]">
              {React.createElement(medals[index].icon, {
                className: `w-4 h-4 ${medals[index].color} shrink-0`
              })}
              <span className="text-white shrink-0 font-medium tracking-wider">
                {user.username}
              </span>
              <span className="text-gray-400 text-sm shrink-0">
                ({user.accuracy.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PredictionTicker = () => {
  const [stats, setStats] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, usersData] = await Promise.all([
          api.fetchLastTwoDaysStats(),
          api.fetchTopUsers()
        ]);
        setStats(statsData);
        setTopUsers(usersData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const getDayName = (dateString) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const date = new Date(dateString);
    return days[date.getDay()];
  };

  if (isLoading) {
    return (
      <div className="w-full bg-gray-900 mt-2 border-t border-b border-gray-700">
        <div className="h-10 flex items-center justify-center text-gray-300">
          <div className="animate-pulse flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span>Loading statistics...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const items = [
    {
      type: 'stats',
      key: 'today',
      dayName: getDayName(stats.today.date),
      aiStats: stats.today.ai,
      fanStats: stats.today.fans
    },
    {
      type: 'users',
      key: 'top-users',
      users: topUsers
    },
    {
      type: 'stats',
      key: 'yesterday',
      dayName: getDayName(stats.yesterday.date),
      aiStats: stats.yesterday.ai,
      fanStats: stats.yesterday.fans
    }
  ];

  return (
    <div className="w-full bg-gray-900 mt-2 border-t border-b border-gray-700 overflow-hidden">      
      <div className="relative h-10">
        <div className="absolute inset-0 flex items-center">
          <div className="animate-ticker flex">
            {[...items, ...items, ...items].map((item, index) => (
              item.type === 'stats' ? (
                <StatItem
                  key={`${item.key}-${index}`}
                  dayName={item.dayName}
                  aiStats={item.aiStats}
                  fanStats={item.fanStats}
                />
              ) : (
                <TopUsersItem
                  key={`${item.key}-${index}`}
                  users={item.users}
                />
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = `
  @keyframes ticker {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-33.333%);
    }
  }

  .animate-ticker {
    animation: ticker 30s linear infinite;
  }

  .animate-ticker:hover {
    animation-play-state: paused;
  }
`;

const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

export default PredictionTicker;