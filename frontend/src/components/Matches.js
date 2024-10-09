import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { format, addDays, subDays, parseISO } from 'date-fns';

const Matches = ({ user }) => {
  const [matches, setMatches] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [collapsedLeagues, setCollapsedLeagues] = useState({});

  useEffect(() => {
    fetchMatches(currentDate);
  }, [currentDate]);

  const fetchMatches = async (date) => {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      console.log('Fetching matches for date:', formattedDate);
      const response = await api.get(`/api/matches?date=${formattedDate}`);
      console.log('Fetched matches:', response.data);
      
      const groupedMatches = response.data.reduce((acc, match) => {
        if (!acc[match.competition.name]) {
          acc[match.competition.name] = [];
        }
        acc[match.competition.name].push(match);
        return acc;
      }, {});

      setMatches(groupedMatches);
      // Reset collapsed state when fetching new matches
      setCollapsedLeagues({});
    } catch (error) {
      console.error('Error fetching matches:', error.response ? error.response.data : error.message);
      setMatches({});
    }
  };

  const fetchAllMatches = async () => {
    try {
      console.log('Fetching all matches');
      const response = await api.get('/api/matches/all');
      console.log('Fetched all matches:', response.data);
      
      const groupedMatches = response.data.reduce((acc, match) => {
        if (!acc[match.competition.name]) {
          acc[match.competition.name] = [];
        }
        acc[match.competition.name].push(match);
        return acc;
      }, {});

      setMatches(groupedMatches);
      // Reset collapsed state when fetching all matches
      setCollapsedLeagues({});
    } catch (error) {
      console.error('Error fetching all matches:', error.response ? error.response.data : error.message);
      setMatches({});
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
    const statusStyle = (status) => {
      switch (status) {
        case 'FINISHED':
          return 'bg-gray-500 text-white';
        case 'IN_PLAY':
        case 'PAUSED':
        case 'LIVE':
          return 'bg-green-500 text-white';
        case 'TIMED':
        case 'SCHEDULED':
          return 'bg-blue-500 text-white';
        default:
          return 'bg-gray-200 text-gray-800';
      }
    };

    return (
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold mb-1">
          {match.status === 'SCHEDULED' || match.status === 'TIMED'
            ? formatMatchDate(match.utcDate)
            : `${match.score.fullTime.home} - ${match.score.fullTime.away}`}
        </span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusStyle(match.status)}`}>
          {match.status}
        </span>
      </div>
    );
  };

  const handleVote = async (matchId, vote) => {
    if (!user) {
      alert('Please log in to vote');
      return;
    }

    try {
      const response = await api.voteForMatch(matchId, vote);
      setMatches(prevMatches => {
        const updatedMatches = { ...prevMatches };
        for (let league in updatedMatches) {
          updatedMatches[league] = updatedMatches[league].map(match => 
            match.id === matchId ? { ...match, votes: response.data.votes } : match
          );
        }
        return updatedMatches;
      });
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to record vote');
    }
  };

const renderVoteButtons = useCallback((match) => {
  if (match.status === 'TIMED' || match.status === 'SCHEDULED') {
    return (
      <div className="flex justify-between items-center mt-2">
        <button onClick={() => handleVote(match.id, 'home')} className="bg-blue-500 text-white px-2 py-1 rounded text-sm">
          Home
        </button>
        <button onClick={() => handleVote(match.id, 'draw')} className="bg-gray-500 text-white px-2 py-1 rounded text-sm">
          Draw
        </button>
        <button onClick={() => handleVote(match.id, 'away')} className="bg-red-500 text-white px-2 py-1 rounded text-sm">
          Away
        </button>
      </div>
    );
  } else {
    return (
      <div className="mt-2 text-sm text-center">
        <p>Votes: Home {match.votes?.home || 0}, Draw {match.votes?.draw || 0}, Away {match.votes?.away || 0}</p>
      </div>
    );
  }
}, [handleVote]);


  const renderFansPrediction = useCallback((match) => {
    const votes = match.votes || { home: 0, draw: 0, away: 0 };
    const maxVotes = Math.max(votes.home, votes.draw, votes.away);
    let prediction = '';

    if (maxVotes === 0) {
      prediction = 'No votes yet';
    } else if (votes.home === maxVotes) {
      prediction = `${match.homeTeam.name} (Home)`;
    } else if (votes.away === maxVotes) {
      prediction = `${match.awayTeam.name} (Away)`;
    } else {
      prediction = 'Draw';
    }

    return (
      <div className="mt-2 text-sm text-center">
        <p>Fans Prediction: {prediction}</p>
      </div>
    );
  }, []);

  const toggleLeague = (competition) => {
    setCollapsedLeagues(prev => ({
      ...prev,
      [competition]: !prev[competition]
    }));
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
          <button 
            className="w-full text-left text-xl font-semibold mb-2 flex items-center bg-gray-200 p-2 rounded-lg hover:bg-gray-300 transition duration-200"
            onClick={() => toggleLeague(competition)}
          >
            <img src={competitionMatches[0].competition.emblem} alt={competition} className="w-8 h-8 mr-2" />
            {competition}
            <span className="ml-auto">{collapsedLeagues[competition] ? '▼' : '▲'}</span>
          </button>
          {!collapsedLeagues[competition] && (
            <div className="space-y-2">
              {competitionMatches.map(match => (
                <div key={match.id} className="bg-white shadow-md rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center w-2/5 justify-end">
                      <span className="font-semibold mr-2">{match.homeTeam.name}</span>
                      <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="w-8 h-8" />
                    </div>
                    <div className="text-center w-1/5">
                      {renderMatchStatus(match)}
                    </div>
                    <div className="flex items-center w-2/5">
                      <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="w-8 h-8" />
                      <span className="font-semibold ml-2">{match.awayTeam.name}</span>
                    </div>
                  </div>
                  {renderVoteButtons(match)}
                  {renderFansPrediction(match)}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Matches;