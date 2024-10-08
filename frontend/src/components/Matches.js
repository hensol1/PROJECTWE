import React, { useState, useEffect } from 'react';
import api from '../api';
import { format, addDays, subDays } from 'date-fns';

const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchMatches(currentDate);
  }, [currentDate]);

  const fetchMatches = async (date) => {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      console.log('Fetching matches for date:', formattedDate);
      const response = await api.get(`/api/matches?date=${formattedDate}`);
      console.log('Fetched matches:', response.data);
      setMatches(response.data);
    } catch (error) {
      console.error('Error fetching matches:', error.response ? error.response.data : error.message);
      setMatches([]);
    }
  };

  const fetchAllMatches = async () => {
    try {
      console.log('Fetching all matches');
      const response = await api.get('/api/matches/all');
      console.log('Fetched all matches:', response.data);
      setMatches(response.data);
    } catch (error) {
      console.error('Error fetching all matches:', error.response ? error.response.data : error.message);
      setMatches([]);
    }
  };

  const handleDateChange = (days) => {
    setCurrentDate(prevDate => days > 0 ? addDays(prevDate, days) : subDays(prevDate, Math.abs(days)));
  };

  const renderMatchStatus = (match) => {
    switch (match.status) {
      case 'SCHEDULED':
      case 'TIMED':
        return `${format(new Date(match.utcDate), 'HH:mm')} - ${match.status}`;
      case 'IN_PLAY':
      case 'HALFTIME':
      case 'PAUSED':
      case 'LIVE':
        return `${match.score.fullTime.home} - ${match.score.fullTime.away} (${match.status})`;
      case 'FINISHED':
        return `${match.score.fullTime.home} - ${match.score.fullTime.away} (Finished)`;
      default:
        return match.status;
    }
  };

  const groupedMatches = matches.reduce((acc, match) => {
    if (!acc[match.competition.name]) {
      acc[match.competition.name] = [];
    }
    acc[match.competition.name].push(match);
    return acc;
  }, {});

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center my-4">
        <button onClick={() => handleDateChange(-1)} className="bg-blue-500 text-white px-4 py-2 rounded">
          Previous Day
        </button>
        <h2 className="text-xl font-bold">{format(currentDate, 'dd MMM yyyy')}</h2>
        <button onClick={() => handleDateChange(1)} className="bg-blue-500 text-white px-4 py-2 rounded">
          Next Day
        </button>
      </div>
      <button onClick={fetchAllMatches} className="bg-green-500 text-white px-4 py-2 rounded mb-4">
        Fetch All Matches
      </button>

      {Object.entries(groupedMatches).map(([competition, competitionMatches]) => (
        <div key={competition} className="mb-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <img src={competitionMatches[0].competition.emblem} alt={competition} className="w-6 h-6 mr-2" />
            {competition}
          </h3>
          {competitionMatches.map(match => (
            <div key={match.id} className="bg-white shadow rounded-lg p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center w-1/3">
                <span className="font-semibold">{match.homeTeam.name}</span>
                <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="w-8 h-8 mx-2" />
              </div>
              <div className="text-center w-1/3">
                {renderMatchStatus(match)}
              </div>
              <div className="flex items-center justify-end w-1/3">
                <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="w-8 h-8 mx-2" />
                <span className="font-semibold">{match.awayTeam.name}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Matches;

