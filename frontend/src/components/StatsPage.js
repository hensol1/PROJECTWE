import React, { useState, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import LoadingSpinner from './LoadingSpinner';

// Lazy load components
const PerformanceGraph = React.lazy(() => import('./PerformanceGraph'));
const LeagueStats = React.lazy(() => import('./LeagueStats'));

const StatsPage = () => {
  const [activeTab, setActiveTab] = useState('overall');

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">AI Performance Statistics</h1>

        <div className="w-full">
          <div className="flex border-b border-gray-200 mb-6">
            <TabButton tab="overall" label="Overall Performance" />
            <TabButton tab="leagues" label="League Performance" />
          </div>

          <ErrorBoundary fallback={<div>Error loading stats</div>}>
            <Suspense fallback={<LoadingSpinner />}>
              {activeTab === 'overall' ? <PerformanceGraph /> : <LeagueStats />}
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
