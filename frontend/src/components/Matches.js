import React, { useState, useEffect } from 'react';
import api from '../api';
import { format, addDays, subDays, parseISO } from 'date-fns';

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
    setCurrentDate(prevDate => {
      const newDate = days > 0 ? addDays(prevDate, days) : subDays(prevDate, Math.abs(days));
      console.log('New date:', format(newDate, 'yyyy-MM-dd'));
      return newDate;
    });
  };

  const formatMatchDate = (dateString) => {
    const date = parseISO(dateString);
    return format(date, 'HH:mm');
  };

  const renderMatchStatus = (match) => {
    switch (match.status) {
      case 'SCHEDULED':
      case 'TIMED':
        return `${formatMatchDate(match.utcDate)} - ${match.status}`;
      case 'IN_PLAY':
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
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => handleDateChange(-1)} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-200">
          Previous Day
        </button>
        <h2 className="text-2xl font-bold text-gray-800">{format(currentDate, 'dd MMM yyyy')}</h2>
        <button onClick={() => handleDateChange(1)} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-200">
          Next Day
        </button>
      </div>
      <button onClick={fetchAllMatches} className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg mb-8 transition duration-200">
        Fetch All Matches
      </button>

      {Object.entries(groupedMatches).map(([competition, competitionMatches]) => (
        <div key={competition} className="mb-8">
          <h3 className="text-xl font-semibold mb-4 flex items-center bg-gray-200 p-2 rounded-lg">
            <img src={competitionMatches[0].competition.emblem} alt={competition} className="w-8 h-8 mr-2" />
            {competition}
          </h3>
          {competitionMatches.map(match => (
            <div key={match.id} className="bg-white shadow-md rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center w-2/5 justify-end">
                  <span className="font-semibold mr-2">{match.homeTeam.name}</span>
                  <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="w-8 h-8" />
                </div>
                <div className="text-center w-1/5">
                  <span className="px-2 py-1 bg-gray-200 rounded text-sm font-medium">
                    {renderMatchStatus(match)}
                  </span>
                </div>
                <div className="flex items-center w-2/5">
                  <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="w-8 h-8" />
                  <span className="font-semibold ml-2">{match.awayTeam.name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Matches;
