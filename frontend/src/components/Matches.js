import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { format, addDays, subDays, parseISO, startOfDay, endOfDay, isToday } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import AccuracyComparison from './AccuracyComparison';
import { BiAlarm, BiAlarmOff } from "react-icons/bi";
import CustomButton from './CustomButton';

const Matches = ({ user }) => {
  const [matches, setMatches] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [fanAccuracy, setFanAccuracy] = useState(0);
  const [aiAccuracy, setAIAccuracy] = useState(0);
  const [totalPredictions, setTotalPredictions] = useState(0);
  const [collapsedLeagues, setCollapsedLeagues] = useState({});
  const [selectedContinent, setSelectedContinent] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [userTimeZone, setUserTimeZone] = useState('');
  const [activeTab, setActiveTab] = useState("live");
  const [accuracyData, setAccuracyData] = useState({ fanAccuracy: 0, aiAccuracy: 0 });


  const continentalLeagues = {
    Europe: [2, 3, 39, 40, 61, 62, 78, 79, 81, 88, 94, 103, 106, 113, 119, 135, 140, 143, 144, 172, 179, 197, 203, 207, 210, 218, 235, 271, 283, 286, 318, 327, 333, 345, 373, 383, 848],
    International: [4, 5, 6, 10, 34],
    Americas: [11, 13, 71, 128, 253],
    Asia: [17, 30, 169, 188],
    Africa: [12, 20, 29]
  };
  
  const priorityLeagues = [2, 3, 39, 140, 78, 135, 61];

  useEffect(() => {
    setUserTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const sortMatches = (matches) => {
    const statusOrder = ['IN_PLAY', 'PAUSED', 'HALFTIME', 'LIVE', 'TIMED', 'SCHEDULED', 'FINISHED'];
    return Object.entries(matches).reduce((acc, [leagueKey, competitionMatches]) => {
      acc[leagueKey] = competitionMatches.sort((a, b) => {
        const statusA = statusOrder.indexOf(a.status);
        const statusB = statusOrder.indexOf(b.status);
        
        if (statusA !== statusB) {
          return statusA - statusB;
        }
        
        return new Date(a.utcDate) - new Date(b.utcDate);
      });
      return acc;
    }, {});
  };

  const fetchAccuracyData = useCallback(async () => {
    try {
      const response = await api.fetchAccuracy();
      setAccuracyData(response.data);
    } catch (error) {
      console.error('Error fetching accuracy data:', error);
    }
  }, []);

  const fetchMatches = useCallback(async (date) => {
    setIsLoading(true);
    try {
      const formattedDate = format(zonedTimeToUtc(date, userTimeZone), 'yyyy-MM-dd');
      
      console.log(`Fetching matches for ${formattedDate}`);
      const response = await api.fetchMatches(formattedDate);
      console.log('Fetched matches:', response.data);
      
      const groupedMatches = response.data.matches.reduce((acc, match) => {
        const matchLocalDate = utcToZonedTime(parseISO(match.utcDate), userTimeZone);
        const dateKey = format(matchLocalDate, 'yyyy-MM-dd');
        const leagueKey = `${match.competition.name}_${match.competition.id}`;
        if (!acc[dateKey]) {
          acc[dateKey] = {};
        }
        if (!acc[dateKey][leagueKey]) {
          acc[dateKey][leagueKey] = [];
        }
        acc[dateKey][leagueKey].push({
          ...match,
          localDate: matchLocalDate
        });
        return acc;
      }, {});

      setMatches(prevMatches => ({
        ...prevMatches,
        [formattedDate]: groupedMatches[formattedDate] || {}
      }));
    } catch (error) {
      console.error('Error fetching matches:', error);
      setMatches(prevMatches => ({
        ...prevMatches,
        [format(date, 'yyyy-MM-dd')]: {}
      }));
    } finally {
      setIsLoading(false);
    }
  }, [userTimeZone]);

  useEffect(() => {
    setUserTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  useEffect(() => {
    if (userTimeZone) {
      fetchMatches(currentDate);
      fetchAccuracyData();
    }
  }, [currentDate, user, fetchMatches, fetchAccuracyData, userTimeZone]);

const handleDateChange = useCallback((days) => {
  setCurrentDate(prevDate => {
    const newDate = days > 0 ? addDays(prevDate, days) : subDays(prevDate, Math.abs(days));
    const formattedNewDate = format(newDate, 'yyyy-MM-dd');
    console.log('New date:', formattedNewDate);
    
    // Check if we already have matches for this date
    if (!matches[formattedNewDate]) {
      fetchMatches(newDate);
    }
    
    return newDate;
  });
  setSelectedContinent('All');
  
  if (days < 0) {
    setActiveTab('finished');
  } else if (days > 0) {
    setActiveTab('scheduled');
  }
}, [matches, fetchMatches]);

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

  const currentDateKey = format(currentDate, 'yyyy-MM-dd');
  const matchesForCurrentDate = matches[currentDateKey] || {};

  const filteredMatches = Object.entries(matchesForCurrentDate).reduce((acc, [leagueKey, leagueMatches]) => {
    const [, leagueId] = leagueKey.split('_');
    const continent = getLeagueContinent(parseInt(leagueId));
    if (selectedContinent === 'All' || continent === selectedContinent) {
      acc[leagueKey] = leagueMatches;
    }
    return acc;
  }, {});

  const filterMatchesByStatus = (matches, statuses) => {
    return Object.entries(matches).reduce((acc, [leagueKey, leagueMatches]) => {
      const filteredMatches = leagueMatches.filter(match => statuses.includes(match.status));
      if (filteredMatches.length > 0) {
        acc[leagueKey] = filteredMatches;
      }
      return acc;
    }, {});
  };

  const liveMatches = filterMatchesByStatus(filteredMatches, ['IN_PLAY', 'HALFTIME', 'PAUSED', 'LIVE']);
  const finishedMatches = filterMatchesByStatus(filteredMatches, ['FINISHED']);
  const scheduledMatches = filterMatchesByStatus(filteredMatches, ['TIMED', 'SCHEDULED']);

  const sortedLeagues = (matches) => Object.entries(matches).sort((a, b) => {
    const [leagueKeyA, matchesA] = a;
    const [leagueKeyB, matchesB] = b;
    const [, aId] = leagueKeyA.split('_');
    const [, bId] = leagueKeyB.split('_');

    // First, sort by match status
    const statusOrder = ['IN_PLAY', 'PAUSED', 'HALFTIME', 'LIVE', 'TIMED', 'SCHEDULED', 'FINISHED'];
    const statusA = Math.min(...matchesA.map(match => statusOrder.indexOf(match.status)));
    const statusB = Math.min(...matchesB.map(match => statusOrder.indexOf(match.status)));

    if (statusA !== statusB) {
      return statusA - statusB;
    }

    // Then, sort by priority leagues
    const aIndex = priorityLeagues.indexOf(parseInt(aId));
    const bIndex = priorityLeagues.indexOf(parseInt(bId));
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    } else if (aIndex !== -1) {
      return -1;
    } else if (bIndex !== -1) {
      return 1;
    }

    // Finally, sort alphabetically by league name
    return leagueKeyA.localeCompare(leagueKeyB);
  });

  const formatMatchDate = (date) => {
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
        const currentDate = format(new Date(), 'yyyy-MM-dd');
        
        for (let date in updatedMatches) {
          for (let league in updatedMatches[date]) {
            updatedMatches[date][league] = updatedMatches[date][league].map(match => 
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

  const isPredictionCorrect = (prediction) => {
    if (match.status !== 'FINISHED') return false;
    const homeScore = match.score.fullTime.home;
    const awayScore = match.score.fullTime.away;
    const actualResult = homeScore > awayScore ? 'HOME_TEAM' : (awayScore > homeScore ? 'AWAY_TEAM' : 'DRAW');
    return prediction === actualResult;
  };

  return (
    <div className="mt-1 text-xs space-y-1">
      <div className="flex justify-between">
        <p className={`p-0.5 rounded ${match.status === 'FINISHED' ? (isPredictionCorrect(match.fanPrediction) ? 'bg-green-100' : 'bg-red-100') : ''}`}>
          Fans: {match.fanPrediction ? getTeamPrediction(match.fanPrediction) : 'No votes yet'}
        </p>
        {match.aiPrediction && (
          <p className={`p-0.5 rounded ${match.status === 'FINISHED' ? (isPredictionCorrect(match.aiPrediction) ? 'bg-green-100' : 'bg-red-100') : ''}`}>
            AI: {getTeamPrediction(match.aiPrediction)}
          </p>
        )}
      </div>
      {getUserVote()}
    </div>
  );
}, []);

const renderMatches = (matches) => {
  return sortedLeagues(matches).map(([leagueKey, competitionMatches]) => {
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
                        ? formatMatchDate(match.localDate)
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
  });
};

  const renderTabContent = () => {
    switch (activeTab) {
      case 'live':
        return Object.keys(liveMatches).length > 0 ? renderMatches(liveMatches) : (
          <div className="text-center py-4">
            <p className="text-gray-600 text-lg">No live matches at the moment.</p>
          </div>
        );
      case 'finished':
        return Object.keys(finishedMatches).length > 0 ? renderMatches(finishedMatches) : (
          <div className="text-center py-4">
            <p className="text-gray-600 text-lg">No finished matches for this day.</p>
          </div>
        );
      case 'scheduled':
        return Object.keys(scheduledMatches).length > 0 ? renderMatches(scheduledMatches) : (
          <div className="text-center py-4">
            <p className="text-gray-600 text-lg">No scheduled matches for this day.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-2">
      <AccuracyComparison fanAccuracy={accuracyData.fanAccuracy} aiAccuracy={accuracyData.aiAccuracy} />

      {isLoading ? (
        <div className="text-center py-4">
          <p className="text-gray-600 text-lg">Loading matches...</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col space-y-4 mb-4">
            {/* Match type tabs */}
            <div className="flex justify-center">
              <div className="inline-flex bg-gray-100 p-0.5 rounded-lg shadow-md">
                {['live', 'finished', 'scheduled'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                      px-3 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ease-in-out
                      flex items-center justify-center
                      ${activeTab === tab
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200'
                      }
                      ${tab === 'live' ? 'animate-pulse' : ''}
                    `}
                  >
                    {tab === 'live' && (
                      <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full mr-1 sm:mr-2 animate-pulse"></span>
                    )}
                    {tab === 'finished' && <BiAlarmOff className="mr-1 sm:mr-2" />}
                    {tab === 'scheduled' && <BiAlarm className="mr-1 sm:mr-2" />}
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Continent tabs */}
            <div className="flex justify-center">
              <div className="inline-flex bg-gray-100 p-0.5 rounded-lg shadow-md">
                {['All', 'Europe', 'Americas', 'Asia', 'Africa', 'International'].map((continent) => (
                  <button
                    key={continent}
                    onClick={() => setSelectedContinent(continent)}
                    className={`
                      px-2 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ease-in-out
                      ${selectedContinent === continent
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    {continent}
                  </button>
                ))}
              </div>
            </div>
          </div>

      <div className="flex justify-between items-center my-4 sm:px-4 md:px-12 lg:px-20">
        <div className="sm:flex-grow sm:flex sm:justify-end sm:pr-4">
          <CustomButton onClick={() => handleDateChange(-1)}>
            Previous Day
          </CustomButton>
        </div>
        <h2 className="text-sm sm:text-lg font-bold text-gray-800 sm:flex-shrink-0">
          {format(currentDate, 'dd MMM yyyy')}
        </h2>
        <div className="sm:flex-grow sm:flex sm:justify-start sm:pl-4">
          <CustomButton onClick={() => handleDateChange(1)}>
            Next Day
          </CustomButton>
        </div>
      </div>

          <div className="bg-white rounded-lg shadow-md p-2 sm:p-4">
            {renderTabContent()}
          </div>
        </>
      )}
    </div>
  );
};

export default Matches;
