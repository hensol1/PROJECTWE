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
  
    const getVotePercentages = (match) => {
    const total = match.voteCounts.home + match.voteCounts.draw + match.voteCounts.away;
    if (total === 0) return { home: 0, draw: 0, away: 0 };
    
    return {
      home: Math.round((match.voteCounts.home / total) * 100),
      draw: Math.round((match.voteCounts.draw / total) * 100),
      away: Math.round((match.voteCounts.away / total) * 100)
    };
  };

const renderVoteSplit = (match) => {
  const percentages = getVotePercentages(match);

  return (
    <div className="w-3/5 mx-auto px-4 mb-3"> {/* Changed from w-4/5 to w-3/5 */}
      <div className="flex justify-between text-xs text-white mb-1">
        <span>{percentages.home}%</span>
        <span>{percentages.draw}%</span>
        <span>{percentages.away}%</span>
      </div>
      <div className="h-1 bg-gray-700 rounded-full overflow-hidden flex group"> {/* Reduced height and added group for hover effect */}
        <div 
          className="bg-blue-500 transition-all duration-500 group-hover:brightness-110"
          style={{ width: `${percentages.home}%` }}
        />
        <div 
          className="bg-yellow-500 transition-all duration-500 group-hover:brightness-110"
          style={{ width: `${percentages.draw}%` }}
        />
        <div 
          className="bg-red-500 transition-all duration-500 group-hover:brightness-110"
          style={{ width: `${percentages.away}%` }}
        />
      </div>
    </div>
  );
};

  const renderAIPrediction = (match) => {
    if (!match.aiPrediction) return null;

    const getPredictionText = () => {
      switch(match.aiPrediction) {
        case 'HOME_TEAM':
          return match.homeTeam.name;
        case 'AWAY_TEAM':
          return match.awayTeam.name;
        case 'DRAW':
          return 'Draw';
        default:
          return null;
      }
    };

    const predictionText = getPredictionText();
    if (!predictionText) return null;

    return (
      <div className="text-center text-sm mb-3">
        <span className="text-gray-400">AI Predicts: </span>
        <span className="text-white font-medium">{predictionText}</span>
      </div>
    );
  };

  if (!currentMatch) return null;

  return (
    <div className="relative w-full max-w-sm mx-auto mt-8">
      <div className="mb-4 w-full flex items-center justify-center gap-2">
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
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 py-2 px-3">
          <div className="flex justify-center items-center space-x-2">
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

        <div className="p-4">
          {/* AI Prediction */}
          {renderAIPrediction(currentMatch)}

          {/* Vote Split */}
          {renderVoteSplit(currentMatch)}

          {/* Teams and Voting Buttons */}
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
