import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AccuracyComparison from '../components/AccuracyComparison';
import Matches, { useMatchesData } from '../components/matches/Matches';
import TodaysOdds from '../components/TodaysOdds';
import TopLeaguesPerformance from '../components/TopLeaguesPerformance';
import { BlogPreview } from '../components/blog/BlogPreview';
import NewLeagueFilter from '../components/NewLeagueFilter';
import SEO from '../components/SEO';
import api from '../api';

// TodaysOdds wrapper component
function HomePageOdds({ navigateToOddsPage }) {
    const [todaysMatches, setTodaysMatches] = useState({});
    
    useEffect(() => {
      const fetchTodaysMatches = async () => {
        try {
          // Get today's date in YYYY-MM-DD format
          const today = new Date();
          const formattedDate = today.toISOString().split('T')[0];
          
          console.log('Fetching odds for date:', formattedDate);
          const response = await api.fetchMatches(formattedDate);
          
          if (response && response.data) {
            if (response.data.matches) {
              const matchesByLeague = {};
              
              // Filter matches to only include those from today
              response.data.matches.forEach(match => {
                // Extract date from match (match.utcDate should be in ISO format)
                const matchDate = new Date(match.utcDate);
                const matchDateStr = matchDate.toISOString().split('T')[0];
                
                // Only process matches from today
                if (matchDateStr === formattedDate) {
                  const leagueId = match.competition?.id || 'unknown';
                  const leagueKey = `${match.competition?.name || 'Unknown'}_${leagueId}`;
                  
                  if (!matchesByLeague[leagueKey]) {
                    matchesByLeague[leagueKey] = [];
                  }
                  
                  matchesByLeague[leagueKey].push(match);
                }
              });
              
              console.log(`Found ${Object.values(matchesByLeague).flat().length} matches for today`);
              setTodaysMatches(matchesByLeague);
            } else {
              setTodaysMatches(response.data);
            }
          }
        } catch (error) {
          console.error('Error fetching today\'s matches:', error);
        }
      };
      
      fetchTodaysMatches();
    }, []);
    
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
        
        {/* Mobile components - THIS IS THE ONLY PLACE WE RENDER MOBILE COMPONENTS */}
        <div className="md:hidden">
          <AccuracyComparison 
            user={user} 
            onSignInClick={() => setAuthModalOpen(true)}
          />
          
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
            
        {/* Desktop row for matches and filters */}
        <div className="hidden md:flex mt-8 space-x-4">
          {/* Left sidebar for league filter */}
          <div className="w-[280px] flex-shrink-0">
            <div className="sticky top-4">
              <NewLeagueFilter 
                matches={allMatches}
                onSelectLeague={setSelectedLeague}
                selectedLeague={selectedLeague}
              />
            </div>
          </div>
          
          {/* Matches component */}
          <div className="flex-grow">
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