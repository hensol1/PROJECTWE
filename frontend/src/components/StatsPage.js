import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useLocation } from 'react-router-dom';
import PerformanceGraph from './PerformanceGraph';
import LeagueStats from './LeagueStats';
import TeamStats from './TeamStats';
import api from '../api';

// Custom hook to prefetch all data
const usePrefetchData = () => {
  useEffect(() => {
    // Prefetch all datasets immediately
    const prefetchData = async () => {
      try {
        await Promise.all([
          api.fetchAIHistory(),
          api.fetchLeagueStats(),
          api.fetchTeamStats()
        ]);
      } catch (error) {
        console.error('Prefetch error:', error);
      }
    };
    
    prefetchData();
  }, []);
};

// Loading component
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
    <p className="text-gray-600">Loading statistics...</p>
  </div>
);

// Error component
const ErrorState = ({ message, onRetry }) => (
  <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
    <p className="font-medium">Error</p>
    <p>{message || 'Failed to load statistics. Please try again later.'}</p>
    <button 
      onClick={onRetry}
      className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Retry
    </button>
  </div>
);

const StatsPage = () => {
  const location = useLocation();
  // Set default tab or get tab from navigation state
  const [activeTab, setActiveTab] = useState('overall');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  
  // Use this effect to fetch data and update lastUpdated state
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setLoadingError(null);
      
      try {
        // First try the API endpoint which is more reliable
        try {
          const apiResponse = await api.get('/api/stats/ai/history');
          if (apiResponse?.data?.overall) {
            setLastUpdated(apiResponse.data.generatedAt || new Date().toISOString());
            console.log('Successfully loaded stats from API');
          } else {
            throw new Error('Invalid API response format');
          }
        } catch (apiError) {
          console.log('API fetch failed, trying direct file access', apiError);
          
          // Direct fetch to bypass potential API issues
          const response = await fetch('/stats/ai-history.json?t=' + Date.now());
          if (!response.ok) {
            throw new Error(`Failed to fetch stats file: ${response.status}`);
          }
          
          // Check content type
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            throw new Error('Received HTML instead of JSON');
          }
          
          const data = await response.json();
          console.log('Direct fetch result:', data);
          
          if (data?.generatedAt) {
            setLastUpdated(data.generatedAt);
          } else if (data?.overall?.lastUpdated) {
            setLastUpdated(data.overall.lastUpdated);
          } else {
            // Use current time as fallback
            setLastUpdated(new Date().toISOString());
          }
        }
        
        // Also prefetch other data
        await Promise.allSettled([
          api.fetchLeagueStats(),
          api.fetchTeamStats()
        ]);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching statistics data:', error);
        setLoadingError('Failed to load statistics data. Please try again later.');
        setIsLoading(false);
        
        // Still update lastUpdated even on error
        setLastUpdated(new Date().toISOString());
      }
    };
    
    fetchData();
  }, []);
    
  // Set the active tab based on navigation state
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  const TabButton = ({ tab, label }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-3 sm:px-6 py-2 border-b-2 text-sm sm:text-base font-medium transition-colors ${
        activeTab === tab
          ? 'border-green-500 text-green-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );

  // Render components but hide inactive ones
  const renderContent = () => (
    <div className="relative">
      <div className={activeTab === 'overall' ? 'block' : 'hidden'}>
        <PerformanceGraph />
      </div>
      <div className={activeTab === 'leagues' ? 'block' : 'hidden'}>
        <LeagueStats />
      </div>
      <div className={activeTab === 'teams' ? 'block' : 'hidden'}>
        <TeamStats />
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">AI Performance Statistics</h1>

        <div className="w-full">
          <div className="flex border-b border-gray-200 mb-4 sm:mb-6 overflow-x-auto pb-1 no-scrollbar">
            <TabButton tab="overall" label="Overall" />
            <TabButton tab="leagues" label="League" />
            <TabButton tab="teams" label="Clubs" />
          </div>

          <div className="text-xs text-gray-500 text-right mb-4">
  Last updated: {new Date().toLocaleString()}
</div>

          <ErrorBoundary 
            fallback={
              <div className="text-red-600 p-4">
                Error loading statistics. Please refresh the page.
              </div>
            }
          >
            {renderContent()}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;