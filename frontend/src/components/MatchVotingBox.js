import React, { useState, useEffect } from 'react';

const MatchVotingBox = ({ matches, onVote, onSkip, user }) => {
  const [remainingMatches, setRemainingMatches] = useState([]);

  // Initialize remaining matches on component mount and when matches change
  useEffect(() => {
    if (!user) {
      const votedMatches = new Set(JSON.parse(localStorage.getItem('votedMatches') || '[]'));
      setRemainingMatches(matches.filter(match => !votedMatches.has(match.id)));
    } else {
      setRemainingMatches(matches.filter(match => !match.userVote));
    }
  }, [matches, user]);

  if (remainingMatches.length === 0) {
    return null;
  }

  const currentMatch = remainingMatches[0];
  
  if (!currentMatch) {
    return null;
  }

  const handleVote = async (vote) => {
    try {
      await onVote(currentMatch.id, vote);
      
      // Update remaining matches
      setRemainingMatches(prev => {
        const newMatches = prev.filter(match => match.id !== currentMatch.id);
        
        // Update localStorage for unregistered users
        if (!user) {
          const votedMatches = JSON.parse(localStorage.getItem('votedMatches') || '[]');
          votedMatches.push(currentMatch.id);
          localStorage.setItem('votedMatches', JSON.stringify(votedMatches));
        }
        
        return newMatches;
      });
      
    } catch (error) {
      // If vote fails (already voted), remove the match from remaining matches
      if (!user && error.response?.status === 400) {
        setRemainingMatches(prev => {
          const newMatches = prev.filter(match => match.id !== currentMatch.id);
          const votedMatches = JSON.parse(localStorage.getItem('votedMatches') || '[]');
          votedMatches.push(currentMatch.id);
          localStorage.setItem('votedMatches', JSON.stringify(votedMatches));
          return newMatches;
        });
      }
      console.error('Vote failed:', error);
    }
  };

  const handleSkip = () => {
    setRemainingMatches(prev => {
      const nextMatch = prev[0];
      const restMatches = prev.slice(1);
      return [...restMatches, nextMatch]; // Move current match to end of array
    });
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
            {remainingMatches.length} matches left to vote
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