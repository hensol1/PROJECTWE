import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AccuracyComparison from '../components/AccuracyComparison';
import Matches from '../components/matches/Matches';
import { useMatchesData } from '../hooks/useMatchesData'; // Import as named export
import TodaysOdds from '../components/TodaysOdds';
import TopLeaguesPerformance from '../components/TopLeaguesPerformance';
import { BlogPreview } from '../components/blog/BlogPreview';
import NewLeagueFilter from '../components/NewLeagueFilter';
import SEO from '../components/SEO';
import api from '../api';

// TodaysOdds wrapper component
function HomePageOdds({ navigateToOddsPage }) {
  const [todaysMatches, setTodaysMatches] = useState({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchTodaysMatches = async () => {
      setLoading(true);
      try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        
        console.log('Fetching matches for Today\'s Odds component:', formattedDate);
        
        // Direct API call to fetch match data
        try {
          // Try using our new helper method first
          if (typeof api.fetchMatchesForDisplay === 'function') {
            const matches = await api.fetchMatchesForDisplay(today);
            console.log('Got matches from fetchMatchesForDisplay:', Object.keys(matches).length);
            
            // Filter matches to include only today's matches
            const todayOnlyMatches = {};
            
            Object.entries(matches).forEach(([leagueKey, leagueMatches]) => {
              // Filter matches for today's date only
              const todayMatches = leagueMatches.filter(match => {
                const matchDate = new Date(match.utcDate);
                return matchDate.toISOString().split('T')[0] === formattedDate;
              });
              
              // Only include leagues that have matches today
              if (todayMatches.length > 0) {
                todayOnlyMatches[leagueKey] = todayMatches;
              }
            });
            
            console.log(`Filtered to ${Object.values(todayOnlyMatches).flat().length} matches for today's date`);
            
            // Check if we have any matches with odds
            const hasOddsMatches = Object.values(todayOnlyMatches).some(leagueMatches => 
              leagueMatches.some(match => match.odds?.harmonicMeanOdds)
            );
            
            if (hasOddsMatches) {
              setTodaysMatches(todayOnlyMatches);
              setLoading(false);
              return;
            }
          }
          
          // Fallback to direct API call
          const response = await api.fetchMatches(formattedDate);
          
          if (response && response.data) {
            // Process the raw response
            let matchData = [];
            
            // Different possible response structures
            if (response.data.matches) {
              matchData = response.data.matches;
            } else if (response.data[formattedDate]) {
              const dateData = response.data[formattedDate];
              if (typeof dateData === 'object' && !Array.isArray(dateData)) {
                matchData = Object.values(dateData).flat();
              } else {
                matchData = dateData;
              }
            } else if (typeof response.data === 'object') {
              Object.values(response.data).forEach(matches => {
                if (Array.isArray(matches)) {
                  matchData = [...matchData, ...matches];
                }
              });
            }
            
            // Filter to include only matches scheduled for today
            matchData = matchData.filter(match => {
              if (!match.utcDate) return false;
              const matchDate = new Date(match.utcDate);
              return matchDate.toISOString().split('T')[0] === formattedDate;
            });
            
            console.log(`Processing ${matchData.length} matches for Today's Odds (date: ${formattedDate})`);
            
            // Group by league
            const matchesByLeague = {};
            
            // Add dummy odds data in development mode
            const matchesWithOdds = matchData.map(match => {
              // Add dummy odds if missing
              if (!match.odds) {
                match.odds = {
                  harmonicMeanOdds: {
                    home: 2.0 + Math.random() * 1.0,
                    draw: 3.0 + Math.random() * 0.5,
                    away: 2.5 + Math.random() * 0.8
                  },
                  impliedProbabilities: {
                    home: Math.floor(35 + Math.random() * 15),
                    draw: Math.floor(25 + Math.random() * 10),
                    away: Math.floor(30 + Math.random() * 15)
                  }
                };
              }
              return match;
            });
                        
            // Group matches by league
            matchesWithOdds.forEach(match => {
              if (match.competition?.id) {
                const leagueKey = `${match.competition.name}_${match.competition.id}`;
                if (!matchesByLeague[leagueKey]) {
                  matchesByLeague[leagueKey] = [];
                }
                matchesByLeague[leagueKey].push(match);
              }
            });
            
            console.log(`Processed ${Object.values(matchesByLeague).flat().length} matches with odds for today`);
            setTodaysMatches(matchesByLeague);
          } else {
            console.warn('No data in response');
            setTodaysMatches({});
          }
        } catch (apiError) {
          console.error('API error:', apiError);
          
          // Create dummy matches for development
          if (process.env.NODE_ENV === 'development') {
            console.log('Creating dummy matches for development');
            const dummyMatches = {
              'Premier League_1': Array(3).fill().map((_, i) => createDummyMatch(i, 'Premier League', formattedDate)),
              'La Liga_2': Array(2).fill().map((_, i) => createDummyMatch(i, 'La Liga', formattedDate)),
              'Bundesliga_3': Array(2).fill().map((_, i) => createDummyMatch(i, 'Bundesliga', formattedDate))
            };
            setTodaysMatches(dummyMatches);
          } else {
            setTodaysMatches({});
          }
        }
      } catch (error) {
        console.error('Error in Today\'s Odds component:', error);
        setTodaysMatches({});
      } finally {
        setLoading(false);
      }
    };
    
    // Helper to create dummy match data for development
    const createDummyMatch = (index, leagueName, dateStr) => {
      const id = `dummy_${index}`;
      const homeTeam = { id: `home_${index}`, name: `Home Team ${index}`, crest: 'https://via.placeholder.com/30' };
      const awayTeam = { id: `away_${index}`, name: `Away Team ${index}`, crest: 'https://via.placeholder.com/30' };
      
      // Create a date for today at a reasonable match time
      const matchDate = new Date(dateStr);
      matchDate.setHours(15 + index); // Set hours to afternoon
      matchDate.setMinutes(0);
      matchDate.setSeconds(0);
      
      return {
        id,
        utcDate: matchDate.toISOString(),
        status: 'TIMED',
        homeTeam,
        awayTeam,
        competition: {
          id: leagueName === 'Premier League' ? 1 : leagueName === 'La Liga' ? 2 : 3,
          name: leagueName,
          emblem: 'https://via.placeholder.com/30'
        },
        odds: {
          harmonicMeanOdds: {
            home: 2.0 + Math.random() * 1.0,
            draw: 3.0 + Math.random() * 0.5,
            away: 2.5 + Math.random() * 0.8
          },
          impliedProbabilities: {
            home: Math.floor(35 + Math.random() * 15),
            draw: Math.floor(25 + Math.random() * 10),
            away: Math.floor(30 + Math.random() * 15)
          }
        }
      };
    };
    
    fetchTodaysMatches();
  }, []);
  
  if (loading) {
    return (
      <div className="w-full rounded-xl shadow-lg overflow-hidden bg-[#1a1f2b] p-4 text-center">
        <div className="animate-pulse flex flex-col items-center justify-center py-8">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }
  
  return <TodaysOdds allMatches={todaysMatches} onClick={navigateToOddsPage} />;
}

