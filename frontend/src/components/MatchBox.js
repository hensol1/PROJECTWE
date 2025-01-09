import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import MatchEvents from './MatchEvents';
import StandingsButton from './StandingsButton';
import { shouldShowStandings } from '../constants/leagueConfig';
import { FaPeopleGroup } from "react-icons/fa6";
import { FaBrain } from "react-icons/fa";

// Website brand colors
const websiteColors = {
  primary: '#2ECC40',
  primaryDark: '#25a032',
  background: '#171923',
  backgroundGradient: '#2ECC43', // Adding the new gradient color
  backgroundLight: '#1e2231',
  text: '#FFFFFF'
};

const MatchBox = ({ match, onVote }) => {
  const [showEvents, setShowEvents] = useState(false);
  const [timeUntilMatch, setTimeUntilMatch] = useState('');

  const isPredictionCorrect = (prediction) => {
    if (match.status !== 'FINISHED') return false;
    
    const homeScore = match.score.fullTime.home;
    const awayScore = match.score.fullTime.away;
    const actualResult = homeScore > awayScore ? 'HOME_TEAM' : 
                        awayScore > homeScore ? 'AWAY_TEAM' : 
                        'DRAW';
                        
    return prediction === actualResult;
  };

  const getTeamPrediction = (prediction) => {
    if (prediction === 'HOME_TEAM') {
      // Use full name if it's relatively short (less than 15 characters is typically safe for one line)
      const fullName = match.homeTeam.name;
      return fullName.length < 15 ? fullName : fullName.split(' ')[0];
    } else if (prediction === 'AWAY_TEAM') {
      const fullName = match.awayTeam.name;
      return fullName.length < 15 ? fullName : fullName.split(' ')[0];
    }
    return prediction === 'DRAW' ? "Draw" : 'No votes yet';
  };
    
  useEffect(() => {
    if (match.status === 'SCHEDULED' || match.status === 'TIMED') {
      const updateCountdown = () => {
        const now = new Date();
        const matchTime = new Date(match.localDate);
        const diff = matchTime - now;

        if (diff <= 0) {
          setTimeUntilMatch('Starting...');
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (hours > 24) {
          const days = Math.floor(hours / 24);
          setTimeUntilMatch(`${days}d ${hours % 24}h ${minutes}m ${seconds}s`);
        } else if (hours > 0) {
          setTimeUntilMatch(`${hours}h ${minutes}m ${seconds}s`);
        } else if (minutes > 0) {
          setTimeUntilMatch(`${minutes}m ${seconds}s`);
        } else {
          setTimeUntilMatch(`${seconds}s`);
        }
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [match.localDate, match.status]);

  return (
    <div className="w-full max-w-md mx-auto overflow-hidden rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl">
{/* Dark Background Section */}
<div 
  className="relative p-4"
  style={{
    background: `radial-gradient(circle at top, ${websiteColors.background} 40%, transparent 90%), linear-gradient(200deg, ${websiteColors.background} 40%, ${websiteColors.backgroundGradient} 90%)`,
    color: websiteColors.text
  }}
>
        {/* Match Header - Time Until Match */}
        {(match.status === 'SCHEDULED' || match.status === 'TIMED') && (
          <div className="flex justify-center mb-4">
            <div className="text-center">
              {!match.userVote && (
                <span className="text-sm font-medium">
                  {format(new Date(match.localDate), 'HH:mm')}
                </span>
              )}
              <span className="text-xs opacity-75 block">• {timeUntilMatch}</span>
            </div>
          </div>
        )}
  
        {/* Standings Button */}
        {shouldShowStandings(match.competition.id) && (
          <div className="absolute top-4 right-4">
            <button 
              style={{ color: websiteColors.primary }}
              className="hover:opacity-80 transition-opacity"
            >
              <StandingsButton 
                leagueId={match.competition.id}
                season={new Date(match.localDate).getFullYear()}
                homeTeam={match.homeTeam}
                awayTeam={match.awayTeam}
                leagueName={match.competition.name}
                leagueFlag={match.competition.country?.flag}
              />
            </button>
          </div>
        )}
  
        {/* Teams and Score Section */}
        <div className="flex justify-center items-center gap-12">
          {/* Home Team */}
          <div className="relative group">
            {(match.status === 'SCHEDULED' || match.status === 'TIMED') && !match.userVote ? (
              <button
                onClick={() => onVote(match.id, 'home')}
                className="relative bg-white bg-opacity-10 rounded-full p-2"
              >
                <div className="absolute inset-0 rounded-full border-2 opacity-0 group-hover:opacity-100 transition-opacity" 
                  style={{ borderColor: websiteColors.primary }} 
                />
                <img 
                  src={match.homeTeam.crest} 
                  alt={match.homeTeam.name}
                  className="w-16 h-16 object-contain transition-transform group-hover:scale-110"
                />
              </button>
            ) : (
              <div className="bg-white bg-opacity-10 rounded-full p-2">
                <img 
                  src={match.homeTeam.crest} 
                  alt={match.homeTeam.name}
                  className="w-16 h-16 object-contain"
                />
              </div>
            )}
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-sm bg-black bg-opacity-75 text-white px-2 py-1 rounded">
              {match.homeTeam.name}
            </div>
          </div>
  
{/* Score and Status */}
<div className="flex flex-col items-center min-w-[60px]">
  {(match.status === 'IN_PLAY' || match.status === 'PAUSED' || match.status === 'HALFTIME') && (
    <div className="flex flex-col items-center">
      <span className="text-sm font-medium animate-pulse" style={{ color: '#2ECC43' }}>{match.minute}'</span>
      <div className="flex items-center space-x-2">
        <span className="text-xl font-bold">{match.score.fullTime.home}</span>
        <span className="text-lg">:</span>
        <span className="text-xl font-bold">{match.score.fullTime.away}</span>
      </div>
      <button
        onClick={() => setShowEvents(true)}
        className="flex items-center gap-1 text-xs bg-gray-50 bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-1.5 rounded-full transition-colors mt-2"
      >
        <Clock className="w-3 h-3" />
        Events
      </button>
    </div>
  )}
  
            {match.status === 'FINISHED' && (
              <div className="flex flex-col items-center">
                <span className="text-lg font-medium">FT</span>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl font-bold">{match.score.fullTime.home}</span>
                  <span className="text-lg">:</span>
                  <span className="text-xl font-bold">{match.score.fullTime.away}</span>
                </div>
                <button
                  onClick={() => setShowEvents(true)}
                  className="flex items-center gap-1 text-xs bg-gray-50 bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-1.5 rounded-full transition-colors mt-2"
                >
                  <Clock className="w-3 h-3" />
                  Events
                </button>
              </div>
            )}
  
            {(match.status === 'SCHEDULED' || match.status === 'TIMED') && (
              match.userVote ? (
                <span className="text-sm font-medium">
                  {format(new Date(match.localDate), 'HH:mm')}
                </span>
              ) : (
                <button
                  onClick={() => onVote(match.id, 'draw')}
                  className="px-4 py-1 text-sm bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors"
                  style={{
                    backgroundColor: websiteColors.primary,
                    color: websiteColors.text
                  }}
                >
                  Draw
                </button>
              )
            )}
          </div>
  
          {/* Away Team */}
          <div className="relative group">
            {(match.status === 'SCHEDULED' || match.status === 'TIMED') && !match.userVote ? (
              <button
                onClick={() => onVote(match.id, 'away')}
                className="relative bg-white bg-opacity-10 rounded-full p-2"
              >
                <div className="absolute inset-0 rounded-full border-2 opacity-0 group-hover:opacity-100 transition-opacity" 
                  style={{ borderColor: websiteColors.primary }} 
                />
                <img 
                  src={match.awayTeam.crest} 
                  alt={match.awayTeam.name}
                  className="w-16 h-16 object-contain transition-transform group-hover:scale-110"
                />
              </button>
            ) : (
              <div className="bg-white bg-opacity-10 rounded-full p-2">
                <img 
                  src={match.awayTeam.crest} 
                  alt={match.awayTeam.name}
                  className="w-16 h-16 object-contain"
                />
              </div>
            )}
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-sm bg-black bg-opacity-75 text-white px-2 py-1 rounded">
              {match.awayTeam.name}
            </div>
          </div>
        </div>
      </div>
  
      {/* White Background Section */}
      <div className="bg-white p-4">
{/* Predictions */}
<div className="flex mb-3">
{/* Fans Prediction */}
<div 
  style={{
    backgroundColor: match.status === 'FINISHED' 
      ? (isPredictionCorrect(match.fanPrediction) ? '#2ECC40' : '#ff4136')
      : 'white',
    width: '50%'
  }}
  className="flex items-center px-2 sm:px-4 py-2"
>
  <div className="flex items-center gap-1 sm:gap-2 w-full">
    <span className="flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap" 
      style={{ color: match.status === 'FINISHED' ? 'white' : 'gray' }}>
      <FaPeopleGroup 
        className="w-4 h-4 sm:w-5 sm:h-5" 
        style={{ color: '#3B82F6' }} // This is the equivalent of bg-blue-500
      />
      Fans:
    </span>
      {match.fanPrediction && match.fanPrediction !== 'DRAW' && (
        <img 
          src={match.fanPrediction === 'HOME_TEAM' ? match.homeTeam.crest : match.awayTeam.crest} 
          alt="" 
          className="w-4 h-4 sm:w-6 sm:h-6" 
        />
      )}
      <span className="text-xs sm:text-sm truncate" 
        style={{ color: match.status === 'FINISHED' ? 'white' : 'gray' }}>
        {getTeamPrediction(match.fanPrediction)}
      </span>
    </div>
  </div>

  {/* Experts {/* Experts Prediction */}
<div 
  style={{
    backgroundColor: match.status === 'FINISHED'
      ? (isPredictionCorrect(match.aiPrediction) ? '#2ECC40' : '#ff4136')
      : 'white',
    width: '50%'
  }}
  className="flex items-center px-2 sm:px-4 py-2"
>
  <div className="flex items-center gap-1 sm:gap-2 w-full">
    <span className="flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap" 
      style={{ color: match.status === 'FINISHED' ? 'white' : 'gray' }}>
      <FaBrain 
        className="w-4 h-4 sm:w-5 sm:h-5" 
        style={{ color: '#22C55E' }} // This is the equivalent of bg-green-500
      />
      Experts:
    </span>
      {match.aiPrediction && match.aiPrediction !== 'DRAW' && (
        <img 
          src={match.aiPrediction === 'HOME_TEAM' ? match.homeTeam.crest : match.awayTeam.crest} 
          alt="" 
          className="w-4 h-4 sm:w-6 sm:h-6" 
        />
      )}
      <span className="text-xs sm:text-sm truncate" 
        style={{ color: match.status === 'FINISHED' ? 'white' : 'gray' }}>
        {getTeamPrediction(match.aiPrediction)}
      </span>
    </div>
  </div>
</div>

  
        {/* Vote Percentages */}
        {match.userVote && (
          <div className="mb-3">
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
              <div 
                className="transition-all duration-500"
                style={{ 
                  width: `${(match.voteCounts.home / (match.voteCounts.home + match.voteCounts.draw + match.voteCounts.away) * 100) || 0}%`,
                  backgroundColor: websiteColors.primary 
                }}
              />
              <div 
                className="transition-all duration-500"
                style={{ 
                  width: `${(match.voteCounts.draw / (match.voteCounts.home + match.voteCounts.draw + match.voteCounts.away) * 100) || 0}%`,
                  backgroundColor: websiteColors.primaryDark
                }}
              />
              <div 
                className="transition-all duration-500"
                style={{ 
                  width: `${(match.voteCounts.away / (match.voteCounts.home + match.voteCounts.draw + match.voteCounts.away) * 100) || 0}%`,
                  backgroundColor: `${websiteColors.primary}99`
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{Math.round((match.voteCounts.home / (match.voteCounts.home + match.voteCounts.draw + match.voteCounts.away) * 100) || 0)}%</span>
              <span>{Math.round((match.voteCounts.draw / (match.voteCounts.home + match.voteCounts.draw + match.voteCounts.away) * 100) || 0)}%</span>
              <span>{Math.round((match.voteCounts.away / (match.voteCounts.home + match.voteCounts.draw + match.voteCounts.away) * 100) || 0)}%</span>
            </div>
          </div>
        )}
  
        {/* User's Vote Display */}
        {match.userVote && (
          <div className="text-center text-sm">
            <span className="px-3 py-1 rounded-full" style={{ 
              backgroundColor: match.status === 'FINISHED' 
                ? (isPredictionCorrect(match.userVote === 'home' ? 'HOME_TEAM' : match.userVote === 'away' ? 'AWAY_TEAM' : 'DRAW') 
                  ? '#2ECC40' 
                  : '#ff4136')
                : websiteColors.primary,
              color: websiteColors.text 
            }}>
              Your vote: {getTeamPrediction(
                match.userVote === 'home' ? 'HOME_TEAM' :
                match.userVote === 'away' ? 'AWAY_TEAM' :
                'DRAW'
              )}
            </span>
          </div>
        )}
      </div>
  
      {/* Match Events Modal */}
      <MatchEvents
        matchId={match.id}
        isOpen={showEvents}
        onClose={() => setShowEvents(false)}
        homeTeam={match.homeTeam}
        awayTeam={match.awayTeam}
        match={match}
        competition={match.competition}
      />
    </div>
  );
};

export default MatchBox;