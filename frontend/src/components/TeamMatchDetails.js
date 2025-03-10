// frontend/src/components/TeamMatchDetails.js
import React from 'react';

const TeamMatchDetails = ({ matchHistory, onClose }) => {
  // If no match history, show loading
  if (!matchHistory) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Team Match History</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  const { team, stats, matches } = matchHistory;

  // Format date to a readable format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Function to determine result styling based on prediction correctness
  const getResultStyling = (match) => {
    if (match.predictionCorrect) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else {
      return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  // Function to get prediction text
  const getPredictionText = (match) => {
    const predictionMap = {
      'HOME_TEAM': 'Home Win',
      'AWAY_TEAM': 'Away Win',
      'DRAW': 'Draw'
    };
    return predictionMap[match.prediction] || match.prediction;
  };

  // Function to get actual result text
  const getResultText = (match) => {
    const resultMap = {
      'HOME_TEAM': 'Home Win',
      'AWAY_TEAM': 'Away Win',
      'DRAW': 'Draw'
    };
    return resultMap[match.actualResult] || match.actualResult;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
        <div className="flex items-center">
          {team.crest && (
            <div className="flex-shrink-0 h-8 w-8 mr-3">
              <img className="h-8 w-8" src={team.crest} alt={`${team.name} logo`} />
            </div>
          )}
          <h3 className="text-lg font-medium">{team.name} Match History</h3>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="p-4 border-b">
        <div className="flex flex-wrap justify-between items-center">
          <div className="mb-2 sm:mb-0">
            <span className="text-sm text-gray-500">Prediction Accuracy:</span>
            <span className="ml-2 font-medium">{stats.accuracy.toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">Correct Predictions:</span>
            <span className="ml-2 font-medium">{stats.correctPredictions}/{stats.totalMatches}</span>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block sm:hidden">
        <div className="divide-y divide-gray-200">
          {matches.map((match) => (
            <div key={match.id} className="p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-gray-500">{formatDate(match.date)}</div>
                <div className="text-xs font-medium">
                  {match.competition?.name || 'Unknown League'}
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {match.homeTeam.crest && (
                    <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="h-4 w-4 mr-1" />
                  )}
                  <span className={`text-sm ${match.teamIsHome ? 'font-bold' : ''}`}>{match.homeTeam.name}</span>
                </div>
                <div className="text-sm font-medium">
                  {match.score?.fullTime?.home} - {match.score?.fullTime?.away}
                </div>
                <div className="flex items-center">
                  {match.awayTeam.crest && (
                    <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="h-4 w-4 mr-1" />
                  )}
                  <span className={`text-sm ${!match.teamIsHome ? 'font-bold' : ''}`}>{match.awayTeam.name}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-500">Prediction:</span>
                  <span className="ml-1">{getPredictionText(match)}</span>
                </div>
                <div className={`px-2 py-0.5 rounded border ${getResultStyling(match)}`}>
                  {match.predictionCorrect ? '✓ Correct' : '✗ Incorrect'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Competition</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prediction</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {matches.map((match, index) => (
              <tr key={match.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(match.date)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {match.competition?.name || 'Unknown League'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex items-center">
                      {match.homeTeam.crest && (
                        <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="h-5 w-5 mr-2" />
                      )}
                      <span className={`text-sm ${match.teamIsHome ? 'font-medium' : ''}`}>{match.homeTeam.name}</span>
                    </div>
                    <span className="mx-2 text-gray-500">vs</span>
                    <div className="flex items-center">
                      {match.awayTeam.crest && (
                        <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="h-5 w-5 mr-2" />
                      )}
                      <span className={`text-sm ${!match.teamIsHome ? 'font-medium' : ''}`}>{match.awayTeam.name}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                  {match.score?.fullTime?.home} - {match.score?.fullTime?.away}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {getPredictionText(match)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getResultStyling(match)}`}>
                    {match.predictionCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {matches.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No match data available for this team
        </div>
      )}
    </div>
  );
};

export default TeamMatchDetails;