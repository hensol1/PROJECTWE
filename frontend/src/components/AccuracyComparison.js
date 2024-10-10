import React from 'react';

const AccuracyComparison = ({ fanAccuracy, aiAccuracy }) => {
  return (
    <div className="flex justify-center items-center space-x-4 my-6">
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold mb-2">FANS</span>
        <div className="w-32 h-32 border-4 border-blue-500 rounded-lg flex items-center justify-center bg-white">
          <span className="text-4xl font-bold text-blue-500">{fanAccuracy.toFixed(2)}%</span>
        </div>
      </div>
      
      <div className="text-2xl font-bold">VS</div>
      
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold mb-2">AI</span>
        <div className="w-32 h-32 border-4 border-red-500 rounded-lg flex items-center justify-center bg-white">
          <span className="text-4xl font-bold text-red-500">{aiAccuracy.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
};

export default AccuracyComparison;