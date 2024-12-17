import React from 'react';
import { format } from 'date-fns';
import StandingsButton from './StandingsButton';
import { shouldShowStandings } from '../constants/leagueConfig';

const MatchBox = ({ match, onVote, isLiveTab }) => {
  const getScoreDisplay = () => {
    if (match.status === 'SCHEDULED' || match.status === 'TIMED') {
      return <span className="text-xs sm:text-sm font-medium text-gray-600">{format(new Date(match.localDate), 'HH:mm')}</span>;
    }
  
    return (
      <div className="flex flex-col items-center">
        {(match.status === 'HALFTIME' || match.status === 'FINISHED') && (
          <span className="text-[10px] sm:text-xs text-gray-500 mb-0.5">
            {match.status === 'HALFTIME' ? 'HT' : 'FT'}
          </span>
        )}
        <div className="flex items-center justify-center space-x-1">
          <span className="text-sm sm:text-base font-bold text-indigo-600">{match.score.fullTime.home}</span>
          <span className="text-xs sm:text-sm text-gray-400">-</span>
          <span className="text-sm sm:text-base font-bold text-indigo-600">{match.score.fullTime.away}</span>
        </div>
      </div>
    );
  };
  
  const getMatchMinute = () => {
    if (!match.minute || match.status === 'TIMED') return '';
    switch (match.status) {
      case 'IN_PLAY': return `${match.minute}'`;
      case 'HALFTIME': return 'HT';
      case 'PAUSED': return `${match.minute}' (Paused)`;
      default: return match.status;
    }
  };

  const getTeamPrediction = (prediction) => {
    switch(prediction) {
      case 'HOME_TEAM':
        return (
          <span className="flex items-center">
            {match.homeTeam.name}
            <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="w-3 h-3 inline-block ml-0.5" />
          </span>
        );
      case 'AWAY_TEAM':
        return (
          <span className="flex items-center">
            {match.awayTeam.name}
            <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="w-3 h-3 inline-block ml-0.5" />
          </span>
        );
      case 'DRAW':
        return "Draw";
      default:
        return 'No prediction';
    }
  };

    const TeamColumn = ({ team, side, onVoteClick, prediction }) => (
    <div className="flex flex-col items-center w-20 sm:w-28">
      <div className="flex flex-col items-center">
        {(match.status === 'SCHEDULED' || match.status === 'TIMED') && !match.userVote ? (
          <button
            onClick={() => onVoteClick(match.id, side)}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 rounded-full flex items-center justify-center p-1.5 hover:bg-indigo-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <img 
              src={team.crest} 
              alt={team.name} 
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
            />
          </button>
        ) : (
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 rounded-full flex items-center justify-center p-1.5">
            <img 
              src={team.crest} 
              alt={team.name} 
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
            />
          </div>
        )}
        <span className="text-[10px] sm:text-xs font-medium mt-0.5 w-16 sm:w-20 truncate text-center">
          {team.name}
        </span>
      </div>
      {prediction && (
        <span className="text-[10px] sm:text-xs text-gray-600 mt-0.5">
          {prediction}
        </span>
      )}
    </div>
  );


  const isPredictionCorrect = (prediction) => {
    if (match.status !== 'FINISHED') return false;
    const homeScore = match.score.fullTime.home;
    const awayScore = match.score.fullTime.away;
    const actualResult = homeScore > awayScore ? 'HOME_TEAM' : (awayScore > homeScore ? 'AWAY_TEAM' : 'DRAW');
    return prediction === actualResult;
  };

  const TeamLogo = ({ team, side, onVoteClick }) => (
    <div className="flex flex-col items-center">
      {(match.status === 'SCHEDULED' || match.status === 'TIMED') && !match.userVote ? (
        <button
          onClick={() => onVoteClick(match.id, side)}
          className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 rounded-full flex items-center justify-center p-1.5 hover:bg-indigo-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <img 
            src={team.crest} 
            alt={team.name} 
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
          />
        </button>
      ) : (
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 rounded-full flex items-center justify-center p-1.5">
          <img 
            src={team.crest} 
            alt={team.name} 
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
          />
        </div>
      )}
      <span className="text-[10px] sm:text-xs font-medium mt-0.5 w-16 sm:w-20 truncate text-center">
        {team.name}
      </span>
    </div>
  );

  const getVotePercentages = () => {
    const totalVotes = match.voteCounts.home + match.voteCounts.draw + match.voteCounts.away;
    if (totalVotes === 0) return { home: 0, draw: 0, away: 0 };
    
    return {
      home: Math.round((match.voteCounts.home / totalVotes) * 100),
      draw: Math.round((match.voteCounts.draw / totalVotes) * 100),
      away: Math.round((match.voteCounts.away / totalVotes) * 100)
    };
  };

  return (
    <div className="relative bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-2 sm:p-3 max-w-2xl mx-auto">
      {shouldShowStandings(match.competition.id) && (
        <div className="absolute right-2 top-2 z-10">
          <StandingsButton 
            leagueId={match.competition.id}
            season={new Date(match.localDate).getFullYear()}
            homeTeam={match.homeTeam}
            awayTeam={match.awayTeam}
            leagueName={match.competition.name}
            leagueFlag={match.competition.country?.flag}
          />
        </div>
      )}
  
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {/* Left Section - Home Team */}
        <div className="flex flex-col items-center w-20 sm:w-28">
          {(match.status === 'SCHEDULED' || match.status === 'TIMED') && !match.userVote ? (
            <button
              onClick={() => onVote(match.id, 'home')}
              className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 rounded-full flex items-center justify-center p-1.5 hover:bg-indigo-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <img 
                src={match.homeTeam.crest} 
                alt={match.homeTeam.name} 
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
              />
            </button>
          ) : (
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 rounded-full flex items-center justify-center p-1.5">
              <img 
                src={match.homeTeam.crest} 
                alt={match.homeTeam.name} 
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
              />
            </div>
          )}
          <span className="text-[10px] sm:text-xs font-medium mt-0.5 w-16 sm:w-20 truncate text-center">
            {match.homeTeam.name}
          </span>
        </div>
  
        {/* Center Section - Score and Draw */}
        <div className="flex flex-col items-center w-16 sm:w-20">
          {/* Status display (minute, HT, or FT) */}
          {match.status === 'IN_PLAY' && (
            <span className="text-[10px] sm:text-xs text-green-600 font-medium animate-pulse mb-0.5">
              {match.minute}'
            </span>
          )}
          {match.status === 'HALFTIME' && (
            <span className="text-[10px] sm:text-xs text-indigo-600 font-medium mb-0.5">
              HT
            </span>
          )}
          {match.status === 'FINISHED' && (
            <span className="text-[10px] sm:text-xs text-gray-500 mb-0.5">
              FT
            </span>
          )}
  
          {/* Score or Time */}
          {match.status === 'SCHEDULED' || match.status === 'TIMED' ? (
            <span className="text-xs sm:text-sm font-medium text-gray-600">
              {format(new Date(match.localDate), 'HH:mm')}
            </span>
          ) : (
            <div className="flex items-center justify-center space-x-1">
              <span className="text-sm sm:text-base font-bold text-indigo-600">{match.score.fullTime.home}</span>
              <span className="text-xs sm:text-sm text-gray-400">-</span>
              <span className="text-sm sm:text-base font-bold text-indigo-600">{match.score.fullTime.away}</span>
            </div>
          )}
  
          {/* Draw button */}
          {(match.status === 'SCHEDULED' || match.status === 'TIMED') && !match.userVote && (
            <button
              onClick={() => onVote(match.id, 'draw')}
              className="mt-1 px-2 py-0.5 text-[10px] sm:text-xs bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors duration-200"
            >
              Draw
            </button>
          )}
        </div>
  
        {/* Right Section - Away Team */}
        <div className="flex flex-col items-center w-20 sm:w-28">
          {(match.status === 'SCHEDULED' || match.status === 'TIMED') && !match.userVote ? (
            <button
              onClick={() => onVote(match.id, 'away')}
              className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 rounded-full flex items-center justify-center p-1.5 hover:bg-indigo-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <img 
                src={match.awayTeam.crest} 
                alt={match.awayTeam.name} 
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
              />
            </button>
          ) : (
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 rounded-full flex items-center justify-center p-1.5">
              <img 
                src={match.awayTeam.crest} 
                alt={match.awayTeam.name} 
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
              />
            </div>
          )}
          <span className="text-[10px] sm:text-xs font-medium mt-0.5 w-16 sm:w-20 truncate text-center">
            {match.awayTeam.name}
          </span>
        </div>
      </div>
  
      {/* Bottom Section - Predictions and Votes */}
      <div className="mt-1.5 sm:mt-2 space-y-1 flex flex-col items-center">
        {/* Predictions */}
        <div className="w-full flex justify-between text-[10px] sm:text-xs px-2">
          <p className={`rounded px-1 max-w-[45%] ${match.status === 'FINISHED' ? (isPredictionCorrect(match.fanPrediction) ? 'bg-green-100' : 'bg-red-100') : ''}`}>
            Fans: {match.fanPrediction ? getTeamPrediction(match.fanPrediction) : 'No votes yet'}
          </p>
          {match.aiPrediction && (
            <p className={`rounded px-1 max-w-[45%] ${match.status === 'FINISHED' ? (isPredictionCorrect(match.aiPrediction) ? 'bg-green-100' : 'bg-red-100') : ''}`}>
              AI: {getTeamPrediction(match.aiPrediction)}
            </p>
          )}
        </div>
  
        {/* Vote Split & User Vote */}
        {match.userVote && (
          <>
            <div className="w-2/3 mx-auto">
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden flex">
                <div 
                  className="bg-blue-500 transition-all duration-500"
                  style={{ width: `${getVotePercentages().home}%` }}
                />
                <div 
                  className="bg-yellow-500 transition-all duration-500"
                  style={{ width: `${getVotePercentages().draw}%` }}
                />
                <div 
                  className="bg-red-500 transition-all duration-500"
                  style={{ width: `${getVotePercentages().away}%` }}
                />
              </div>
            </div>
            <div className="bg-yellow-50 text-[10px] sm:text-xs p-1 rounded text-center w-2/3">
              Your vote: {
                match.userVote === 'home' ? match.homeTeam.name :
                match.userVote === 'away' ? match.awayTeam.name :
                'Draw'
              }
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MatchBox;
