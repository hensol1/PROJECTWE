import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useLocation } from 'react-router-dom';
import PerformanceGraph from './PerformanceGraph';
import LeagueStats from './LeagueStats';
import TeamStats from './TeamStats';
import api from '../api';

// Custom hook to safely fetch data with improved error handling
const useSafeDataFetch = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Fetch data with proper fallback handling
  const fetchDataSafely = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First try the API endpoints (more reliable than static files)
      console.log('Fetching data from API endpoints...');
      const results = await Promise.allSettled([
        api.fetchAIHistory(),
        api.fetchLeagueStats(),
        api.fetchTeamStats(),
        api.fetchAllTeams()
      ]);
      
      // Check if any fetches succeeded
      const anySuccess = results.some(result => result.status === 'fulfilled');
      
      if (anySuccess) {
        console.log('Successfully loaded data from API');
        setLastUpdated(new Date().toISOString());
      } else {
        // All API calls failed, log the errors
        console.error('All API fetches failed:', 
          results.map(r => r.status === 'rejected' ? r.reason : null).filter(Boolean));
        setError('Failed to load AI stats');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load AI stats');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchDataSafely();
  }, []);
  
  return { isLoading, error, lastUpdated, refetch: fetchDataSafely };
};

const StatsPage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overall');
  const { isLoading, error, lastUpdated, refetch } = useSafeDataFetch();
  
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

  // Render content based on current state
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-pulse text-gray-500">Loading statistics...</div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">{error}</div>
          <button 
            onClick={refetch}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    
    return (
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
  };

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
            Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'N/A'}
          </div>

          <ErrorBoundary 
            fallback={
              <div className="text-red-600 p-4">
                Error loading statistics. Please refresh the page or try again later.
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