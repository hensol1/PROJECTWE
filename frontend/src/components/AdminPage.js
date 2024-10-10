import React, { useState, useEffect } from 'react';
import api from '../api';
import { format, addDays, subDays } from 'date-fns';

const AdminPage = () => {
  const [matches, setMatches] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchMatches(currentDate);
  }, [currentDate]);

  const fetchMatches = async (date) => {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const response = await api.get(`/api/matches?date=${formattedDate}`);
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
    }
  };

  const handleDateChange = (days) => {
    setCurrentDate(prevDate => days > 0 ? addDays(prevDate, days) : subDays(prevDate, Math.abs(days)));
  };

const handlePrediction = async (matchId, prediction) => {
  try {
    const response = await api.makeAIPrediction(matchId, prediction);
    console.log('AI prediction response:', response.data);
    fetchMatches(currentDate);
  } catch (error) {
    console.error('Error making AI prediction:', error.response?.data || error.message);
    alert('Failed to record AI prediction: ' + (error.response?.data?.message || error.message));
  }
};

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => handleDateChange(-1)} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-200">
          Previous Day
        </button>
        <h2 className="text-2xl font-bold text-gray-800">{format(currentDate, 'dd MMM yyyy')}</h2>
        <button onClick={() => handleDateChange(1)} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-200">
          Next Day
        </button>
      </div>
      {Object.entries(matches).map(([competition, competitionMatches]) => (
        <div key={competition} className="mb-4">
          <h2 className="text-xl font-semibold mb-2">{competition}</h2>
          {competitionMatches.map(match => (
            <div key={match.id} className="bg-white shadow-md rounded-lg p-4 mb-2">
              <div className="flex items-center justify-between mb-2">
                <span>{match.homeTeam.name}</span>
                <span>vs</span>
                <span>{match.awayTeam.name}</span>
              </div>
              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => handlePrediction(match.id, 'HOME_TEAM')}
                  className="bg-blue-500 text-white px-2 py-1 rounded"
                >
                  Home
                </button>
                <button
                  onClick={() => handlePrediction(match.id, 'DRAW')}
                  className="bg-gray-500 text-white px-2 py-1 rounded"
                >
                  Draw
                </button>
                <button
                  onClick={() => handlePrediction(match.id, 'AWAY_TEAM')}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Away
                </button>
              </div>
              {match.aiPrediction && (
                <div className="mt-2 text-sm text-center">
                  Current AI Prediction: {match.aiPrediction}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default AdminPage;