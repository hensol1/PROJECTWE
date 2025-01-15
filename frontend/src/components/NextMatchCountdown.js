import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

const NextMatchCountdown = ({ scheduledMatches }) => {
  const [countdown, setCountdown] = useState('');
  const [nextMatches, setNextMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const truncateTeamName = (name) => {
    return name?.length > 10 ? `${name.substring(0, 10)}...` : name;
  };

  useEffect(() => {
    const findNextMatches = () => {
      const now = new Date();
      let soonestTime = Infinity;
      let matches = [];

      // Flatten all matches into a single array
      const allMatches = Object.values(scheduledMatches).reduce((acc, leagueMatches) => {
        const flatLeagueMatches = Object.values(leagueMatches).flat();
        return [...acc, ...flatLeagueMatches];
      }, []);

      // First pass: find the earliest future match time
      allMatches.forEach(match => {
        const matchTime = new Date(match.utcDate);
        const timeDiff = matchTime - now;
        if (timeDiff > 0 && timeDiff < soonestTime) {
          soonestTime = timeDiff;
        }
      });

      // Second pass: collect all matches at the soonest time (with 1-minute tolerance)
      if (soonestTime !== Infinity) {
        matches = allMatches.filter(match => {
          const matchTime = new Date(match.utcDate);
          const timeDiff = matchTime - now;
          // Use a 1-minute tolerance to group matches
          return Math.abs(timeDiff - soonestTime) <= 60000;
        });
      }

      return matches;
    };

    const updateCountdown = () => {
      const matches = findNextMatches();
      if (matches.length === 0) {
        setCountdown('');
        setNextMatches([]);
        return;
      }

      const now = new Date();
      const matchTime = new Date(matches[0].utcDate);
      const diff = matchTime - now;

      if (diff <= 0) {
        setCountdown('');
        setNextMatches([]);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
      setNextMatches(matches);
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);
    return () => clearInterval(intervalId);
  }, [scheduledMatches]);

  // Rotate through matches every 5 seconds if there are multiple matches
  useEffect(() => {
    if (nextMatches.length <= 1) return;

    const rotationInterval = setInterval(() => {
      setCurrentMatchIndex(current => (current + 1) % nextMatches.length);
    }, 5000);

    return () => clearInterval(rotationInterval);
  }, [nextMatches.length]);

  if (!nextMatches.length || !countdown) {
    return null;
  }

  const currentMatch = nextMatches[currentMatchIndex];

  return (
    <div className="w-full bg-gray-900 border-t border-b border-gray-700">
      <div className="relative h-10">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Desktop Version */}
          <div className="hidden sm:flex items-center gap-1.5">
            <Timer className="w-4 h-4 text-[#40c456] shrink-0" />
            <span className="text-white text-sm whitespace-nowrap flex items-center gap-1.5">
              <span className="text-yellow-400 font-medium">GET READY!</span>
              {' '}Next Match{nextMatches.length > 1 ? 'es' : ''} Start{nextMatches.length === 1 ? 's' : ''} in{' '}
              <span className="font-mono text-[#40c456]">{countdown}</span>
              {' '}
              <div className="flex items-center gap-1 transition-opacity duration-300">
                <span className="text-white">{truncateTeamName(currentMatch.homeTeam.name)}</span>
                <img 
                  src={currentMatch.homeTeam.crest} 
                  alt={currentMatch.homeTeam.name}
                  className="w-4 h-4 inline-block"
                />
                <span className="mx-1 text-[#40c456]">vs</span>
                <img 
                  src={currentMatch.awayTeam.crest} 
                  alt={currentMatch.awayTeam.name}
                  className="w-4 h-4 inline-block"
                />
                <span className="text-white">{truncateTeamName(currentMatch.awayTeam.name)}</span>
                {nextMatches.length > 1 && (
                  <span className="ml-2 text-gray-400 text-xs">
                    {currentMatchIndex + 1}/{nextMatches.length}
                  </span>
                )}
              </div>
            </span>
          </div>

          {/* Mobile Version */}
          <div className="sm:hidden flex items-center px-2 w-full justify-center">
            <span className="text-xs whitespace-nowrap flex items-center gap-1 overflow-hidden">
              <span className="text-yellow-400 font-medium shrink-0">GET READY!</span>
              <span className="text-white shrink-0">in</span>
              <span className="font-mono text-[#40c456] shrink-0">{countdown}</span>
              <div className="flex items-center gap-1 min-w-0 flex-shrink transition-opacity duration-300">
                <span className="text-white truncate">{truncateTeamName(currentMatch.homeTeam.name)}</span>
                <img 
                  src={currentMatch.homeTeam.crest} 
                  alt={currentMatch.homeTeam.name}
                  className="w-3 h-3 inline-block shrink-0"
                />
                <span className="mx-0.5 text-[#40c456] shrink-0">vs</span>
                <img 
                  src={currentMatch.awayTeam.crest} 
                  alt={currentMatch.awayTeam.name}
                  className="w-3 h-3 inline-block shrink-0"
                />
                <span className="text-white truncate">{truncateTeamName(currentMatch.awayTeam.name)}</span>
                {nextMatches.length > 1 && (
                  <span className="ml-1 text-gray-400 text-xs shrink-0">
                    {currentMatchIndex + 1}/{nextMatches.length}
                  </span>
                )}
              </div>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NextMatchCountdown;