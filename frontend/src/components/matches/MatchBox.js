import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import MatchEvents from '../MatchEvents'; 
import StandingsButton from '../StandingsButton'; 
import { shouldShowStandings } from '../../constants/leagueConfig'; 
import HeaderLogo from '../HeaderLogo';  
import { LogoService } from '../../services/logoService';

const websiteColors = {
  primary: '#2ECC40',
  primaryDark: '#25a032',
  background: '#171923',
  backgroundGradient: '#2ECC43',
  backgroundLight: '#1e2231',
  text: '#FFFFFF'
};

const TeamLogo = ({ team }) => {
  const [imgSrc, setImgSrc] = useState('');
  
  useEffect(() => {
    if (!team.crest) return;
    
    // Extract team ID from the API URL
    const teamId = LogoService.extractIdFromUrl(team.crest);
    if (teamId) {
      const { localPath, apiPath } = LogoService.getTeamLogoPath(teamId);
      
      // Try to load local image first
      fetch(localPath)
        .then(response => {
          if (response.ok) {
            setImgSrc(localPath);
          } else {
            // If local image doesn't exist, use API URL
            setImgSrc(apiPath);
          }
        })
        .catch(() => {
          setImgSrc(apiPath);
        });
    } else {
      setImgSrc(team.crest);
    }
  }, [team.crest]);

  return (
    <div className="relative">
      <img
        src={imgSrc || '/fallback-team-logo.png'}
        alt={team.name}
        className="w-16 h-16 object-contain"
        onError={(e) => {
          e.target.src = '/fallback-team-logo.png';
        }}
      />
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-sm bg-black bg-opacity-75 text-white px-2 py-1 rounded">
        {team.name}
      </div>
    </div>
  );
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
      <div 
        className="relative p-4"
        style={{
          background: `radial-gradient(circle at top, ${websiteColors.background} 40%, transparent 90%), linear-gradient(200deg, ${websiteColors.background} 40%, ${websiteColors.backgroundGradient} 90%)`,
          color: websiteColors.text
        }}
      >
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
  
        <div className="flex justify-center items-center gap-12">
          <TeamLogo 
            team={match.homeTeam}
            onClick={() => (match.status === 'SCHEDULED' || match.status === 'TIMED') && !match.userVote && onVote(match.id, 'home')}
            isInteractive={(match.status === 'SCHEDULED' || match.status === 'TIMED') && !match.userVote}
          />
  
          <div className="flex flex-col items-center min-w-[60px]">
            {(match.status === 'IN_PLAY' || match.status === 'PAUSED' || match.status === 'HALFTIME') && (
              <div className="flex flex-col items-center">
                <span className="text-sm font-medium animate-pulse" style={{ color: '#2ECC43' }}>
                  {match.status === 'HALFTIME' ? 'HT' : `${match.minute}'`}
                </span>
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
              <div className="flex flex-col items-center">
                <span className="text-sm font-medium">
                  {format(new Date(match.localDate), 'HH:mm')}
                </span>
                <span className="text-xs opacity-75 mt-1">
                  {timeUntilMatch}
                </span>
              </div>
            )}
          </div>
  
          <TeamLogo 
            team={match.awayTeam}
            onClick={() => (match.status === 'SCHEDULED' || match.status === 'TIMED') && !match.userVote && onVote(match.id, 'away')}
            isInteractive={(match.status === 'SCHEDULED' || match.status === 'TIMED') && !match.userVote}
          />
        </div>
      </div>
  
      <div className="bg-white p-4">
        <div className="flex justify-center mb-3">
          <div 
            style={{
              backgroundColor: match.status === 'FINISHED' 
                ? (isPredictionCorrect(match.aiPrediction) ? '#2ECC40' : '#ff4136')
                : 'white',
              width: '100%'
            }}
            className={`
              flex items-center px-2 sm:px-4 py-2 rounded-md
              ${match.status === 'FINISHED' 
                ? 'border border-transparent'
                : 'border border-gray-200'
              }
              shadow-sm
            `}
          >
            <div className="flex items-center gap-1 sm:gap-2 w-full">
              <span className="flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap" 
                style={{ color: match.status === 'FINISHED' ? 'white' : 'gray' }}>
                <HeaderLogo className="w-4 h-4 sm:w-5 sm:h-5" />
                Experts:
              </span>
              {match.aiPrediction && match.aiPrediction !== 'DRAW' && (
  <img 
    src={match.aiPrediction === 'HOME_TEAM' ? match.homeTeam.crest : match.awayTeam.crest}
    alt=""
    className="w-4 h-4 sm:w-6 sm:h-6 rounded-full object-contain"
  />
)}
              <span className="text-xs sm:text-sm truncate" 
                style={{ color: match.status === 'FINISHED' ? 'white' : 'gray' }}>
                {getTeamPrediction(match.aiPrediction)}
              </span>
            </div>
          </div>
        </div>
      </div>
  
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