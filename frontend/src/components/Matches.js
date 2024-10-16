import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { format, addDays, subDays, parseISO } from 'date-fns';
import AccuracyComparison from './AccuracyComparison';

const Matches = ({ user }) => {
  const [matches, setMatches] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [fanAccuracy, setFanAccuracy] = useState(0);
  const [aiAccuracy, setAIAccuracy] = useState(0);
  const [totalPredictions, setTotalPredictions] = useState(0);
  const [collapsedLeagues, setCollapsedLeagues] = useState({});
  const [selectedContinent, setSelectedContinent] = useState('All');

  const continentalLeagues = {
    Europe: [2, 3, 39, 40, 61, 62, 78, 79, 81, 88, 94, 103, 106, 113, 119, 135, 140, 143, 144, 172, 179, 197, 203, 207, 210, 218, 235, 271, 283, 286, 318, 327, 333, 345, 373, 383, 848],
    International: [4, 5, 6, 10, 34],
    Americas: [11, 13, 71, 128, 253],
    Asia: [17, 30, 169, 188],
    Africa: [12, 20, 29]
  };
  
  const priorityLeagues = [2, 3, 39, 140, 78, 135, 61];


  const sortMatches = (matches) => {
    const statusOrder = ['IN_PLAY', 'PAUSED', 'HALFTIME', 'LIVE', 'TIMED', 'SCHEDULED', 'FINISHED'];
    return Object.entries(matches).reduce((acc, [leagueKey, competitionMatches]) => {
      acc[leagueKey] = competitionMatches.sort((a, b) => {
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

  const fetchMatches = useCallback(async (date) => {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      console.log('Fetching matches for date:', formattedDate);
      const response = await api.fetchMatches(formattedDate);
      console.log('Fetched matches:', response.data);
      
      const groupedMatches = response.data.matches.reduce((acc, match) => {
        const leagueKey = `${match.competition.name}_${match.competition.id}`;
        if (!acc[leagueKey]) {
          acc[leagueKey] = [];
        }
        acc[leagueKey].push(match);
        return acc;
      }, {});

      const sortedMatches = sortMatches(groupedMatches);

      setMatches(sortedMatches);
      setFanAccuracy(response.data.fanAccuracy);
      setAIAccuracy(response.data.aiAccuracy);
      setTotalPredictions(response.data.totalPredictions);
      setCollapsedLeagues({});
    } catch (error) {
      console.error('Error fetching matches:', error);
      setMatches({});
    }
  }, []);
  
  useEffect(() => {
    fetchMatches(currentDate);
  }, [currentDate, user, fetchMatches]);


  const handleDateChange = (days) => {
    setCurrentDate(prevDate => {
      const newDate = days > 0 ? addDays(prevDate, days) : subDays(prevDate, Math.abs(days));
      console.log('New date:', format(newDate, 'yyyy-MM-dd'));
      return newDate;
    });
  };

  const toggleLeague = (leagueKey) => {
    setCollapsedLeagues(prev => ({
      ...prev,
      [leagueKey]: !prev[leagueKey]
    }));
  };

  const getLeagueContinent = (leagueId) => {
    for (const [continent, leagues] of Object.entries(continentalLeagues)) {
      if (leagues.includes(leagueId)) {
        return continent;
      }
    }
    return 'Other';
  };

  const filteredMatches = Object.entries(matches).reduce((acc, [leagueKey, leagueMatches]) => {
    const [, leagueId] = leagueKey.split('_');
    const continent = getLeagueContinent(parseInt(leagueId));
    if (selectedContinent === 'All' || continent === selectedContinent) {
      acc[leagueKey] = leagueMatches;
    }
    return acc;
  }, {});

  const sortedLeagues = Object.entries(filteredMatches).sort((a, b) => {
    const [, aId] = a[0].split('_');
    const [, bId] = b[0].split('_');
    const aIndex = priorityLeagues.indexOf(parseInt(aId));
    const bIndex = priorityLeagues.indexOf(parseInt(bId));
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    } else if (aIndex !== -1) {
      return -1;
    } else if (bIndex !== -1) {
      return 1;
    } else {
      return a[0].localeCompare(b[0]);
    }
  });


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
            userVote: response.data.userVote
          } : match
        );
      }
      return updatedMatches;
    });
  } catch (error) {
    console.error('Error voting:', error);
    alert(error.response?.data?.message || 'Failed to record vote. Please try again.');
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
        {['home', 'draw', 'away'].map((voteType) => (
          <button 
            key={voteType}
            onClick={() => handleVote(match.id, voteType)} 
            className={`bg-${voteType === 'draw' ? 'gray' : voteType === 'home' ? 'blue' : 'red'}-500 text-white px-1 py-0.5 ${voteType === 'home' ? 'rounded-l' : voteType === 'away' ? 'rounded-r' : ''} text-xs ${hasVoted ? 'cursor-default' : ''}`}
            disabled={hasVoted}
          >
            {voteType.charAt(0).toUpperCase() + voteType.slice(1)} {hasVoted ? `${getPercentage(match.voteCounts[voteType])}%` : ''}
          </button>
        ))}
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

    const getUserVote = () => {
      if (!match.userVote) return null;

      let highlightColor = 'bg-yellow-100';
      if (match.status === 'FINISHED') {
        const homeScore = match.score.fullTime.home;
        const awayScore = match.score.fullTime.away;
        const result = homeScore > awayScore ? 'home' : (awayScore > homeScore ? 'away' : 'draw');
        highlightColor = match.userVote === result ? 'bg-green-100' : 'bg-red-100';
      }

      let voteContent;
      switch(match.userVote) {
        case 'home':
          voteContent = (
            <>
              {match.homeTeam.name} <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="w-3 h-3 inline-block ml-0.5" />
            </>
          );
          break;
        case 'away':
          voteContent = (
            <>
              {match.awayTeam.name} <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="w-3 h-3 inline-block ml-0.5" />
            </>
          );
          break;
        case 'draw':
          voteContent = 'Draw';
          break;
        default:
          return null;
      }

      return (
        <div className="flex justify-center mt-1">
          <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded ${highlightColor}`}>
            Your vote: {voteContent}
          </span>
        </div>
      );
    };

    return (
      <div className="mt-1 text-xs space-y-1">
        <div className="flex justify-between">
          <p className={`p-0.5 rounded ${match.status === 'FINISHED' ? (match.fanPredictionCorrect ? 'bg-green-100' : 'bg-red-100') : ''}`}>
            Fans: {match.fanPrediction ? getTeamPrediction(match.fanPrediction) : 'No votes yet'}
          </p>
          {match.aiPrediction && (
            <p className={`p-0.5 rounded ${match.status === 'FINISHED' ? (match.aiPredictionCorrect ? 'bg-green-100' : 'bg-red-100') : ''}`}>
              AI: {getTeamPrediction(match.aiPrediction)}
            </p>
          )}
        </div>
        {getUserVote()}
      </div>
    );
  }, []);

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

      <div className="flex justify-center space-x-2 my-4">
        {['All', 'Europe', 'Americas', 'Asia', 'Africa', 'International'].map(continent => (
          <button
            key={continent}
            onClick={() => setSelectedContinent(continent)}
            className={`px-2 py-1 rounded ${
              selectedContinent === continent ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
            }`}
          >
            {continent}
          </button>
        ))}
      </div>

      {sortedLeagues.map(([leagueKey, competitionMatches]) => {
        const [leagueName, leagueId] = leagueKey.split('_');
        return (
          <div key={leagueKey} className="mb-2">
            <button 
              className="w-full text-left text-sm font-semibold mb-1 flex items-center bg-gray-200 p-1 rounded-lg hover:bg-gray-300 transition duration-200"
              onClick={() => toggleLeague(leagueKey)}
            >
              <img src={competitionMatches[0].competition.emblem} alt={leagueName} className="w-5 h-5 mr-1" />
              {leagueName}
              <span className="ml-auto">{collapsedLeagues[leagueKey] ? '▼' : '▲'}</span>
            </button>
            {!collapsedLeagues[leagueKey] && (
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
        );
      })}
    </div>
  );
};

export default Matches;
