import React, { useState, useEffect } from 'react';

const NextMatchCountdown = ({ scheduledMatches }) => {
  const [countdown, setCountdown] = useState('');
  const [nextMatch, setNextMatch] = useState(null);

  useEffect(() => {
    const findNextMatch = () => {
      const now = new Date();
      let soonestMatch = null;
      let soonestTime = Infinity;

      Object.values(scheduledMatches).forEach(leagueMatches => {
        leagueMatches.forEach(match => {
          const matchTime = new Date(match.utcDate);
          const timeDiff = matchTime - now;
          if (timeDiff > 0 && timeDiff < soonestTime) {
            soonestTime = timeDiff;
            soonestMatch = match;
          }
        });
      });

      return soonestMatch;
    };

    const updateCountdown = () => {
      const match = findNextMatch();
      if (!match) {
        setCountdown('');
        setNextMatch(null);
        return;
      }

      const now = new Date();
      const matchTime = new Date(match.utcDate);
      const diff = matchTime - now;

      if (diff <= 0) {
        setCountdown('');
        setNextMatch(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
      setNextMatch(match);
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);
    return () => clearInterval(intervalId);
  }, [scheduledMatches]);

  if (!nextMatch || !countdown) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-2 mb-4 max-w-2xl mx-auto">
      <div className="text-center mb-1">
        <span className="text-gray-600 text-xs sm:text-sm">Next match starts in:</span>
        <span className="ml-2 font-mono text-base sm:text-lg font-bold text-blue-600">{countdown}</span>
      </div>
      <div className="flex items-center justify-center space-x-3 sm:space-x-4 text-xs sm:text-sm">
        <div className="flex items-center justify-end w-[120px] sm:w-[140px]">
          <span className="font-medium truncate">{nextMatch.homeTeam.name}</span>
          <img 
            src={nextMatch.homeTeam.crest} 
            alt={nextMatch.homeTeam.name} 
            className="w-4 h-4 ml-1"
          />
        </div>
        
        <span className="font-medium">vs</span>

        <div className="flex items-center justify-start w-[120px] sm:w-[140px]">
          <img 
            src={nextMatch.awayTeam.crest} 
            alt={nextMatch.awayTeam.name} 
            className="w-4 h-4 mr-1"
          />
          <span className="font-medium truncate">{nextMatch.awayTeam.name}</span>
        </div>
      </div>
    </div>
  );
};

export default NextMatchCountdown;