import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';

const DailyStats = ({ user, onOpenAuthModal, selectedDate, matches, setMatches }) => {
  const [stats, setStats] = useState({
    totalVotes: 0,
    totalMatches: 0
  });
  const [isAutoVoting, setIsAutoVoting] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await api.getDailyPredictions();
      console.log('Daily predictions API response:', response);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching daily stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 300000);
    return () => clearInterval(interval);
  }, []);

  const handleAutoVote = async () => {
    if (!user) {
      onOpenAuthModal('Please sign in or register to show us you know better!');
      return;
    }

    try {
      setIsAutoVoting(true);
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const formattedDate = format(zonedTimeToUtc(selectedDate, userTimeZone), 'yyyy-MM-dd');
      const response = await api.autoVote(formattedDate);
  
      setMatches(prevMatches => {
        const newMatches = { ...prevMatches };
        response.data.votedMatches.forEach(({ matchId, vote, votes }) => {
          for (const dateKey in newMatches) {
            for (const leagueKey in newMatches[dateKey]) {
              newMatches[dateKey][leagueKey] = newMatches[dateKey][leagueKey].map(match => {
                if (match.id === matchId) {
                  return {
                    ...match,
                    userVote: vote,
                    voteCounts: votes
                  };
                }
                return match;
              });
            }
          }
        });
        return newMatches;
      });

      alert(`Auto-voted for ${response.data.votedMatches.length} matches!`);
    } catch (error) {
      console.error('Error in auto-vote:', error);
      alert('Failed to auto-vote. Please try again.');
    } finally {
      setIsAutoVoting(false);
    }
  };

  // Check if there are any matches that can be auto-voted
  const hasMatchesToAutoVote = matches && Object.values(matches).some(dateMatches =>
    Object.values(dateMatches).some(leagueMatches =>
      leagueMatches.some(match => 
        (match.status === 'TIMED' || match.status === 'SCHEDULED') && !match.userVote
      )
    )
  );

  return (
    <div className="w-full bg-gray-900 mt-2 border-t border-b border-gray-700">
      <div className="relative h-10">
        {/* Auto Vote Button - Absolute positioned on the right */}
        {user && hasMatchesToAutoVote && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
            <button
              onClick={handleAutoVote}
              disabled={isAutoVoting}
              className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200
                ${isAutoVoting 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-[#40c456] hover:bg-[#35a447] text-white'}`}
            >
              {isAutoVoting ? 'Auto-voting...' : 'Auto Vote'}
            </button>
          </div>
        )}
        
        {/* Centered Stats Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#40c456] shrink-0" />
            <span className="text-white text-sm whitespace-nowrap">
              <strong className="text-[#40c456]">
                {stats.totalVotes.toLocaleString()}
              </strong> Predictions Made Today!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyStats;