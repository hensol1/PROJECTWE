import React, { useEffect, useState, useRef } from 'react';
import { Calendar, Medal, Trophy, Award } from 'lucide-react';
import api from '../api';

const StatItem = ({ isToday, aiStats, fanStats }) => {
  const calculatePercentage = (correct, total) => {
    if (!total) return 0;
    return ((correct / total) * 100).toFixed(1);
  };

  return (
    <div className="flex items-center h-10 bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700">
      <div className="flex items-center gap-6 px-6">
        <div className="flex items-center gap-2 bg-gray-700 rounded px-3 py-1">
          <Calendar className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="font-bold text-yellow-400 uppercase tracking-wider text-sm">
            {isToday ? 'TODAY' : 'YESTERDAY'}
          </span>
        </div>

        <div className="flex items-center gap-2 min-w-[180px]">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-400 shrink-0 font-medium tracking-wider">
            EXPERTS {calculatePercentage(aiStats.correct, aiStats.total)}%
          </span>
          <span className="text-gray-400 text-sm shrink-0">
            ({aiStats.correct}/{aiStats.total})
          </span>
        </div>

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

const TopUsersItem = ({ users, isDaily }) => {
  const medals = [
    { icon: Trophy, color: 'text-yellow-400' },
    { icon: Medal, color: 'text-gray-300' },
    { icon: Award, color: 'text-amber-600' }
  ];

  return (
    <div className="flex items-center h-10 bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700">
      <div className="flex items-center gap-6 px-6">
        <div className="inline-flex items-center gap-2 bg-gray-700 rounded px-3 py-1 whitespace-nowrap">
          <Trophy className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="font-bold text-yellow-400 uppercase tracking-wider text-sm">
            TOP PLAYERS {isDaily ? 'TODAY' : 'WEEKLY'}
          </span>
        </div>
        
        <div className="flex items-center gap-6">
          {users.map((user, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="text-gray-600">•</span>}
              <div className="flex items-center gap-2">
                {React.createElement(medals[index].icon, {
                  className: `w-4 h-4 ${medals[index].color} shrink-0`
                })}
                <span className="text-white shrink-0 font-medium">
                  {user.username}
                </span>
                <span className="text-gray-400 text-sm shrink-0">
                  ({user.accuracy}%)
                </span>
              </div>
            </React.Fragment>
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
  const [isDaily, setIsDaily] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const tickerRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const animate = () => {
      if (!isDragging && tickerRef.current) {
        tickerRef.current.scrollLeft += 1;
        if (tickerRef.current.scrollLeft >= tickerRef.current.scrollWidth / 2) {
          tickerRef.current.scrollLeft = 0;
        }
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDragging]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - tickerRef.current.offsetLeft);
    setScrollLeft(tickerRef.current.scrollLeft);
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - tickerRef.current.offsetLeft);
    setScrollLeft(tickerRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - tickerRef.current.offsetLeft;
    const walk = (x - startX);
    tickerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - tickerRef.current.offsetLeft;
    const walk = (x - startX);
    tickerRef.current.scrollLeft = scrollLeft - walk;
  };

  const stopDragging = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, dailyTopUsers, weeklyLeaderboard] = await Promise.all([
          api.fetchLastTwoDaysStats(),
          api.fetchTopUsers(),
          api.getWeeklyLeaderboard()
        ]);
        
        setStats(statsData);
        if (dailyTopUsers?.length > 0) {
          setTopUsers(dailyTopUsers);
          setIsDaily(true);
        } else {
          setTopUsers(weeklyLeaderboard?.data?.slice(0, 3) || []);
          setIsDaily(false);
        }
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
      isToday: true,
      aiStats: stats.today.ai,
      fanStats: stats.today.fans
    },
    {
      type: 'stats',
      key: 'yesterday',
      isToday: false,
      aiStats: stats.yesterday.ai,
      fanStats: stats.yesterday.fans
    },
    {
      type: 'users',
      key: 'top-users',
      users: topUsers,
      isDaily: isDaily
    }
  ];

  return (
    <div className="w-full bg-gray-900 mt-2 border-t border-b border-gray-700 overflow-hidden">      
      <div 
        ref={tickerRef}
        className={`relative h-10 overflow-x-auto scrollbar-hide touch-pan-x ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
        onTouchEnd={stopDragging}
      >
        <div className="absolute inset-0 flex items-center">
          <div className="flex">
            {[...items, ...items, ...items].map((item, index) => (
              item.type === 'stats' ? (
                <StatItem
                  key={`${item.key}-${index}`}
                  isToday={item.isToday}
                  aiStats={item.aiStats}
                  fanStats={item.fanStats}
                />
              ) : (
                <TopUsersItem
                  key={`${item.key}-${index}`}
                  users={item.users}
                  isDaily={item.isDaily}
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
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

`;

const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

export default PredictionTicker;