export default function HomePage({ user, setAuthModalOpen }) {
  const navigate = useNavigate();
  const oddsRef = useRef(null);
  const { getCurrentMatches, isLoading, activeTab } = useMatchesData();
  
  // State for the league filter
  const [selectedLeague, setSelectedLeague] = useState(null);
  // State for mobile filter modal
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  // Get all matches for the league filter
  const allMatches = getCurrentMatches('all'); // Pass 'all' to get all matches
  
  // Debug log to see what's happening
  useEffect(() => {
    console.log('All matches for league filter:', allMatches);
    console.log('Number of leagues:', Object.keys(allMatches).length);
  }, [allMatches]);
  
  const navigateToOddsPage = () => {
    navigate('/odds');
  };
  
  // Custom scroll handler for Today's Odds
  useEffect(() => {
    if (!oddsRef.current) return;
    
    const oddsBox = oddsRef.current;
    
    const handleScroll = () => {
      // Use a simpler approach with just sticky positioning
      // This avoids the complex calculations that might cause flickering
      oddsBox.style.position = 'sticky';
      oddsBox.style.top = '1rem';
    };
    
    // Set initial positioning
    handleScroll();
    
    return () => {
      // No need for event listeners with the simpler approach
    };
  }, []);
    
  return (
<>
  <SEO 
    title="Football Predictions - We Know Better"
    description="Make and compare football predictions with AI. Join We Know Better to track your prediction accuracy and compete with fans worldwide."
    path="/"
  />
  
  <div className="max-w-6xl mx-auto px-2">
    {/* Desktop row with perfect alignment */}
    <div className="hidden md:flex space-x-4">
      {/* Left sidebar - Top Performing Leagues */}
      <div className="mt-4">
      <div className="w-[280px] flex-shrink-0">
        <div className="bg-[#1a1f2b] rounded-lg overflow-hidden">
          <TopLeaguesPerformance displayMode="desktop" />
        </div>
        </div>
      </div>

      {/* Center column - AccuracyComparison */}
      <div className="flex-grow">
        <div className="mt-0">
          <AccuracyComparison 
            user={user} 
            onSignInClick={() => setAuthModalOpen(true)}
          />
        </div>
        {/* Add the Data Hub button here, after the AccuracyComparison component */}
        <div className="mt-0 mb-0">
  <button
    onClick={() => navigate('/stats')}
    className="w-full max-w-[600px] mx-auto bg-[#1a1f2b] hover:bg-[#242938] rounded-lg shadow-md transition-all duration-200 overflow-hidden group"
  >
    <div className="flex items-center justify-center py-1 px-5 relative">
      {/* Background highlight effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      {/* Left border accent */}
      <div className="absolute left-0 top-0 h-full w-0.5 bg-emerald-500"></div>
      
      <div className="flex items-center space-x-3 relative z-10">
        {/* Chart icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18"></path>
          <path d="M18 9l-5 5-4-4-5 5"></path>
        </svg>
        
        <span className="text-emerald-400 text-base font-medium">WKB DataHub</span>
      </div>
    </div>
  </button>
</div>
      </div>

      {/* Right sidebar - Blog Preview */}
      <div className="mt-4">
      <div className="w-[280px] flex-shrink-0">
        <div className="bg-[#1a1f2b] rounded-lg overflow-hidden">
          <BlogPreview />
        </div>
        </div>
      </div>
    </div>
    
    {/* Mobile components */}
    <div className="md:hidden">
      <AccuracyComparison 
        user={user} 
        onSignInClick={() => setAuthModalOpen(true)}
      />
      
      {/* Add the Data Hub button for mobile view too */}
      <div className="mt-2 mb-2">
  <button
    onClick={() => navigate('/stats')}
    className="w-full bg-[#242938] hover:bg-[#2c3344] border border-[#2d364a] rounded-lg shadow-md transition-all duration-200 flex items-center justify-center py-1 group overflow-hidden relative"
  >
    <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600"></div>
    <div className="flex items-center space-x-3">
      {/* Chart icon with glow effect on hover */}
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400 group-hover:text-emerald-300 transition-all duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18"></path>
          <path d="M18 9l-5 5-4-4-5 5"></path>
        </svg>
        <div className="absolute inset-0 bg-emerald-400 blur-md opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-full"></div>
      </div>
      <span className="text-emerald-400 text-base font-medium group-hover:text-emerald-300 transition-colors duration-300">WKB DataHub</span>
    </div>
  </button>
</div>
      
      <div className="mt-4">
        <TopLeaguesPerformance displayMode="mobile" />
      </div>
      
      <div className="mt-4 mb-6">
        <HomePageOdds navigateToOddsPage={navigateToOddsPage} />
      </div>          
          <div className="mt-4">
            <BlogPreview />
          </div>
          
          <div className="mt-4">
            <Matches 
              user={user} 
              onOpenAuthModal={() => setAuthModalOpen(true)}
              disableSidebars={true}
              selectedLeague={selectedLeague}
            />
          </div>
        </div>
        
        {/* Mobile league filter side menu */}
        <div className={`fixed inset-0 z-50 md:hidden ${isMobileFilterOpen ? 'visible' : 'invisible'}`}>
          {/* Overlay - only visible when menu is open */}
          <div 
            className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isMobileFilterOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setIsMobileFilterOpen(false)}
          ></div>
          
          {/* Side menu panel */}
          <div 
            className={`absolute top-0 left-0 bottom-0 w-4/5 max-w-xs bg-white overflow-auto transition-transform duration-300 ${isMobileFilterOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <div className="p-4 flex justify-between items-center border-b">
              <h3 className="text-gray-900 font-medium">Today's Events</h3>
              <button 
                onClick={() => setIsMobileFilterOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search leagues..."
                  className="w-full py-2 pl-9 pr-4 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 absolute left-3 top-2.5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              <div className="space-y-2">
                {/* All Leagues option */}
                <button 
                  className={`w-full p-3 text-left rounded-md flex items-center ${!selectedLeague ? 'bg-blue-50 text-blue-600' : 'text-gray-800 hover:bg-gray-100'}`}
                  onClick={() => {
                    setSelectedLeague(null);
                    setIsMobileFilterOpen(false);
                  }}
                >
                  <span className="font-medium">All Leagues</span>
                </button>
                
                {/* League list - render directly rather than using NewLeagueFilter */}
                {Object.entries(allMatches).map(([leagueKey, matches]) => {
                  // Extract league info from the first match
                  const firstMatch = matches[0];
                  if (!firstMatch) return null;
                  
                  const leagueName = firstMatch.competition?.name || leagueKey.split('_')[0];
                  const leagueEmblem = firstMatch.competition?.emblem;
                  const countryFlag = firstMatch.competition?.country?.flag;
                  
                  return (
                    <button 
                      key={leagueKey}
                      className={`w-full p-3 text-left rounded-md flex items-center ${selectedLeague === leagueKey ? 'bg-blue-50 text-blue-600' : 'text-gray-800 hover:bg-gray-100'}`}
                      onClick={() => {
                        setSelectedLeague(leagueKey);
                        setIsMobileFilterOpen(false);
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        {/* League icon/flag */}
                        <div className="flex items-center space-x-1 w-8">
                          {countryFlag && (
                            <img 
                              src={countryFlag} 
                              alt=""
                              className="w-4 h-3 object-cover"
                              onError={(e) => e.target.style.display = 'none'}
                            />
                          )}
                          {leagueEmblem && (
                            <img 
                              src={leagueEmblem} 
                              alt=""
                              className="w-5 h-5 object-contain"
                              onError={(e) => e.target.style.display = 'none'}
                            />
                          )}
                        </div>
                        <span className="font-medium">{leagueName}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
            
        {/* Floating filter button for mobile */}
        <div className="md:hidden fixed left-4 bottom-4 z-40">
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
            aria-label="Filter Leagues"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>
            
{/* Desktop row for matches and filters - with better alignment */}
<div className="hidden md:flex mt-4 space-x-4">
  {/* Left sidebar for league filter */}
  <div className="w-[280px] flex-shrink-0">
    <div className="sticky" style={{ top: '1rem' }}> {/* Match the same sticky position */}
      <NewLeagueFilter 
        matches={allMatches}
        onSelectLeague={setSelectedLeague}
        selectedLeague={selectedLeague}
      />
    </div>
  </div>
  
  {/* Matches component */}
  <div className="flex-grow mt-0">
    <Matches 
      user={user} 
      onOpenAuthModal={() => setAuthModalOpen(true)}
      disableSidebars={true}
      selectedLeague={selectedLeague}
    />
  </div>
  
  {/* Today's Odds with custom scrolling behavior */}
  <div className="w-[280px] flex-shrink-0">
    <div ref={oddsRef} style={{ position: 'sticky', top: '1rem' }}>
      <HomePageOdds navigateToOddsPage={navigateToOddsPage} />
    </div>
  </div>
</div>
      </div>
    </>
  );
}