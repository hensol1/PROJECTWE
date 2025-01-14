import React from 'react';
import PerformanceGraph from './PerformanceGraph';

const StatsPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">AI Performance Statistics</h1>
        <PerformanceGraph />
      </div>
    </div>
  );
};

export default StatsPage;