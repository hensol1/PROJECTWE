import React, { useState, useEffect } from 'react';
import api from '../api';
import { format, addDays, subDays } from 'date-fns';

// Admin action button component
const AdminButton = ({ onClick, isLoading, label, loadingLabel }) => {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:bg-gray-400 transition duration-200 min-w-[160px]"
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {loadingLabel}
        </span>
      ) : (
        label
      )}
    </button>
  );
};

const AdminControls = () => {
  const [isFetching, setIsFetching] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const handleFetchMatches = async () => {
    try {
      setIsFetching(true);
      const response = await api.triggerFetchMatches();
      console.log('Fetch matches result:', response.data);
      setLastAction({ type: 'success', message: 'Matches fetched successfully!' });
    } catch (error) {
      console.error('Fetch matches error:', error);
      setLastAction({ type: 'error', message: 'Error fetching matches: ' + (error.response?.data?.message || error.message) });
    } finally {
      setIsFetching(false);
    }
  };

  const handleRecalculateStats = async () => {
    try {
      setIsRecalculating(true);
      const response = await api.recalculateStats();
      console.log('Recalculation result:', response.data);
      setLastAction({ 
        type: 'success', 
        message: `Stats recalculated successfully. AI: ${response.data.stats.ai.accuracy}, Fans: ${response.data.stats.fans.accuracy}`
      });
    } catch (error) {
      console.error('Recalculation error:', error);
      setLastAction({ 
        type: 'error', 
        message: 'Error recalculating stats: ' + (error.response?.data?.message || error.message) 
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-6">
      <h2 className="text-xl font-semibold mb-4">Admin Controls</h2>
      <div className="flex flex-wrap gap-4 mb-4">
        <AdminButton
          onClick={handleFetchMatches}
          isLoading={isFetching}
          label="Fetch Matches"
          loadingLabel="Fetching..."
        />
        <AdminButton
          onClick={handleRecalculateStats}
          isLoading={isRecalculating}
          label="Recalculate Stats"
          loadingLabel="Recalculating..."
        />
      </div>
      {lastAction && (
        <div className={`mt-2 p-2 rounded ${
          lastAction.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {lastAction.message}
        </div>
      )}
    </div>
  );
};

const MatchCard = ({ match, onPrediction }) => {
  const getStatusClass = (status) => {
    switch (status) {
      case 'LIVE': return 'text-red-500';
      case 'FINISHED': return 'text-gray-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center flex-1">
          <img 
            src={match.homeTeam.crest} 
            alt={match.homeTeam.name}
            className="w-8 h-8 object-contain mr-2"
          />
          <span className="text-sm md:text-base">{match.homeTeam.name}</span>
        </div>
        <span className={`px-3 text-xs font-semibold ${getStatusClass(match.status)}`}>
          {match.status === 'LIVE' ? 'LIVE' : 
           match.status === 'FINISHED' ? 
             `${match.score.fullTime.home} - ${match.score.fullTime.away}` : 
             format(new Date(match.utcDate), 'HH:mm')}
        </span>
        <div className="flex items-center flex-1 justify-end">
          <span className="text-sm md:text-base mr-2">{match.awayTeam.name}</span>
          <img 
            src={match.awayTeam.crest} 
            alt={match.awayTeam.name}
            className="w-8 h-8 object-contain"
          />
        </div>
      </div>
      <div className="flex justify-center space-x-2">
        <button
          onClick={() => onPrediction(match.id, 'HOME_TEAM')}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition duration-200"
        >
          Home
        </button>
        <button
          onClick={() => onPrediction(match.id, 'DRAW')}
          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded transition duration-200"
        >
          Draw
        </button>
        <button
          onClick={() => onPrediction(match.id, 'AWAY_TEAM')}
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition duration-200"
        >
          Away
        </button>
      </div>
      {match.aiPrediction && (
        <div className="mt-2 text-sm text-center text-gray-600">
          Current AI Prediction: {match.aiPrediction}
        </div>
      )}
    </div>
  );
};

const AdminPage = () => {
  const [matches, setMatches] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchMatches(currentDate);
  }, [currentDate]);

  const fetchMatches = async (date) => {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const response = await api.fetchMatches(formattedDate);
      const groupedMatches = response.data.matches.reduce((acc, match) => {
        if (!acc[match.competition.name]) {
          acc[match.competition.name] = [];
        }
        acc[match.competition.name].push(match);
        return acc;
      }, {});
      setMatches(groupedMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
      alert('Failed to fetch matches. Please try again.');
    }
  };

  const handleDateChange = (days) => {
    setCurrentDate(prevDate => days > 0 ? addDays(prevDate, days) : subDays(prevDate, Math.abs(days)));
  };

  const handlePrediction = async (matchId, prediction) => {
    try {
      console.log('Attempting to make prediction:', { matchId, prediction });
      const response = await api.makeAIPrediction(matchId, prediction);
      console.log('Prediction response:', response.data);
      alert('AI prediction recorded successfully');
      fetchMatches(currentDate);
    } catch (error) {
      console.error('Error making AI prediction:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        alert(`Failed to record AI prediction: ${error.response.data.message}`);
      } else {
        alert('Failed to record AI prediction. Please try again.');
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <AdminControls />
      
      {/* Date Navigation */}
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={() => handleDateChange(-1)} 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-200"
        >
          Previous Day
        </button>
        <h2 className="text-2xl font-bold text-gray-800">{format(currentDate, 'dd MMM yyyy')}</h2>
        <button 
          onClick={() => handleDateChange(1)} 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-200"
        >
          Next Day
        </button>
      </div>

      {/* Matches Display */}
      {Object.entries(matches).map(([competition, competitionMatches]) => (
        <div key={competition} className="mb-4">
          <h2 className="text-xl font-semibold mb-2">{competition}</h2>
          {competitionMatches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              onPrediction={handlePrediction}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default AdminPage;