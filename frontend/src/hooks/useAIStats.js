import { useState, useEffect } from 'react';
import api from '../api';

// Create a custom event for triggering refreshes
export const refreshAIStats = () => {
  window.dispatchEvent(new CustomEvent('refreshAIStats'));
};

export const useAIStats = () => {
  const [data, setData] = useState({
    performanceData: [],
    overallStats: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        // Check cache first
        const cachedData = sessionStorage.getItem('aiStatsData');
        const cachedTimestamp = sessionStorage.getItem('aiStatsDataTimestamp');
        const now = Date.now();
        const CACHE_VALIDITY = 5 * 60 * 1000; // 5 minutes

        // Use cached data if fresh
        if (cachedData && cachedTimestamp && (now - parseInt(cachedTimestamp) < CACHE_VALIDITY)) {
          const parsed = JSON.parse(cachedData);
          if (isMounted) {
            setData({
              ...parsed,
              isLoading: false
            });
          }
          return;
        }

        // Fetch fresh data
        const response = await api.fetchAIHistory();
        
        if (!response || !response.overall) {
          throw new Error('Invalid response from API');
        }

        // Process data
        const overallStats = {
          totalPredictions: response.overall.totalPredictions,
          correctPredictions: response.overall.correctPredictions,
          overallAccuracy: response.overall.overallAccuracy
        };

        // Get today's date at midnight for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const formattedData = (response.stats || [])
          .map(stat => ({
            date: new Date(stat.date),
            displayDate: new Date(stat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            accuracy: parseFloat(stat.accuracy || 0),
            predictions: stat.totalPredictions || 0,
            correct: stat.correctPredictions || 0
          }))
          // Filter out today's data
          .filter(stat => {
            const statDate = new Date(stat.date);
            statDate.setHours(0, 0, 0, 0);
            return statDate < today;
          })
          .sort((a, b) => b.date - a.date);

        const newData = {
          performanceData: formattedData,
          overallStats,
          isLoading: false,
          error: null
        };

        // Update state and cache
        if (isMounted) {
          setData(newData);
          sessionStorage.setItem('aiStatsData', JSON.stringify(newData));
          sessionStorage.setItem('aiStatsDataTimestamp', now.toString());
        }
      } catch (error) {
        console.error('Error fetching AI stats:', error);
        if (isMounted) {
          setData(prev => ({
            ...prev,
            isLoading: false,
            error: 'Failed to load AI stats'
          }));
        }
      }
    };

    // Initial fetch
    fetchData();

    // Set up event listener for manual refreshes
    const handleRefresh = () => {
      console.log('Manually refreshing AI stats...');
      fetchData();
    };
    window.addEventListener('refreshAIStats', handleRefresh);

    // Set up periodic refresh
    const refreshInterval = setInterval(fetchData, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
      window.removeEventListener('refreshAIStats', handleRefresh);
    };
  }, []);

  return data;
}; 