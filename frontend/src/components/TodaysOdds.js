import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Info, ChevronDown, ChevronUp, X } from 'lucide-react';

const websiteColors = {
  primary: '#2ECC40',
  primaryDark: '#25a032',
  background: '#171923',
  backgroundGradient: '#2ECC43',
  backgroundLight: '#1e2231',
  text: '#FFFFFF'
};

const Match = ({ match }) => {
  return (
    <div className="p-2 md:p-4 border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center flex-1">
          <img 
            src={match.homeTeam.crest} 
            alt={match.homeTeam.name}
            className="w-4 h-4 md:w-6 md:h-6 object-contain"
          />
          <span className="text-xs md:text-sm text-white ml-1 md:ml-2 truncate">
            {match.homeTeam.name}
          </span>
        </div>
        <div className="flex items-center flex-1 justify-end">
          <span className="text-xs md:text-sm text-white mr-1 md:mr-2 truncate">
            {match.awayTeam.name}
          </span>
          <img 
            src={match.awayTeam.crest} 
            alt={match.awayTeam.name}
            className="w-4 h-4 md:w-6 md:h-6 object-contain"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 md:gap-2 text-center">
        <div className="bg-gray-800 rounded p-1 md:p-2">
          <div className="text-xs text-white">Home</div>
          <div style={{ color: websiteColors.primary }} className="text-sm md:text-lg font-bold">
            {match.odds.harmonicMeanOdds.home.toFixed(2)}
          </div>
          <div className="text-[10px] md:text-xs text-gray-400">
            {match.odds.impliedProbabilities.home}%
          </div>
        </div>

        <div className="bg-gray-800 rounded p-1 md:p-2">
          <div className="text-xs text-white">Draw</div>
          <div style={{ color: websiteColors.primary }} className="text-sm md:text-lg font-bold">
            {match.odds.harmonicMeanOdds.draw.toFixed(2)}
          </div>
          <div className="text-[10px] md:text-xs text-gray-400">
            {match.odds.impliedProbabilities.draw}%
          </div>
        </div>

        <div className="bg-gray-800 rounded p-1 md:p-2">
          <div className="text-xs text-white">Away</div>
          <div style={{ color: websiteColors.primary }} className="text-sm md:text-lg font-bold">
            {match.odds.harmonicMeanOdds.away.toFixed(2)}
          </div>
          <div className="text-[10px] md:text-xs text-gray-400">
            {match.odds.impliedProbabilities.away}%
          </div>
        </div>
      </div>
    </div>
  );
};

const TodaysOdds = ({ allMatches, isPage = false, onClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [expandedCompetitions, setExpandedCompetitions] = useState(new Set());
  const [showTooltip, setShowTooltip] = useState(false);

  const getMatchesGroupedByCompetition = () => {
    const groupedMatches = new Map();
    
    // Process matches by league
    Object.entries(allMatches || {}).forEach(([leagueId, matches]) => {
      matches.forEach(match => {
        if (match.odds?.harmonicMeanOdds) {
          const compId = match.competition.id;
          if (!groupedMatches.has(compId)) {
            groupedMatches.set(compId, {
              competition: match.competition,
              matches: []
            });
          }
          groupedMatches.get(compId).matches.push(match);
        }
      });
    });
  
    // Sort matches within each competition by kickoff time
    groupedMatches.forEach(group => {
      group.matches.sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
    });
  
    return Array.from(groupedMatches.values());
  };
  
  const competitions = getMatchesGroupedByCompetition();

  useEffect(() => {
    if (currentIndex >= competitions.length) {
      setCurrentIndex(0);
    }
  }, [competitions.length, currentIndex]);

  useEffect(() => {
    if (competitions.length === 0 || isPage) return;

    const timer = !isPaused && setInterval(() => {
      setCurrentIndex((current) => 
        current === competitions.length - 1 ? 0 : current + 1
      );
    }, 3000);

    return () => timer && clearInterval(timer);
  }, [competitions.length, isPaused, isPage]);

  const handlePrevious = () => {
    setCurrentIndex(current => 
      current === 0 ? competitions.length - 1 : current - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex(current => 
      current === competitions.length - 1 ? 0 : current + 1
    );
  };

  const toggleExpand = (compId) => {
    setExpandedCompetitions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(compId)) {
        newSet.delete(compId);
      } else {
        newSet.add(compId);
      }
      return newSet;
    });
  };

  // Toggle tooltip visibility
  const handleInfoClick = (e) => {
    e.stopPropagation();
    setShowTooltip(!showTooltip);
  };

  // Component wrapper with click handler
  const WrapperComponent = ({ children }) => {
    if (onClick) {
      return (
        <div 
          className="w-full cursor-pointer hover:opacity-95 transition-opacity" 
          onClick={onClick}
        >
          {children}
        </div>
      );
    }
    return <>{children}</>;
  };

  if (competitions.length === 0) {
    return (
      <WrapperComponent>
        <div className="w-full rounded-xl shadow-lg overflow-hidden bg-gray-900 p-4 text-center text-gray-400 text-xs md:text-sm">
          No odds available for today's matches
        </div>
      </WrapperComponent>
    );
  }

  // On the odds page, we want to show all competitions
  if (isPage) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {competitions.map((competition) => {
          const displayMatches = expandedCompetitions.has(competition.competition.id) 
            ? competition.matches 
            : competition.matches.slice(0, 3);
            
          return (
            <div 
              key={competition.competition.id}
              className="w-full rounded-xl shadow-lg relative" 
              style={{ background: websiteColors.background, overflow: 'visible' }}
            >
              <div className="p-2 md:p-3 border-b border-gray-800">
                <div className="flex items-center justify-center gap-2">
                  {competition.competition.emblem && (
                    <img 
                      src={competition.competition.emblem} 
                      alt={competition.competition.name}
                      className="w-4 h-4 md:w-6 md:h-6 object-contain"
                    />
                  )}
                  <span className="text-xs md:text-sm text-white font-medium">
                    {competition.competition.name}
                  </span>
                </div>
              </div>

              <div className="relative">
                <div>
                  {displayMatches.map(match => (
                    <Match key={match.id} match={match} />
                  ))}
                </div>

                {competition.matches.length > 3 && (
                  <button
                    onClick={() => toggleExpand(competition.competition.id)}
                    className="w-full py-2 flex items-center justify-center text-gray-300 hover:text-white transition-colors border-t border-gray-800/50"
                  >
                    {expandedCompetitions.has(competition.competition.id) ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // For sidebar view (original behavior)
  const currentCompetition = competitions[currentIndex] || competitions[0];
  const displayMatches = expandedCompetitions.has(currentCompetition.competition.id) 
    ? currentCompetition.matches 
    : currentCompetition.matches.slice(0, 3);

  return (
    <WrapperComponent>
      <div className="sticky top-4" style={{ overflow: 'visible' }}
           onMouseEnter={() => setIsPaused(true)}
           onMouseLeave={() => setIsPaused(false)}>
        <div className="w-full rounded-xl shadow-lg relative" 
             style={{ background: websiteColors.background, overflow: 'visible' }}>
          <div className="p-2 md:p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-lg font-medium" style={{ color: websiteColors.primary }}>
                Today's Odds
              </h2>
              {/* Info icon with appropriate tooltips for desktop and mobile */}
              <div className="relative group">
                <Info 
                  className="w-3 h-3 md:w-4 md:h-4 text-gray-400 hover:text-gray-300 cursor-help"
                  onClick={handleInfoClick}
                />
                
                {/* Mobile tooltip - only shown when clicked */}
                {showTooltip && (
                  <div 
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:hidden"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTooltip(false);
                    }}
                  >
                    <div 
                      className="bg-gray-800 rounded-lg p-4 max-w-xs mx-auto text-xs text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button 
                        className="float-right text-gray-400 hover:text-white"
                        onClick={() => setShowTooltip(false)}
                      >
                        <X size={16} />
                      </button>
                      <p className="mb-2">
                        The displayed odds represent a sophisticated harmonic mean calculation derived from over 15 leading bookmakers.
                      </p>
                      <p>
                        We utilize the harmonic mean methodology as it provides a more conservative and statistically robust average, particularly suitable for betting odds analysis and market consensus evaluation.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Desktop tooltip - shown on hover */}
                <div className="hidden md:block invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-gray-800 rounded-lg shadow-xl text-xs md:text-sm text-white z-[9999]">
                  <div className="relative">
                    <div className="text-left">
                      <p className="mb-2">
                        The displayed odds represent a sophisticated harmonic mean calculation derived from over 15 leading bookmakers.
                      </p>
                      <p>
                        We utilize the harmonic mean methodology as it provides a more conservative and statistically robust average, particularly suitable for betting odds analysis and market consensus evaluation.
                      </p>
                    </div>
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-800 rotate-45"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {currentCompetition?.competition && (
            <div className="p-2 md:p-3 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the parent onClick
                    handlePrevious();
                  }}
                  className="p-1 text-white/50 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                </button>

                <div className="flex items-center justify-center gap-2">
                  {currentCompetition.competition.emblem && (
                    <img 
                      src={currentCompetition.competition.emblem} 
                      alt={currentCompetition.competition.name}
                      className="w-4 h-4 md:w-6 md:h-6 object-contain"
                    />
                  )}
                  <span className="text-xs md:text-sm text-white font-medium">
                    {currentCompetition.competition.name}
                  </span>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the parent onClick
                    handleNext();
                  }}
                  className="p-1 text-white/50 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
            </div>
          )}

          <div className="relative">
            <div>
              {displayMatches.map(match => (
                <Match key={match.id} match={match} />
              ))}
            </div>

            {currentCompetition.matches.length > 3 && (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering the parent onClick
                  toggleExpand(currentCompetition.competition.id);
                }}
                className="w-full py-2 flex items-center justify-center text-gray-300 hover:text-white transition-colors border-t border-gray-800/50"
              >
                {expandedCompetitions.has(currentCompetition.competition.id) ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
            )}

            <div className="py-2 flex justify-center gap-1 border-t border-gray-800/50">
              {competitions.map((_, index) => (
                <div 
                  key={index}
                  className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-colors duration-300 ${
                    index === currentIndex ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </WrapperComponent>
  );
};

export default TodaysOdds;