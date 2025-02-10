import { useState, useCallback, useRef } from 'react';

export const useMatchNotifications = () => {
  const [goalNotifications, setGoalNotifications] = useState([]);
  const processedScoreUpdates = useRef(new Set());

  const checkForGoals = useCallback((newMatches, prevMatches) => {
    if (!prevMatches || !newMatches) return;
    
    const newNotifications = [];
    
    const compareMatchScores = (newMatch, prevMatch) => {
      if (!newMatch.score?.fullTime || !prevMatch.score?.fullTime) return;
      
      const newScore = newMatch.score.fullTime;
      const prevScore = prevMatch.score.fullTime;
      const scoreKey = `${newMatch.id}-${newScore.home}-${newScore.away}`;
      
      if (newScore.home !== prevScore.home || newScore.away !== prevScore.away) {
        if (!processedScoreUpdates.current.has(scoreKey)) {
          processedScoreUpdates.current.add(scoreKey);
          
          if (newScore.home > prevScore.home) {
            newNotifications.push({
              id: `${scoreKey}-home`,
              match: newMatch,
              scoringTeam: 'home',
              prevScore,
              newScore
            });
          }
          
          if (newScore.away > prevScore.away) {
            newNotifications.push({
              id: `${scoreKey}-away`,
              match: newMatch,
              scoringTeam: 'away',
              prevScore,
              newScore
            });
          }
        }
      }
    };

    Object.values(newMatches.live || {}).forEach(leagueMatches => {
      leagueMatches.forEach(newMatch => {
        let prevMatch;
        
        // Search in live matches
        if (prevMatches.live) {
          Object.values(prevMatches.live).forEach(prevLeagueMatches => {
            const found = prevLeagueMatches.find(m => m.id === newMatch.id);
            if (found) prevMatch = found;
          });
        }
        
        // Search in regular matches if not found in live
        if (!prevMatch) {
          Object.entries(prevMatches).forEach(([key, value]) => {
            if (key !== 'live' && typeof value === 'object') {
              Object.values(value).forEach(leagueMatches => {
                const found = leagueMatches.find(m => m.id === newMatch.id);
                if (found) prevMatch = found;
              });
            }
          });
        }
        
        if (prevMatch) {
          compareMatchScores(newMatch, prevMatch);
        }
      });
    });

    if (newNotifications.length > 0) {
      setGoalNotifications(prev => [...prev, ...newNotifications]);
    }
  }, []);

  const handleNotificationDismiss = useCallback((notification) => {
    if (notification === 'all') {
      setGoalNotifications([]);
      processedScoreUpdates.current.clear();
    } else {
      setGoalNotifications(prev => 
        prev.filter(n => n.id !== notification.id)
      );
    }
  }, []);

  return {
    goalNotifications,
    checkForGoals,
    handleNotificationDismiss,
    processedScoreUpdates: processedScoreUpdates.current
  };
};
