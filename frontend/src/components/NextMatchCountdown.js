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
    // Immediate return if scheduledMatches is invalid
    if (!scheduledMatches || typeof scheduledMatches !== 'object') {
      console.warn('Invalid scheduledMatches:', scheduledMatches);
      setNextMatches([]);
      setCountdown('');
      return;
    }

    const findNextMatches = () => {
      const now = new Date();
      let soonestTime = Infinity;
      let matches = [];

      try {
        // Safely extract and flatten matches
        const allMatches = Object.entries(scheduledMatches).reduce((acc, [_, leagueMatches]) => {
          if (!leagueMatches || typeof leagueMatches !== 'object') return acc;
          
          // Ensure we're dealing with an array of matches
          const matchesArray = Array.isArray(leagueMatches) 
            ? leagueMatches 
            : Object.values(leagueMatches).flat();
          
          return [...acc, ...matchesArray.filter(match => 
            match?.homeTeam?.name && 
            match?.awayTeam?.name && 
            match?.utcDate
          )];
        }, []);

        if (allMatches.length === 0) return [];

        // Find earliest future match time
        allMatches.forEach(match => {
          const matchTime = new Date(match.utcDate);
          const timeDiff = matchTime - now;
          if (timeDiff > 0 && timeDiff < soonestTime) {
            soonestTime = timeDiff;
          }
        });

        // Get all matches at the earliest time
        if (soonestTime !== Infinity) {
          matches = allMatches.filter(match => {
            const matchTime = new Date(match.utcDate);
            const timeDiff = matchTime - now;
            return Math.abs(timeDiff - soonestTime) <= 60000;
          });
        }
      } catch (error) {
        console.error('Error processing matches:', error);
        return [];
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

  useEffect(() => {
    if (nextMatches.length <= 1) return;

    const rotationInterval = setInterval(() => {
      setCurrentMatchIndex(current => (current + 1) % nextMatches.length);
    }, 5000);

    return () => clearInterval(rotationInterval);
  }, [nextMatches.length]);

  // Return null if no valid matches or countdown
  if (!nextMatches.length || !countdown) {
    return null;
  }

  const currentMatch = nextMatches[currentMatchIndex];
  
  // Additional safety check for currentMatch
  if (!currentMatch?.homeTeam?.name || !currentMatch?.awayTeam?.name) {
    return null;
  }

  const renderTeamInfo = (team, isHome) => (
    <>
      <span className="text-white truncate">
        {truncateTeamName(team.name)}
      </span>
      {team.crest && (
        <img 
          src={team.crest} 
          alt={team.name}
          className={`${isHome ? 'w-4 h-4' : 'w-3 h-3'} inline-block shrink-0`}
          onError={(e) => e.target.style.display = 'none'}
        />
      )}
    </>
  );

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
                {renderTeamInfo(currentMatch.homeTeam, true)}
                <span className="mx-1 text-[#40c456]">vs</span>
                {renderTeamInfo(currentMatch.awayTeam, false)}
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
                {renderTeamInfo(currentMatch.homeTeam, true)}
                <span className="mx-0.5 text-[#40c456] shrink-0">vs</span>
                {renderTeamInfo(currentMatch.awayTeam, false)}
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