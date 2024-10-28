import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight } from 'lucide-react';

const MatchVotingBox = ({ matches, onVote, onSkip, user }) => {
  const [remainingMatchesByLeague, setRemainingMatchesByLeague] = useState({});
  const [currentLeagueId, setCurrentLeagueId] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [dragX, setDragX] = useState(0);
  const cardRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const startTimeRef = useRef(0);
  const [startY, setStartY] = useState(0);
  const [isVerticalScroll, setIsVerticalScroll] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

const handleDragStart = (event) => {
  if (!isMobile) return;
  
  const clientX = event.type.startsWith('touch') ? event.touches[0].clientX : event.clientX;
  const clientY = event.type.startsWith('touch') ? event.touches[0].clientY : event.clientY;
  
  setIsDragging(true);
  setDragX(0);
  setStartY(clientY);
  setIsVerticalScroll(false);
  startTimeRef.current = Date.now();
};

const handleDragMove = (event) => {
  if (!isDragging || !isMobile) return;

  const clientX = event.type.startsWith('touch') ? event.touches[0].clientX : event.clientX;
  const clientY = event.type.startsWith('touch') ? event.touches[0].clientY : event.clientY;
  
  const diffY = clientY - startY;
  const diffX = clientX - (cardRef.current?.offsetLeft + (cardRef.current?.offsetWidth / 2) || 0);

  if (!isVerticalScroll && Math.abs(diffY) > Math.abs(diffX) * 2) {
    setIsVerticalScroll(true);
    return;
  }

  if (!isVerticalScroll) {
    event.preventDefault();
    setDragX(diffX);
  }
};


const handleDragEnd = async () => {
  if (!isDragging || !isMobile) return;

  setIsDragging(false);

  try {
    if (dragX < -100) {
      await handleVote('home');
    } else if (dragX > 100) {
      await handleVote('away');
    }
    // Remove the tap-for-draw condition
  } finally {
    setDragX(0);
  }
};
  
const handleVote = async (vote) => {
  // Add this check at the start of the function
  if (isVoting) return;  // Prevent double voting
  
  try {
    setIsVoting(true);
    await onVote(currentMatch.id, vote);
      
      // Remove voted match from current league
      setRemainingMatchesByLeague(prev => {
        const newLeagueMatches = prev[currentLeagueId].filter(match => match.id !== currentMatch.id);
        
        if (!user) {
          const votedMatches = JSON.parse(localStorage.getItem('votedMatches') || '[]');
          votedMatches.push(currentMatch.id);
          localStorage.setItem('votedMatches', JSON.stringify(votedMatches));
        }

        // If league is empty, remove it
        if (newLeagueMatches.length === 0) {
          const { [currentLeagueId]: _, ...rest } = prev;
          // Move to next league if available
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

const dragProps = isMobile ? {
    onTouchStart: handleDragStart,
    onTouchMove: handleDragMove,
    onTouchEnd: handleDragEnd,
    onMouseDown: handleDragStart,
    onMouseMove: handleDragMove,
    onMouseUp: handleDragEnd,
    onMouseLeave: handleDragEnd,
} : {};


  return (
   <motion.div
  ref={cardRef}
  className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl shadow-xl overflow-hidden touch-none select-none"
  style={{
    x: dragX,
    rotate: dragX * 0.02,
    cursor: isMobile ? (isDragging ? 'grabbing' : 'grab') : 'default',
    touchAction: 'none'  // Add this line
  }}
  {...dragProps}
>

      {/* Vote Direction Indicators (mobile only) */}
      {isMobile && (
        <>
          <div 
            className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none"
            style={{ opacity: dragX < -20 ? Math.abs(dragX) / 100 : 0 }}
          >
            <span className="text-blue-500 font-bold">← Home Win</span>
          </div>
          <div 
            className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none"
            style={{ opacity: dragX > 20 ? dragX / 100 : 0 }}
          >
            <span className="text-red-500 font-bold">Away Win →</span>
          </div>
        </>
      )}

      {/* League Header */}
<div className="bg-gradient-to-r from-blue-600 to-blue-800 py-2 px-3">
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
{/* Voting Instructions */}
<div className="text-center text-gray-400 text-sm mb-4">
  {isMobile ? 
    "Swipe left for home, right for away" :
    "Click team for prediction"
  }
</div>


  {/* AI Prediction */}
  {renderAIPrediction()}
  
  {/* Teams */}
  <div className="flex items-center justify-between space-x-3">
{/* Home Team */}
<button 
  onClick={() => handleVote('home')}  
  className="flex-1 group"
>
      <div className={`bg-gray-800 p-3 rounded-xl transition-all duration-300 transform 
        ${dragX < -20 ? 'scale-105 bg-blue-900' : ''}
        ${!isMobile ? 'hover:scale-105 hover:bg-blue-900' : ''}
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
{isMobile ? (
  <button 
    onClick={() => handleVote('draw')}
    className="flex items-center justify-center px-4"
  >
    <div className="bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 px-4 py-2 rounded-lg">
      <span className="text-white text-sm font-bold">
        DRAW
      </span>
    </div>
  </button>
) : (
  <button 
    onClick={() => handleVote('draw')}
    className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-bold rounded-lg transform transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 text-sm"
  >
    DRAW
  </button>
)}

{/* Away Team */}
<button 
  onClick={() => handleVote('away')}  
  className="flex-1 group"
>
      <div className={`bg-gray-800 p-3 rounded-xl transition-all duration-300 transform 
        ${dragX > 20 ? 'scale-105 bg-red-900' : ''}
        ${!isMobile ? 'hover:scale-105 hover:bg-red-900' : ''}
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
      e.stopPropagation();  // Add this
      handleSkipMatch();
    }}
    className="text-gray-400 hover:text-white text-xs flex items-center gap-1 transition-colors duration-300 group"
  >
    <span>Skip Match</span>
    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
  </button>
  <button
    onClick={(e) => {
      e.stopPropagation();  // Add this
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
    </motion.div>
  );
};

export default MatchVotingBox;