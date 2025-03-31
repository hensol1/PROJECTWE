import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import api from '../api';

const TeamPredictionHistory = ({ teamId, teamName, teamLogo }) => {
  const [loading, setLoading] = useState(true);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    correct: 0,
    accuracy: 0
  });

  useEffect(() => {
    const fetchTeamPredictions = async () => {
      setLoading(true);
      try {
        // Use the same API call that TeamMatchDetails uses for consistency
        const timestamp = Date.now(); // Add cache busting timestamp
        const response = await api.fetchTeamMatchHistory(teamId, timestamp);
        
        if (response && response.matches && Array.isArray(response.matches)) {
          // Convert the match history data to the format needed for the prediction history table
          const processedPredictions = response.matches.map(match => {
            // Determine if the team is home or away
            const isHome = match.teamIsHome;
            
            // Get opponent name based on whether the team is home or away
            const opponent = isHome ? match.awayTeam.name : match.homeTeam.name;
            
            // Format score
            const score = match.score?.fullTime ? 
              `${match.score.fullTime.home}-${match.score.fullTime.away}` : 
              '0-0';
            
            // Convert prediction to display format
            let prediction = 'Unknown';
            if (match.prediction === 'HOME_TEAM') {
              prediction = 'Home Win';
            } else if (match.prediction === 'AWAY_TEAM') {
              prediction = 'Away Win';
            } else if (match.prediction === 'DRAW') {
              prediction = 'Draw';
            }
            
            return {
              date: match.date,
              competition: match.competition?.name || 'Unknown League',
              competitionLogo: match.competition?.emblem || null,
              opponent,
              opponentLogo: isHome ? match.awayTeam.crest : match.homeTeam.crest,
              isHome,
              score,
              prediction,
              result: match.predictionCorrect ? 'Correct' : 'Incorrect'
            };
          });
          
          setPredictionHistory(processedPredictions);
          
          // Calculate stats from the response
          if (response.stats) {
            setStats({
              total: response.stats.totalMatches || 0,
              correct: response.stats.correctPredictions || 0,
              accuracy: response.stats.accuracy || 0
            });
          } else {
            // Calculate from processed predictions if stats not provided
            const correct = processedPredictions.filter(p => p.result === 'Correct').length;
            const total = processedPredictions.length;
            const accuracy = total > 0 ? (correct / total) * 100 : 0;
            
            setStats({
              total,
              correct,
              accuracy: Math.round(accuracy * 100) / 100 // Round to 2 decimal places
            });
          }
        } else {
          throw new Error('Invalid response format from API');
        }
      } catch (error) {
        console.error('Error fetching team prediction history:', error);
        // Set empty data as fallback
        setPredictionHistory([]);
        setStats({ total: 0, correct: 0, accuracy: 0 });
      } finally {
        setLoading(false);
      }
    };

    if (teamId) {
      fetchTeamPredictions();
    }
  }, [teamId]);

  // Format the accuracy to show only 2 decimal places
  const formattedAccuracy = Number(stats.accuracy).toFixed(2);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-40">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
        <div className="text-gray-400 text-sm">Loading prediction history...</div>
      </div>
    );
  }

  if (predictionHistory.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="text-gray-400 text-sm">No prediction history available for {teamName}</div>
      </div>
    );
  }

  // Helper to format the date more compactly
  const formatCompactDate = (dateString) => {
    const date = new Date(dateString);
    // Return date in format MMM D (e.g., Mar 16)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full">
      {/* Header with team info and stats */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <img src={teamLogo} alt={teamName} className="w-6 h-6 object-contain" />
          <span className="text-white text-sm font-medium">{teamName}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500/20 text-emerald-400 text-xs font-medium px-2 py-1 rounded">
            {formattedAccuracy}% Accuracy
          </div>
          <div className="text-gray-400 text-xs">
            {stats.correct}/{stats.total}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-700 rounded-full mb-3 overflow-hidden">
        <div 
          className="h-full bg-emerald-500 rounded-full" 
          style={{ width: `${stats.accuracy}%` }}
        ></div>
      </div>

      {/* Ultra compact prediction history table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-xs text-gray-400 uppercase">
            <tr className="border-b border-gray-700">
              <th className="py-1 px-1">Date</th>
              <th className="py-1 px-1 w-6"></th> {/* Competition Logo Column */}
              <th className="py-1 px-1">Match</th>
              <th className="py-1 px-1 text-center">Score</th>
              <th className="py-1 px-1 text-center w-4">P</th>
              <th className="py-1 px-1 text-center w-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {predictionHistory.map((prediction, index) => (
              <tr key={index} className="hover:bg-gray-800/30">
                <td className="py-1 px-1 whitespace-nowrap text-gray-400 text-xs">
                  {formatCompactDate(prediction.date)}
                </td>
                <td className="py-1 px-1 w-6" title={prediction.competition}>
                  {prediction.competitionLogo ? (
                    <div className="h-4 w-4 flex items-center justify-center">
                      <img 
                        src={prediction.competitionLogo} 
                        alt={prediction.competition} 
                        className="h-4 w-4 object-contain" 
                      />
                    </div>
                  ) : (
                    <div className="h-4 w-4 bg-gray-700 rounded-full flex items-center justify-center text-[8px] text-gray-400" title={prediction.competition}>
                      {prediction.competition.charAt(0)}
                    </div>
                  )}
                </td>
                <td className="py-1 px-1">
                  <div className="flex items-center text-xs">
                    {/* Only show the opponent and a small indicator for home/away */}
                    <span className={`text-[10px] mr-1 ${prediction.isHome ? 'text-green-400' : 'text-blue-400'}`}>
                      {prediction.isHome ? 'H' : 'A'}
                    </span>
                    
                    {/* Add opponent logo if available */}
                    {prediction.opponentLogo && (
                      <img 
                        src={prediction.opponentLogo} 
                        alt={prediction.opponent}
                        className="h-3 w-3 mr-1 object-contain"
                      />
                    )}
                    
                    <span className="truncate max-w-[75px]" title={prediction.opponent}>
                      {prediction.opponent}
                    </span>
                  </div>
                </td>
                <td className="py-1 px-1 text-center whitespace-nowrap">
                  {prediction.score}
                </td>
                <td className="py-1 px-0 text-center">
                  <span className={`inline-block w-4 h-4 rounded-full text-[10px] flex items-center justify-center
                    ${prediction.prediction === 'Home Win' ? 'bg-blue-500/20 text-blue-400' : 
                      prediction.prediction === 'Draw' ? 'bg-gray-500/20 text-gray-300' : 
                      'bg-orange-500/20 text-orange-400'}`
                  } title={prediction.prediction}>
                    {prediction.prediction === 'Home Win' ? 'H' : 
                     prediction.prediction === 'Away Win' ? 'A' : 'D'}
                  </span>
                </td>
                <td className="py-1 px-0 text-center w-4">
                  {prediction.result === 'Correct' ? (
                    <Check size={10} className="text-emerald-500 inline-block" />
                  ) : (
                    <X size={10} className="text-red-500 inline-block" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamPredictionHistory;