import React, { useState, useEffect } from 'react';

const MatchVotingBox = ({ matches, onVote, onSkip }) => {
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [processedMatches, setProcessedMatches] = useState(new Set());
  
  // Reset currentMatchIndex when matches array changes
  useEffect(() => {
    setCurrentMatchIndex(0);
    setProcessedMatches(new Set());
  }, [matches]);

  const unvotedMatches = matches.filter(match => !processedMatches.has(match.id));

  if (unvotedMatches.length === 0) {
    return null;
  }

  const currentMatch = unvotedMatches[currentMatchIndex];
  
  if (!currentMatch) {
    return null;
  }

  const handleVote = async (vote) => {
    try {
      await onVote(currentMatch.id, vote);
      setProcessedMatches(prev => new Set([...prev, currentMatch.id]));
      
      // Only increment index if there are more matches
      if (currentMatchIndex < unvotedMatches.length - 1) {
        setCurrentMatchIndex(prev => prev + 1);
      }
    } catch (error) {
      // If vote fails (e.g., already voted), skip this match
      setProcessedMatches(prev => new Set([...prev, currentMatch.id]));
      if (currentMatchIndex < unvotedMatches.length - 1) {
        setCurrentMatchIndex(prev => prev + 1);
      }
    }
  };

  const handleSkip = () => {
    // Mark match as processed but don't vote
    setProcessedMatches(prev => new Set([...prev, currentMatch.id]));
    
    // Move to next match if available
    if (currentMatchIndex < unvotedMatches.length - 1) {
      setCurrentMatchIndex(prev => prev + 1);
    }
    onSkip(currentMatch.id);
  };

  return (
    <div className="bg-white rounded-lg shadow-md mb-6">
      <div className="border-b py-2 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src={currentMatch.competition.emblem} 
              alt={currentMatch.competition.name} 
              className="w-6 h-6 mr-2"
            />
            <span className="font-semibold text-sm">{currentMatch.competition.name}</span>
          </div>
          <span className="text-sm text-gray-500">
            {unvotedMatches.length - currentMatchIndex} matches left to vote
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => handleVote('home')}
            className="flex-1 flex flex-col items-center p-4 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <img 
              src={currentMatch.homeTeam.crest} 
              alt={currentMatch.homeTeam.name}
              className="w-16 h-16 mb-2"
            />
            <span className="text-sm font-medium text-center">
              {currentMatch.homeTeam.name}
            </span>
          </button>

          <div className="flex flex-col items-center mx-4">
            <button 
              onClick={() => handleVote('draw')}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              DRAW
            </button>
          </div>

          <button 
            onClick={() => handleVote('away')}
            className="flex-1 flex flex-col items-center p-4 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <img 
              src={currentMatch.awayTeam.crest} 
              alt={currentMatch.awayTeam.name}
              className="w-16 h-16 mb-2"
            />
            <span className="text-sm font-medium text-center">
              {currentMatch.awayTeam.name}
            </span>
          </button>
        </div>

        <div className="flex justify-center mt-4">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Vote later
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchVotingBox;