import React from 'react';

const AccuracyComparison = ({ fanAccuracy, aiAccuracy }) => {
  return (
    <div className="flex justify-center items-center space-x-2 my-4">
      <div className="flex flex-col items-center">
        <span className="text-sm font-bold mb-1">FANS</span>
        <div className="w-24 h-24 border-2 border-blue-500 rounded-lg flex items-center justify-center bg-white">
          <span className="text-2xl font-bold text-blue-500">{fanAccuracy.toFixed(1)}%</span>
        </div>
      </div>
      
      <div className="text-xl font-bold">VS</div>
      
      <div className="flex flex-col items-center">
        <span className="text-sm font-bold mb-1">AI</span>
        <div className="w-24 h-24 border-2 border-red-500 rounded-lg flex items-center justify-center bg-white">
          <span className="text-2xl font-bold text-red-500">{aiAccuracy.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};

export default AccuracyComparison;