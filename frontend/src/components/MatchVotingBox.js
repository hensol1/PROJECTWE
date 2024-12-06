import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, X } from 'lucide-react';

const MatchVotingBox = ({ matches, onVote, onSkip, user, onClose }) => {
  const [remainingMatchesByLeague, setRemainingMatchesByLeague] = useState({});
  const [currentLeagueId, setCurrentLeagueId] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTeam, setActiveTeam] = useState(null); 


  // Check if device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Group matches by league
  useEffect(() => {
    const groupMatches = () => {
      const votedMatches = new Set(JSON.parse(localStorage.getItem('votedMatches') || '[]'));
      
      // Group matches by league
      const grouped = matches.reduce((acc, match) => {
        if (user ? !match.userVote : !votedMatches.has(match.id)) {
          const leagueId = match.competition.id;
          if (!acc[leagueId]) {
            acc[leagueId] = [];
          }
          acc[leagueId].push(match);
        }
        return acc;
      }, {});

      setRemainingMatchesByLeague(grouped);
      
      // Set initial league if not set
      if (!currentLeagueId && Object.keys(grouped).length > 0) {
        setCurrentLeagueId(Object.keys(grouped)[0]);
      }
    };

    groupMatches();
  }, [matches, user, currentLeagueId]);

  const currentMatches = currentLeagueId ? remainingMatchesByLeague[currentLeagueId] || [] : [];
  const currentMatch = currentMatches[0];

  if (!currentMatch) {
    return null;
  }

  const handleSkipLeague = () => {
    const leagues = Object.keys(remainingMatchesByLeague);
    const currentIndex = leagues.indexOf(currentLeagueId);
    const nextIndex = (currentIndex + 1) % leagues.length;
    setCurrentLeagueId(leagues[nextIndex]);
  };

  
  const handleVote = async (vote) => {
    if (isVoting) return;
    
    try {
      setIsVoting(true);
      setActiveTeam(vote); // Add visual feedback
      await onVote(currentMatch.id, vote);
      
      setRemainingMatchesByLeague(prev => {
        const newLeagueMatches = prev[currentLeagueId].filter(match => match.id !== currentMatch.id);
        
        if (!user) {
          const votedMatches = JSON.parse(localStorage.getItem('votedMatches') || '[]');
          votedMatches.push(currentMatch.id);
          localStorage.setItem('votedMatches', JSON.stringify(votedMatches));
        }

        if (newLeagueMatches.length === 0) {
          const { [currentLeagueId]: _, ...rest } = prev;
          if (Object.keys(rest).length > 0) {
            handleSkipLeague();
          }
          return rest;
        }

        return {
          ...prev,
          [currentLeagueId]: newLeagueMatches
        };
      });
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setIsVoting(false);
      setActiveTeam(null); // Reset visual feedback
    }
  };

  const handleSkipMatch = () => {
    setRemainingMatchesByLeague(prev => {
      const currentLeagueMatches = prev[currentLeagueId];
      const [skipped, ...remaining] = currentLeagueMatches;
      
      if (remaining.length === 0) {
        const { [currentLeagueId]: _, ...rest } = prev;
        if (Object.keys(rest).length > 0) {
          handleSkipLeague();
        }
        return rest;
      }

      return {
        ...prev,
        [currentLeagueId]: remaining
      };
    });
    onSkip(currentMatch.id);
  };
  
  // Render vote percentages bar
  const renderVoteSplit = () => {
    const total = currentMatch.voteCounts.home + currentMatch.voteCounts.draw + currentMatch.voteCounts.away;
    if (total === 0) return null;

    const getPercentage = (count) => Math.round((count / total) * 100);
    const homePercent = getPercentage(currentMatch.voteCounts.home);
    const drawPercent = getPercentage(currentMatch.voteCounts.draw);
    const awayPercent = getPercentage(currentMatch.voteCounts.away);

    return (
      <div className="w-4/5 mx-auto mb-4">
        <div className="flex justify-between text-xs text-white mb-1">
          <span>{homePercent}%</span>
          <span>{drawPercent}%</span>
          <span>{awayPercent}%</span>
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden flex">
          <div 
            className="bg-blue-500 transition-all duration-500"
            style={{ width: `${homePercent}%` }}
          />
          <div 
            className="bg-yellow-500 transition-all duration-500"
            style={{ width: `${drawPercent}%` }}
          />
          <div 
            className="bg-red-500 transition-all duration-500"
            style={{ width: `${awayPercent}%` }}
          />
        </div>
      </div>
    );
  };

  const renderAIPrediction = () => {
    if (!currentMatch.aiPrediction) return null;

    const getPredictionText = () => {
      switch(currentMatch.aiPrediction) {
        case 'HOME_TEAM':
          return (
            <span className="flex items-center justify-center gap-2">
              {currentMatch.homeTeam.name}
              <img src={currentMatch.homeTeam.crest} alt="" className="w-4 h-4" />
            </span>
          );
        case 'AWAY_TEAM':
          return (
            <span className="flex items-center justify-center gap-2">
              {currentMatch.awayTeam.name}
              <img src={currentMatch.awayTeam.crest} alt="" className="w-4 h-4" />
            </span>
          );
        case 'DRAW':
          return 'Draw';
        default:
          return null;
      }
    };

    return (
      <div className="flex flex-col items-center justify-center mb-4 text-center">
        <div className="text-gray-400 mb-1">AI Predicts:</div>
        <div className="text-white font-medium">{getPredictionText()}</div>
      </div>
    );
  };


  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg z-50">
        <div className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl shadow-xl overflow-hidden relative">
          {/* League Header with Exit Button */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 py-2 px-3 relative">
            {/* Exit Button */}
            <button 
              onClick={onClose}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-blue-700 transition-colors duration-200"
            >
              <X className="w-5 h-5 text-white" />
            </button>
  
            <div className="flex justify-center items-center space-x-2">
              <img 
                src={currentMatch.competition.emblem} 
                alt={currentMatch.competition.name} 
                className="w-6 h-6"
              />
              <h2 className="text-base font-bold text-white text-center">
                {currentMatch.competition.name}
              </h2>
            </div>
          </div>
  
          <div className="p-4">
            {/* AI Prediction */}
            {renderAIPrediction()}
            
            {/* Teams */}
            <div className="flex items-center justify-between space-x-3">
              {/* Home Team */}
              <button 
                onClick={() => handleVote('home')}
                className="flex-1 group relative"
              >
                <div className={`
                  bg-gray-800 p-3 rounded-xl transition-all duration-300 transform
                  ${activeTeam === 'home' ? 'bg-blue-900 scale-95' : 'hover:bg-blue-900 hover:scale-105'}
                  active:scale-95 active:bg-blue-900
                `}>
                  <img 
                    src={currentMatch.homeTeam.crest} 
                    alt={currentMatch.homeTeam.name}
                    className="w-14 h-14 mx-auto mb-2"
                  />
                  <p className="text-white text-center font-bold text-sm">
                    {currentMatch.homeTeam.name}
                  </p>
                </div>
              </button>
  
              {/* Draw Button */}
              <button 
                onClick={() => handleVote('draw')}
                className={`
                  px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 
                  text-white font-bold rounded-lg transform transition-all duration-300 
                  ${activeTeam === 'draw' ? 'scale-95 opacity-90' : 'hover:scale-110'}
                  hover:shadow-lg active:scale-95 text-sm
                `}
              >
                DRAW
              </button>
  
              {/* Away Team */}
              <button 
                onClick={() => handleVote('away')}
                className="flex-1 group relative"
              >
                <div className={`
                  bg-gray-800 p-3 rounded-xl transition-all duration-300 transform
                  ${activeTeam === 'away' ? 'bg-red-900 scale-95' : 'hover:bg-red-900 hover:scale-105'}
                  active:scale-95 active:bg-red-900
                `}>
                  <img 
                    src={currentMatch.awayTeam.crest} 
                    alt={currentMatch.awayTeam.name}
                    className="w-14 h-14 mx-auto mb-2"
                  />
                  <p className="text-white text-center font-bold text-sm">
                    {currentMatch.awayTeam.name}
                  </p>
                </div>
              </button>
            </div>
  
            {/* Vote Split */}
            {renderVoteSplit()}
  
            {/* Navigation Buttons */}
            <div className="flex justify-center items-center gap-4 mt-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkipMatch();
                }}
                className="text-gray-400 hover:text-white text-xs flex items-center gap-1 transition-colors duration-300 group"
              >
                <span>Skip Match</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkipLeague();
                }}
                className="text-gray-400 hover:text-white text-xs flex items-center gap-1 transition-colors duration-300 group"
              >
                <span>Skip League</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
  
            {/* Matches Counter */}
            <div className="text-center text-xs text-gray-500 mt-2">
              {currentMatches.length} matches remaining in this league
            </div>
          </div>
        </div>
      </div>
    </>
  );
  };

export default MatchVotingBox;