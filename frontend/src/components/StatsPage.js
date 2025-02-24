import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import LoadingSpinner from './LoadingSpinner';
import PerformanceGraph from './PerformanceGraph';
import LeagueStats from './LeagueStats';
import api from '../api';

// Custom hook to prefetch all data
const usePrefetchData = () => {
  useEffect(() => {
    // Prefetch both datasets immediately
    const prefetchData = async () => {
      try {
        await Promise.all([
          api.fetchAIHistory(),
          api.fetchLeagueStats()
        ]);
      } catch (error) {
        console.error('Prefetch error:', error);
      }
    };
    
    prefetchData();
  }, []);
};

const StatsPage = () => {
  const [activeTab, setActiveTab] = useState('overall');
  
  // Start prefetching as soon as the page loads
  usePrefetchData();

  const TabButton = ({ tab, label }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-6 py-2 border-b-2 font-medium transition-colors ${
        activeTab === tab
          ? 'border-green-500 text-green-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );

  // Render both components but hide inactive one
  const renderContent = () => (
    <div className="relative">
      <div className={activeTab === 'overall' ? 'block' : 'hidden'}>
        <PerformanceGraph />
      </div>
      <div className={activeTab === 'leagues' ? 'block' : 'hidden'}>
        <LeagueStats />
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">AI Performance Statistics</h1>

        <div className="w-full">
          <div className="flex border-b border-gray-200 mb-6">
            <TabButton tab="overall" label="Overall Performance" />
            <TabButton tab="leagues" label="League Performance" />
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