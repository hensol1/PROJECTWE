import React, { useEffect, useState, useRef } from 'react';
import Lottie from 'lottie-react';
import { X } from 'lucide-react';
import goalAnimation from '../assets/goal.json';

const GoalNotification = ({ match, scoringTeam, onClose, autoClose = true }) => {
  console.log('GoalNotification render:', { match, scoringTeam, autoClose });
  const [startY, setStartY] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const lottieRef = useRef(null);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [onClose, autoClose]);

  const handleTouchStart = (e) => {
    if (!isMobile) return;
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isMobile || !startY) return;
    const currentY = e.touches[0].clientY;
    const diff = startY - currentY;
    
    if (diff > 50) {
      onClose();
    }
  };

  const handleTouchEnd = () => {
    setStartY(null);
  };

  const isHome = scoringTeam === 'home';
  const score = match.score.fullTime;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4 relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-20 p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Close notification"
        >
          <X size={20} />
        </button>
        
        {/* League Header */}
        <div className="flex items-center justify-center mb-2">
          <img 
            src={match.competition.emblem} 
            alt={match.competition.name} 
            className="w-8 h-8 mr-2"
          />
          <span className="font-bold text-lg">{match.competition.name}</span>
        </div>

        {/* Match Info */}
        <div className="flex items-center justify-between bg-gray-100 rounded-lg p-3 mb-2">
          {/* Home Team */}
          <div className="flex flex-col items-center w-1/3">
            <img 
              src={match.homeTeam.crest} 
              alt={match.homeTeam.name} 
              className="w-10 h-10 mb-1"
            />
            <span className="text-sm text-center font-medium">{match.homeTeam.name}</span>
          </div>

          {/* Score */}
          <div className="flex items-center justify-center w-1/3">
            <span className={`text-3xl font-bold ${isHome ? 'text-green-500 animate-pulse' : ''}`}>
              {score.home}
            </span>
            <span className="text-3xl font-bold mx-2">-</span>
            <span className={`text-3xl font-bold ${!isHome ? 'text-green-500 animate-pulse' : ''}`}>
              {score.away}
            </span>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center w-1/3">
            <img 
              src={match.awayTeam.crest} 
              alt={match.awayTeam.name} 
              className="w-10 h-10 mb-1"
            />
            <span className="text-sm text-center font-medium">{match.awayTeam.name}</span>
          </div>
        </div>

        {/* Lottie Animation Container */}
        <div className="h-32 relative">
          <Lottie
            lottieRef={lottieRef}
            animationData={goalAnimation}
            loop={true}
            autoplay={true}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '120%',
              height: '120%'
            }}
            onComplete={() => {
              if (lottieRef.current) {
                lottieRef.current.goToAndPlay(0);
              }
            }}
          />
        </div>

        {isMobile && (
          <div className="text-center mt-2 text-sm text-gray-500">
            Swipe up to dismiss
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalNotification;