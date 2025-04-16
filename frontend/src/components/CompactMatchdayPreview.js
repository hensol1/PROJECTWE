import React, { useState, useEffect } from 'react';
import { Calendar, Medal, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api';
import { format, parseISO } from 'date-fns';

const CompactMatchdayPreview = ({ displayMode = 'desktop' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [keyMatches, setKeyMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // League priorities by ID and name+country
  const leaguePriorities = {
    // By ID (most specific and reliable)
    2: 1,   // UEFA Champions League
    39: 2,  // English Premier League
    140: 3, // La Liga
    61: 4,  // Ligue 1
    78: 5,  // Bundesliga
    135: 6, // Serie A
    3: 7,   // UEFA Europa League
    
    // By name + country (fallback)
    'UEFA Champions League': 1,
    'Premier League_England': 2, // More specific format: name_country
    'La Liga_Spain': 3,
    'Ligue 1_France': 4,
    'Bundesliga_Germany': 5,
    'Serie A_Italy': 6,
    'UEFA Europa League': 7
  };
  
  // Function to select top matches with better distribution
  const selectTopMatches = (matches) => {
    // First, sort by priority then confidence
    const sortedMatches = [...matches].sort((a, b) => {
      // Get league priorities (default to 100 if not in priority list)
      const aPriority = 
        leaguePriorities[a.leagueId] || 
        leaguePriorities[a.leagueCountryKey] || 
        leaguePriorities[a.league] || 
        100;
      
      const bPriority = 
        leaguePriorities[b.leagueId] || 
        leaguePriorities[b.leagueCountryKey] || 
        leaguePriorities[b.league] || 
        100;
      
      // First sort by league priority
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // If same league priority and both have odds, sort by confidence
      if (a.odds?.harmonicMeanOdds && b.odds?.harmonicMeanOdds) {
        return b.confidence - a.confidence;
      }
      
      // If only one has odds, prioritize that one
      if (a.odds?.harmonicMeanOdds) return -1;
      if (b.odds?.harmonicMeanOdds) return 1;
      
      // If neither has odds, sort by match time
      return new Date(a.utcDate) - new Date(b.utcDate);
    });
    
    // Group by league priority
    const matchesByPriority = {};
    
    sortedMatches.forEach(match => {
      const priority = 
        leaguePriorities[match.leagueId] || 
        leaguePriorities[match.leagueCountryKey] || 
        leaguePriorities[match.league] || 
        100;
      
      if (!matchesByPriority[priority]) {
        matchesByPriority[priority] = [];
      }
      
      matchesByPriority[priority].push(match);
    });
    
    // Select matches with at least one from each priority league, up to 5 total
    const selectedMatches = [];
    const priorities = Object.keys(matchesByPriority).sort((a, b) => Number(a) - Number(b)); // Sort numerically
    
    // First, include one match from each priority level
    for (const priority of priorities) {
      if (matchesByPriority[priority].length > 0 && selectedMatches.length < 5) {
        // Sort by confidence within the priority if odds available
        matchesByPriority[priority].sort((a, b) => {
          if (a.odds?.harmonicMeanOdds && b.odds?.harmonicMeanOdds) {
            return b.confidence - a.confidence;
          }
          if (a.odds?.harmonicMeanOdds) return -1;
          if (b.odds?.harmonicMeanOdds) return 1;
          return new Date(a.utcDate) - new Date(b.utcDate);
        });
        selectedMatches.push(matchesByPriority[priority][0]);
      }
    }
    
    // Then fill up to 5 with remaining highest priority matches
    for (const priority of priorities) {
      if (selectedMatches.length >= 5) break;
      
      // Skip the first match as it's already included
      for (let i = 1; i < matchesByPriority[priority].length; i++) {
        if (selectedMatches.length >= 5) break;
        selectedMatches.push(matchesByPriority[priority][i]);
      }
    }
    
    return selectedMatches;
  };
  
  // Fetch key matches data
  useEffect(() => {
    const fetchKeyMatches = async () => {
      setIsLoading(true);
      try {
        // First check for cached data
        const cachedData = sessionStorage.getItem('keyMatches');
        const cachedTimestamp = sessionStorage.getItem('keyMatchesTimestamp');
        const now = Date.now();
        const CACHE_VALIDITY = 5 * 60 * 1000; // 5 minutes
        
        // Use cached data if it's fresh
        if (cachedData && cachedTimestamp && (now - parseInt(cachedTimestamp) < CACHE_VALIDITY)) {
          const parsed = JSON.parse(cachedData);
          setKeyMatches(parsed);
          setIsLoading(false);
          return;
        }
        
        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const formattedDate = format(today, 'yyyy-MM-dd');
        
        // Fetch matches for today
        const matches = await api.fetchMatchesForDisplay(formattedDate);
        
        // Process matches to find key matches
        const processedMatches = [];
        
        // Process each league's matches
        Object.entries(matches).forEach(([leagueKey, leagueMatches]) => {
          if (!Array.isArray(leagueMatches)) return;
          
          // Keep only today's matches and those with odds
          const filteredMatches = leagueMatches.filter(match => {
            // Filter for today's matches
            if (!match.utcDate) return false;
            const matchDate = parseISO(match.utcDate);
            const matchDateStr = format(matchDate, 'yyyy-MM-dd');
            
            return matchDateStr === formattedDate;
          });
          
          // Add the matches to our processed list with additional info
          filteredMatches.forEach(match => {
            // Extract match time
            const matchTime = format(parseISO(match.utcDate), 'HH:mm');
            
            // Determine prediction and confidence based on odds
            let prediction = 'Unknown';
            let confidence = 0;
            
            if (match.odds?.harmonicMeanOdds) {
              const odds = match.odds.harmonicMeanOdds;
              const homeOdds = parseFloat(odds.home);
              const drawOdds = parseFloat(odds.draw);
              const awayOdds = parseFloat(odds.away);
              
              // Convert odds to probabilities and find the highest
              const probabilities = {
                home: 1 / homeOdds,
                draw: 1 / drawOdds,
                away: 1 / awayOdds
              };
              
              // Find the highest probability outcome
              if (probabilities.home > probabilities.draw && probabilities.home > probabilities.away) {
                prediction = 'Home Win';
                confidence = parseFloat(match.odds.impliedProbabilities.home);
              } else if (probabilities.away > probabilities.draw && probabilities.away > probabilities.home) {
                prediction = 'Away Win';
                confidence = parseFloat(match.odds.impliedProbabilities.away);
              } else {
                prediction = 'Draw';
                confidence = parseFloat(match.odds.impliedProbabilities.draw);
              }
            }
            
            // Create the league+country key for better league identification
            const countryName = match.competition?.country?.name || '';
            const leagueCountryKey = `${match.competition?.name || ''}_${countryName}`;
            
            // Create match object with needed data
            processedMatches.push({
              id: match.id,
              home: match.homeTeam.name,
              away: match.awayTeam.name,
              league: match.competition?.name || leagueKey.split('_')[0],
              countryName: countryName,
              leagueCountryKey: leagueCountryKey,
              time: matchTime,
              homeLogo: match.homeTeam.crest,
              awayLogo: match.awayTeam.crest,
              homeId: match.homeTeam.id,
              awayId: match.awayTeam.id,
              leagueId: match.competition?.id,
              prediction,
              confidence: parseFloat((confidence * 100).toFixed(2)),
              utcDate: match.utcDate
            });
          });
        });
        
        // Use the improved selection function instead of simple sorting
        const topMatches = selectTopMatches(processedMatches);
        
        // For each match, try to fetch team form data
        const matchesWithTeamData = await Promise.all(topMatches.map(async (match) => {
          try {
            // Fetch home team data
            if (match.homeId) {
              const homeTeamData = await api.fetchTeamMatchHistory(match.homeId);
              if (homeTeamData && homeTeamData.matches) {
                // Get last 5 matches for form
                const recentHomeMatches = homeTeamData.matches.slice(0, 5);
                
                // Calculate form (W, D, L)
                match.homeForm = recentHomeMatches.map(m => {
                  if (!m.score?.winner) return 'D'; // Pending
                  
                  const teamIsHome = m.teamIsHome;
                  const winner = m.score.winner;
                  
                  if (winner === 'DRAW') return 'D'; // Use D for draws
                  if ((teamIsHome && winner === 'HOME_TEAM') || 
                      (!teamIsHome && winner === 'AWAY_TEAM')) {
                    return 'W';
                  }
                  return 'L';
                }).join('');
              }
            }
            
            // Fetch away team data
            if (match.awayId) {
              const awayTeamData = await api.fetchTeamMatchHistory(match.awayId);
              if (awayTeamData && awayTeamData.matches) {
                // Get last 5 matches for form
                const recentAwayMatches = awayTeamData.matches.slice(0, 5);
                
                // Calculate form (W, D, L)
                match.awayForm = recentAwayMatches.map(m => {
                  if (!m.score?.winner) return 'D'; // Pending
                  
                  const teamIsHome = m.teamIsHome;
                  const winner = m.score.winner;
                  
                  if (winner === 'DRAW') return 'D'; // Use D for draws
                  if ((teamIsHome && winner === 'HOME_TEAM') || 
                      (!teamIsHome && winner === 'AWAY_TEAM')) {
                    return 'W';
                  }
                  return 'L';
                }).join('');
              }
            }
            
            // Set default values if we couldn't fetch form data
            if (!match.homeForm) match.homeForm = 'PPPPP';
            if (!match.awayForm) match.awayForm = 'PPPPP';
            
            // Get league stats to add context to the prediction
            if (match.leagueId) {
              const leagueStats = await api.fetchLeagueStats();
              let leagueData = null;
              
              // Find the league in the response
              if (Array.isArray(leagueStats)) {
                leagueData = leagueStats.find(l => l.id === match.leagueId);
              } else if (leagueStats?.data && Array.isArray(leagueStats.data)) {
                leagueData = leagueStats.data.find(l => l.id === match.leagueId);
              } else if (leagueStats?.stats && Array.isArray(leagueStats.stats)) {
                leagueData = leagueStats.stats.find(l => l.id === match.leagueId);
              }
              
              // Generate a key fact based on prediction
              if (leagueData) {
                const leagueAccuracy = parseFloat(leagueData.accuracy).toFixed(1);
                match.leagueAccuracy = leagueAccuracy;
                
                // Different facts based on prediction type
                if (match.prediction === 'Home Win') {
                  match.key_fact = `Our AI has ${leagueAccuracy}% accuracy in the ${match.league}.`;
                } else if (match.prediction === 'Away Win') {
                  match.key_fact = `${match.away} has a strong away record based on our analysis.`;
                } else {
                  match.key_fact = `The ${match.league} has ${leagueAccuracy}% prediction accuracy.`;
                }
              } else {
                match.key_fact = `Our AI analyzed all odds from 15+ bookmakers.`;
              }
            }
            
            // If we couldn't get a key fact, set a generic one
            if (!match.key_fact) {
              match.key_fact = `Our AI analyzed all odds from 15+ bookmakers.`;
            }
            
            return match;
          } catch (error) {
            console.error(`Error enriching match data for ${match.home} vs ${match.away}:`, error);
            return match;
          }
        }));
        
        // Update state with the processed matches
        setKeyMatches(matchesWithTeamData);
        setIsLoading(false);
        
        // Cache the data
        sessionStorage.setItem('keyMatches', JSON.stringify(matchesWithTeamData));
        sessionStorage.setItem('keyMatchesTimestamp', now.toString());
      } catch (error) {
        console.error('Error fetching key matches:', error);
        setError('Failed to load key matches');
        setIsLoading(false);
      }
    };
    
    fetchKeyMatches();
  }, []);
  
  // Auto-rotate matches every 8 seconds
  useEffect(() => {
    if (isPaused || keyMatches.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex(prevIndex => 
        prevIndex === keyMatches.length - 1 ? 0 : prevIndex + 1
      );
    }, 8000);
    
    return () => clearInterval(timer);
  }, [isPaused, keyMatches.length]);
  
  // Navigation handlers
  const handlePrevious = (e) => {
    e.stopPropagation();
    setCurrentIndex(prevIndex => 
      prevIndex === 0 ? keyMatches.length - 1 : prevIndex - 1
    );
  };
  
  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex(prevIndex => 
      prevIndex === keyMatches.length - 1 ? 0 : prevIndex + 1
    );
  };
  
  // Get today's day and date
  const today = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const dayName = dayNames[today.getDay()];
  const dateString = `${dayName}, ${monthNames[today.getMonth()]} ${today.getDate()}`;
  
  // Get color based on form result (W, D, L, P)
  const getFormColor = (result) => {
    switch(result) {
      case 'W': return 'text-emerald-400';
      case 'D': return 'text-amber-400';
      case 'L': return 'text-red-400';
      case 'P': return 'text-gray-400'; // Pending matches
      default: return 'text-gray-400';
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="bg-[#1a1f2b] rounded-lg overflow-hidden shadow-lg w-full h-full flex flex-col">
        <div className="bg-[#242938] p-3 border-b border-gray-700">
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-emerald-400 mr-2" />
            <h3 className="text-sm font-medium text-emerald-400">Today's Key Matches</h3>
          </div>
        </div>
        <div className="p-3 flex-grow flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="bg-[#1a1f2b] rounded-lg overflow-hidden shadow-lg w-full h-full flex flex-col">
        <div className="bg-[#242938] p-3 border-b border-gray-700">
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-emerald-400 mr-2" />
            <h3 className="text-sm font-medium text-emerald-400">Today's Key Matches</h3>
          </div>
        </div>
        <div className="p-3 flex-grow flex items-center justify-center">
          <div className="text-gray-400 text-xs">Unable to load key matches</div>
        </div>
      </div>
    );
  }
  
  // Empty state
  if (keyMatches.length === 0) {
    return (
      <div className="bg-[#1a1f2b] rounded-lg overflow-hidden shadow-lg w-full h-full flex flex-col">
        <div className="bg-[#242938] p-3 border-b border-gray-700">
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-emerald-400 mr-2" />
            <h3 className="text-sm font-medium text-emerald-400">Today's Key Matches</h3>
          </div>
        </div>
        <div className="p-3 flex-grow flex items-center justify-center">
          <div className="text-gray-400 text-xs">No matches available today</div>
        </div>
      </div>
    );
  }
  
  // Current match to display
  const match = keyMatches[currentIndex];
  
  // Main render
  return (
    <div 
      className="bg-[#1a1f2b] rounded-lg overflow-hidden shadow-lg w-full flex flex-col h-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Header */}
      <div className="bg-[#242938] p-3 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center">
          <Calendar className="w-5 h-5 text-emerald-400 mr-2" />
          <h3 className="text-sm font-medium text-emerald-400">Today's Key Matches</h3>
        </div>
        <div className="flex items-center">
          <div className="flex space-x-1">
            {keyMatches.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? 'bg-emerald-500' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Match content - new design with cropped logos */}
      <div className="px-3 pt-2 pb-2 flex-grow flex flex-col">
        {/* League and time - centered */}
        <div className="text-center pb-2">
          <div className="flex justify-center items-center">
            <ChevronLeft 
              className="w-4 h-4 text-gray-500 hover:text-emerald-400 transition-colors cursor-pointer mr-3" 
              onClick={handlePrevious}
            />
            <span className="text-gray-300 text-sm">
              {match.league}
            </span>
            <ChevronRight 
              className="w-4 h-4 text-gray-500 hover:text-emerald-400 transition-colors cursor-pointer ml-3" 
              onClick={handleNext}
            />
          </div>
        </div>
        
        {/* Teams with cropped logos */}
        <div className="flex items-center justify-between mb-1">
          {/* Home team */}
          <div className="flex flex-col items-center w-[40%]">
            {/* Logo container with overflow hidden to crop the logo */}
            <div className="relative w-24 h-16 overflow-hidden mb-1">
              <img 
                src={match.homeLogo} 
                alt={match.home}
                className="w-24 h-24 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 object-contain"
                onError={(e) => {e.target.style.display = 'none'}}
              />
            </div>
            <h4 className="text-white text-xs font-medium text-center truncate w-full">{match.home}</h4>
            <div className="flex mt-0.5">
              {match.homeForm && match.homeForm.split('').map((result, idx) => (
                <span key={idx} className={`text-[10px] font-medium ${getFormColor(result)} mx-0.5`}>
                  {result}
                </span>
              ))}
            </div>
          </div>
          
          {/* VS */}
          <div className="flex items-center justify-center w-[20%]">
            <span className="text-gray-500 text-xs font-medium">VS</span>
          </div>
          
          {/* Away team */}
          <div className="flex flex-col items-center w-[40%]">
            {/* Logo container with overflow hidden to crop the logo */}
            <div className="relative w-24 h-16 overflow-hidden mb-1">
              <img 
                src={match.awayLogo} 
                alt={match.away}
                className="w-24 h-24 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 object-contain"
                onError={(e) => {e.target.style.display = 'none'}}
              />
            </div>
            <h4 className="text-white text-xs font-medium text-center truncate w-full">{match.away}</h4>
            <div className="flex mt-0.5">
              {match.awayForm && match.awayForm.split('').map((result, idx) => (
                <span key={idx} className={`text-[10px] font-medium ${getFormColor(result)} mx-0.5`}>
                  {result}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        {/* Prediction section - compact */}
        <div className="bg-gray-800/30 rounded p-2 mt-1">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center">
              <Medal className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
              <span className="text-white text-xs">Our Prediction</span>
            </div>
            <div className="text-[10px]">
              <span className="text-gray-400">Confidence:</span> 
              <span className="text-emerald-400 font-medium ml-0.5">{(match.confidence / 100).toFixed(2)}%</span>
            </div>
          </div>
          
          <div className="flex justify-center mb-1">
            <div className="py-0.5 px-3 bg-[#2a3b30] rounded border border-emerald-600/30 flex items-center">
              {match.prediction === 'Home Win' && (
                <span className="mr-1 text-sm">👈</span>
              )}
              {match.prediction === 'Draw' && (
                <span className="mr-1 text-sm">👍👎</span>
              )}
              {match.prediction === 'Away Win' && (
                <span className="mr-1 text-sm">👉</span>
              )}
              <span className="text-emerald-400 text-xs font-semibold">{match.prediction}</span>
            </div>
          </div>
          
          <p className="text-gray-300 text-[10px] text-center">
            {match.key_fact}
          </p>
        </div>
      </div>
    </div>
  );
    };

export default CompactMatchdayPreview;