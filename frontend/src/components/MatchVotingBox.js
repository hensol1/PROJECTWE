import React, { useState, useEffect } from 'react';

const MatchVotingBox = ({ matches, onVote, onSkip, user }) => {
  const [remainingMatches, setRemainingMatches] = useState([]);
  const [isVoting, setIsVoting] = useState(false); // For animation

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
      setIsVoting(true);
      await onVote(currentMatch.id, vote);
      
      setRemainingMatches(prev => {
        const newMatches = prev.filter(match => match.id !== currentMatch.id);
        
        if (!user) {
          const votedMatches = JSON.parse(localStorage.getItem('votedMatches') || '[]');
          votedMatches.push(currentMatch.id);
          localStorage.setItem('votedMatches', JSON.stringify(votedMatches));
        }
        
        return newMatches;
      });
    } catch (error) {
      if (!user && error.response?.status === 400) {
        setRemainingMatches(prev => {
          const newMatches = prev.filter(match => match.id !== currentMatch.id);
          const votedMatches = JSON.parse(localStorage.getItem('votedMatches') || '[]');
          votedMatches.push(currentMatch.id);
          localStorage.setItem('votedMatches', JSON.stringify(votedMatches));
          return newMatches;
        });
      }
    } finally {
      setIsVoting(false);
    }
  };

  const handleSkip = () => {
    setRemainingMatches(prev => {
      const nextMatch = prev[0];
      const restMatches = prev.slice(1);
      return [...restMatches, nextMatch];
    });
    onSkip(currentMatch.id);
  };

  return (
    <div className="relative w-full max-w-sm mx-auto mt-8"> {/* Added mt-8 for top margin */}
      {/* Progress Bar - changed from absolute to relative positioning */}
      <div className="mb-4 w-full flex items-center justify-center gap-2"> {/* Changed from absolute to relative with margin */}
        <span className="text-sm font-bold text-gray-700 bg-white px-3 py-1 rounded-full shadow-md">
          {remainingMatches.length} Matches Left
        </span>
        <div className="h-2 bg-gray-200 rounded-full flex-grow max-w-[150px]">
          <div 
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ 
              width: `${((matches.length - remainingMatches.length) / matches.length) * 100}%`
            }}
          />
        </div>
      </div>

      <div className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl shadow-xl overflow-hidden transform transition-all duration-300 hover:scale-[1.02]">
        {/* League Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 py-2 px-3"> {/* Reduced padding */}
          <div className="flex justify-center items-center space-x-2"> {/* Reduced spacing */}
            <img 
              src={currentMatch.competition.emblem} 
              alt={currentMatch.competition.name} 
              className="w-6 h-6" 
            />
            <h2 className="text-base font-bold text-white text-center"> 
              {currentMatch.competition.name}
            </h2>
          </div>
        </div>

        {/* Match Content */}
        <div className="p-4"> {/* Reduced from p-6 */}
          <div className="flex items-center justify-between space-x-3"> 
            {/* Home Team */}
            <button 
              onClick={() => handleVote('home')}
              className="flex-1 group relative"
            >
              <div className="bg-gray-800 p-3 rounded-xl transition-all duration-300 transform group-hover:scale-105 group-hover:shadow-lg group-hover:bg-blue-900">
                <img 
                  src={currentMatch.homeTeam.crest} 
                  alt={currentMatch.homeTeam.name}
                  className="w-14 h-14 mx-auto mb-2" 
                />
                <p className="text-white text-center font-bold text-sm"> 
                  {currentMatch.homeTeam.name}
                </p>
              </div>
              <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-300"/>
            </button>

            {/* Draw Button */}
            <div className="flex flex-col justify-center">
              <button 
                onClick={() => handleVote('draw')}
                className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-bold rounded-lg transform transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 text-sm" 
              >
                DRAW
              </button>
            </div>

            {/* Away Team */}
            <button 
              onClick={() => handleVote('away')}
              className="flex-1 group relative"
            >
              <div className="bg-gray-800 p-3 rounded-xl transition-all duration-300 transform group-hover:scale-105 group-hover:shadow-lg group-hover:bg-red-900">
                <img 
                  src={currentMatch.awayTeam.crest} 
                  alt={currentMatch.awayTeam.name}
                  className="w-14 h-14 mx-auto mb-2" 
                />
                <p className="text-white text-center font-bold text-sm"> 
                  {currentMatch.awayTeam.name}
                </p>
              </div>
              <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-300"/>
            </button>
          </div>

          {/* Skip Button */}
          <div className="flex justify-center mt-4"> 
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-white text-xs underline transition-colors duration-300" 
            >
              Vote Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchVotingBox;
