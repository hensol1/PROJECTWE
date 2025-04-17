import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useLocation } from 'react-router-dom';
import PerformanceGraph from './PerformanceGraph';
import LeagueStats from './LeagueStats';
import TeamStats from './TeamStats';
import api from '../api';

const StatsPage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overall');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Try to fetch data from API endpoints first
        const results = await Promise.allSettled([
          api.fetchAIHistory(),
          api.fetchLeagueStats(),
          api.fetchTeamStats()
        ]);
        
        // Check if any fetches succeeded
        const anySuccess = results.some(result => result.status === 'fulfilled');
        
        if (anySuccess) {
          console.log('Successfully loaded data from API');
          setLastUpdated(new Date().toISOString());
        } else {
          setError('Failed to load statistics data. Please try again later.');
        }
      } catch (error) {
        console.error('Error fetching statistics data:', error);
        setError('Failed to load statistics data. Please try again later.');
      } finally {
        setIsLoading(false);
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
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center p-4">
          <div className="text-red-600 mb-2">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Retry
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
            {lastUpdated && `Last updated: ${new Date(lastUpdated).toLocaleString()}`}
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