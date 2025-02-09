import React, { useEffect, useState, useRef } from 'react';
import { Calendar } from 'lucide-react';
import api from '../api';

const StatItem = ({ isToday, aiStats }) => {
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
      </div>
    </div>
  );
};

const PredictionTicker = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const tickerRef = useRef(null);
  const animationRef = useRef(null);

  const fetchData = async () => {
    try {
      const response = await api.get('/api/accuracy/ai/two-days');
      console.log('Two days stats response:', response.data);
      
      setStats({
        today: {
          ai: response.data.today || { total: 0, correct: 0 }
        },
        yesterday: {
          ai: response.data.yesterday || { total: 0, correct: 0 }
        }
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      setStats({
        today: { ai: { total: 0, correct: 0 } },
        yesterday: { ai: { total: 0, correct: 0 } }
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      if (isInitialized) return;
      
      try {
        setIsLoading(true);
        await fetchData();
        setIsInitialized(true);
      } catch (error) {
        console.error('Error during initialization:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isInitialized) {
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    }, 300000); // 5 minutes

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollInterval);
    };
  }, [isInitialized]);

  useEffect(() => {
    let startTime = performance.now();
    const duration = 20000; // 20 seconds for one complete scroll

    const animate = (currentTime) => {
      if (tickerRef.current) {
        const elapsed = currentTime - startTime;
        const progress = (elapsed % duration) / duration;
        const totalWidth = tickerRef.current.scrollWidth / 3;
        tickerRef.current.scrollLeft = progress * totalWidth;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [stats]);

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
      aiStats: stats.today.ai
    },
    {
      type: 'stats',
      key: 'yesterday',
      isToday: false,
      aiStats: stats.yesterday.ai
    }
  ];

  return (
    <div className="w-full bg-gray-900 mt-2 border-t border-b border-gray-700 overflow-hidden">      
      <div 
        ref={tickerRef}
        className="relative h-10 overflow-x-hidden scrollbar-hide"
      >
        <div className="absolute inset-0 flex items-center">
          <div className="flex">
            {[...items, ...items, ...items, ...items].map((item, index) => (
              <StatItem
                key={`${item.key}-${index}`}
                isToday={item.isToday}
                aiStats={item.aiStats}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = `
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