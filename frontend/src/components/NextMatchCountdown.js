import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

const NextMatchCountdown = ({ scheduledMatches }) => {
  const [countdown, setCountdown] = useState('');
  const [nextMatch, setNextMatch] = useState(null);

  const truncateTeamName = (name) => {
    return name.length > 10 ? `${name.substring(0, 10)}...` : name;
  };

  useEffect(() => {
    const findNextMatch = () => {
      const now = new Date();
      let soonestMatch = null;
      let soonestTime = Infinity;

      const allMatches = Object.values(scheduledMatches).reduce((matches, leagueMatches) => {
        const flatLeagueMatches = Object.values(leagueMatches).flat();
        return [...matches, ...flatLeagueMatches];
      }, []);

      allMatches.forEach(match => {
        const matchTime = new Date(match.utcDate);
        const timeDiff = matchTime - now;
        if (timeDiff > 0 && timeDiff < soonestTime) {
          soonestTime = timeDiff;
          soonestMatch = match;
        }
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
    <div className="w-full bg-gray-900 border-t border-b border-gray-700">
      <div className="relative h-10">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Desktop Version */}
          <div className="hidden sm:flex items-center gap-1.5">
            <Timer className="w-4 h-4 text-[#40c456] shrink-0" />
            <span className="text-white text-sm whitespace-nowrap flex items-center gap-1.5">
              <span className="text-yellow-400 font-medium">GET READY!</span>
              {' '}Next Match Starts in{' '}
              <span className="font-mono text-[#40c456]">{countdown}</span>
              {' '}<span className="flex items-center gap-1">
                <span className="text-white">{truncateTeamName(nextMatch.homeTeam.name)}</span>
                <img 
                  src={nextMatch.homeTeam.crest} 
                  alt={nextMatch.homeTeam.name}
                  className="w-4 h-4 inline-block"
                />
                <span className="mx-1 text-[#40c456]">vs</span>
                <img 
                  src={nextMatch.awayTeam.crest} 
                  alt={nextMatch.awayTeam.name}
                  className="w-4 h-4 inline-block"
                />
                <span className="text-white">{truncateTeamName(nextMatch.awayTeam.name)}</span>
              </span>
            </span>
          </div>

          {/* Mobile Version */}
          <div className="sm:hidden flex items-center px-2 w-full justify-center">
            <span className="text-xs whitespace-nowrap flex items-center gap-1 overflow-hidden">
              <span className="text-yellow-400 font-medium shrink-0">GET READY!</span>
              <span className="text-white shrink-0">in</span>
              <span className="font-mono text-[#40c456] shrink-0">{countdown}</span>
              <span className="flex items-center gap-1 min-w-0 flex-shrink">
                <span className="text-white truncate">{truncateTeamName(nextMatch.homeTeam.name)}</span>
                <img 
                  src={nextMatch.homeTeam.crest} 
                  alt={nextMatch.homeTeam.name}
                  className="w-3 h-3 inline-block shrink-0"
                />
                <span className="mx-0.5 text-[#40c456] shrink-0">vs</span>
                <img 
                  src={nextMatch.awayTeam.crest} 
                  alt={nextMatch.awayTeam.name}
                  className="w-3 h-3 inline-block shrink-0"
                />
                <span className="text-white truncate">{truncateTeamName(nextMatch.awayTeam.name)}</span>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NextMatchCountdown;