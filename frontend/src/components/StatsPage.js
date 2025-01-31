import React, { useState } from 'react';
import PerformanceGraph from './PerformanceGraph';
import LeagueStats from './LeagueStats';

const StatsPage = () => {
  const [activeTab, setActiveTab] = useState('overall');

  const handleTabChange = (tab) => {
    console.log('Changing tab to:', tab); // Debug log
    setActiveTab(tab);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">AI Performance Statistics</h1>

        <div className="w-full">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => handleTabChange('overall')}
              className={`px-6 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'overall'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Overall Performance
            </button>
            <button
              onClick={() => handleTabChange('leagues')}
              className={`px-6 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'leagues'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              League Performance
            </button>
          </div>

          {/* Tab Content */}
          <div className="mt-4">
            {activeTab === 'overall' ? (
              <PerformanceGraph />
            ) : (
              <LeagueStats />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;