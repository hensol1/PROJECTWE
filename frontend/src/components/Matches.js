import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { format, addDays, subDays, parseISO } from 'date-fns';
import AccuracyComparison from './AccuracyComparison'; // Import the new component

const Matches = ({ user }) => {
  const [matches, setMatches] = useState({});
  const [fanAccuracy, setFanAccuracy] = useState(0);
  const [aiAccuracy, setAIAccuracy] = useState(0);
  const [totalPredictions, setTotalPredictions] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [collapsedLeagues, setCollapsedLeagues] = useState({});
  const [userVotes, setUserVotes] = useState({});

  const sortMatches = (matches) => {
    const statusOrder = ['IN_PLAY', 'PAUSED', 'HALFTIME', 'LIVE', 'TIMED', 'SCHEDULED', 'FINISHED'];
    return Object.entries(matches).reduce((acc, [competition, competitionMatches]) => {
      acc[competition] = competitionMatches.sort((a, b) => {
        const statusA = statusOrder.indexOf(a.status);
        const statusB = statusOrder.indexOf(b.status);
        
        if (statusA === statusB) {
          return new Date(a.utcDate) - new Date(b.utcDate);
        }
        
        if (statusA === -1) return 1;
        if (statusB === -1) return -1;
        
        return statusA - statusB;
      });
      return acc;
    }, {});
  };

  useEffect(() => {
    fetchMatches(currentDate);
  }, [currentDate]);

  const fetchMatches = async (date) => {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      console.log('Fetching matches for date:', formattedDate);
      const response = await api.get(`/api/matches?date=${formattedDate}`);
      console.log('Fetched matches:', response.data);
      
      const groupedMatches = response.data.matches.reduce((acc, match) => {
        if (!acc[match.competition.name]) {
          acc[match.competition.name] = [];
        }
        acc[match.competition.name].push(match);
        return acc;
      }, {});

      const sortedMatches = sortMatches(groupedMatches);

      setMatches(sortedMatches);
      setFanAccuracy(response.data.fanAccuracy);
      setAIAccuracy(response.data.aiAccuracy);
      setTotalPredictions(response.data.totalPredictions);
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
        case 'FINISHED': return 'bg-gray-500 text-white';
        case 'IN_PLAY':
        case 'HALFTIME':
        case 'LIVE': return 'bg-green-500 text-white';
        case 'TIMED':
        case 'SCHEDULED': return 'bg-blue-500 text-white';
        default: return 'bg-gray-200 text-gray-800';
      }
    };

    return (
      <span className={`inline-block px-1 py-0.5 rounded text-xs font-medium ${statusStyle(match.status)}`}>
        {match.status}
      </span>
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
          match.id === matchId ? { 
            ...match, 
            votes: response.data.votes,
            voteCounts: {
              home: response.data.votes.home,
              draw: response.data.votes.draw,
              away: response.data.votes.away
            },
            userVote: vote
          } : match
        );
      }
      return updatedMatches;
    });
    // Remove the alert('Vote recorded successfully'); line
  } catch (error) {
    console.error('Error voting:', error);
    alert('Failed to record vote');
  }
};
  
  
  const renderVoteButtons = useCallback((match) => {
    const hasVoted = match.userVote;
    const totalVotes = match.voteCounts.home + match.voteCounts.draw + match.voteCounts.away;
    
    const getPercentage = (voteCount) => {
      return totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
    };
    
    if (match.status === 'TIMED' || match.status === 'SCHEDULED') {
      return (
        <div className="flex justify-center mt-2">
          <button 
            onClick={() => handleVote(match.id, 'home')} 
            className={`bg-blue-500 text-white px-1 py-0.5 rounded-l text-xs ${hasVoted ? 'cursor-default' : ''}`}
            disabled={hasVoted}
          >
            Home {hasVoted ? `${getPercentage(match.voteCounts.home)}%` : ''}
          </button>
          <button 
            onClick={() => handleVote(match.id, 'draw')} 
            className={`bg-gray-500 text-white px-1 py-0.5 text-xs ${hasVoted ? 'cursor-default' : ''}`}
            disabled={hasVoted}
          >
            Draw {hasVoted ? `${getPercentage(match.voteCounts.draw)}%` : ''}
          </button>
          <button 
            onClick={() => handleVote(match.id, 'away')} 
            className={`bg-red-500 text-white px-1 py-0.5 rounded-r text-xs ${hasVoted ? 'cursor-default' : ''}`}
            disabled={hasVoted}
          >
            Away {hasVoted ? `${getPercentage(match.voteCounts.away)}%` : ''}
          </button>
        </div>
      );
    }
    return null;
  }, [handleVote]);

const renderPredictions = useCallback((match) => {
  const getTeamPrediction = (prediction) => {
    switch(prediction) {
      case 'HOME_TEAM':
        return (
          <>
            {match.homeTeam.name} <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="w-3 h-3 inline-block ml-0.5" />
          </>
        );
      case 'AWAY_TEAM':
        return (
          <>
            {match.awayTeam.name} <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="w-3 h-3 inline-block ml-0.5" />
          </>
        );
      case 'DRAW':
        return 'Draw';
      default:
        return 'No prediction';
    }
  };

  return (
    <div className="mt-1 text-xs flex justify-between">
      <p className={`p-0.5 rounded ${match.status === 'FINISHED' ? (match.fanPredictionCorrect ? 'bg-green-100' : 'bg-red-100') : ''}`}>
        Fans: {match.fanPrediction ? getTeamPrediction(match.fanPrediction) : 'No votes yet'}
      </p>
      {match.aiPrediction && (
        <p className={`p-0.5 rounded ${match.status === 'FINISHED' ? (match.aiPredictionCorrect ? 'bg-green-100' : 'bg-red-100') : ''}`}>
          AI: {getTeamPrediction(match.aiPrediction)}
        </p>
      )}
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
    <div className="max-w-3xl mx-auto px-2">
      <AccuracyComparison fanAccuracy={fanAccuracy} aiAccuracy={aiAccuracy} />

      <div className="flex justify-between items-center my-2">
        <button onClick={() => handleDateChange(-1)} className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-lg transition duration-200 text-sm">
          Previous Day
        </button>
        <h2 className="text-lg font-bold text-gray-800">{format(currentDate, 'dd MMM yyyy')}</h2>
        <button onClick={() => handleDateChange(1)} className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-lg transition duration-200 text-sm">
          Next Day
        </button>
      </div>

      {Object.entries(matches).map(([competition, competitionMatches]) => (
        <div key={competition} className="mb-2">
          <button 
            className="w-full text-left text-sm font-semibold mb-1 flex items-center bg-gray-200 p-1 rounded-lg hover:bg-gray-300 transition duration-200"
            onClick={() => toggleLeague(competition)}
          >
            <img src={competitionMatches[0].competition.emblem} alt={competition} className="w-5 h-5 mr-1" />
            {competition}
            <span className="ml-auto">{collapsedLeagues[competition] ? '▼' : '▲'}</span>
          </button>
          {!collapsedLeagues[competition] && (
            <div className="space-y-1">
{competitionMatches.map(match => (
  <div key={match.id} className="bg-white shadow-md rounded-lg p-2">
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center justify-start w-5/12">
        <div className="w-4 h-4 flex-shrink-0 mr-1">
          <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="w-full h-full object-contain" />
        </div>
        <span className="font-semibold truncate">{match.homeTeam.name}</span>
      </div>
      <div className="text-center w-2/12 flex flex-col items-center">
        <div className="mb-1">
          {renderMatchStatus(match)}
        </div>
        <span className="font-bold">
          {match.status === 'SCHEDULED' || match.status === 'TIMED'
            ? formatMatchDate(match.utcDate)
            : `${match.score.fullTime.home} - ${match.score.fullTime.away}`}
        </span>
      </div>
      <div className="flex items-center justify-end w-5/12">
        <span className="font-semibold truncate">{match.awayTeam.name}</span>
        <div className="w-4 h-4 flex-shrink-0 ml-1">
          <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="w-full h-full object-contain" />
        </div>
      </div>
    </div>
    {renderVoteButtons(match)}
    {renderPredictions(match)}
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
