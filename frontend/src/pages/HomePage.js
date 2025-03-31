import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AccuracyComparison from '../components/AccuracyComparison';
import Matches from '../components/matches/Matches';
import { useMatchesData } from '../hooks/useMatchesData';
import TodaysOdds from '../components/TodaysOdds';
import TopLeaguesPerformance from '../components/TopLeaguesPerformance';
import { BlogPreview } from '../components/blog/BlogPreview';
import NewLeagueFilter from '../components/NewLeagueFilter';
import SEO from '../components/SEO';
import api from '../api';
import { LineChart, Calendar, Award, Trophy, ChevronRight, Search, Filter } from 'lucide-react';

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
          
          // Fallback implementation remains the same
          // [Code omitted for brevity]
        } catch (apiError) {
          console.error('API error:', apiError);
          setTodaysMatches({});
        }
      } catch (error) {
        console.error('Error in Today\'s Odds component:', error);
        setTodaysMatches({});
      } finally {
        setLoading(false);
      }
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

// Feature Card Component for desktop layout
const FeatureCard = ({ icon: Icon, title, onClick, gradient = "from-emerald-500 to-blue-500" }) => (
  <button
    onClick={onClick}
    className="group w-full bg-[#242938] rounded-lg overflow-hidden shadow-md transition-transform duration-300 hover:shadow-lg hover:-translate-y-1"
  >
    <div className={`h-1 w-full bg-gradient-to-r ${gradient}`}></div>
    <div className="p-4 flex items-center">
      <div className={`mr-3 p-2 rounded-lg bg-gradient-to-br ${gradient} bg-opacity-10 group-hover:bg-opacity-20 transition-all duration-300`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="flex justify-between items-center w-full">
        <h3 className="text-white text-sm font-medium">{title}</h3>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors duration-300" />
      </div>
    </div>
  </button>
);

export default function HomePage({ user, setAuthModalOpen }) {
  const navigate = useNavigate();
  const oddsRef = useRef(null);
  const { getCurrentMatches, isLoading, activeTab } = useMatchesData();
  
  // Add state for AI accuracy
  const [aiAccuracy, setAiAccuracy] = useState(null);
  
  // State for the league filter
  const [selectedLeague, setSelectedLeague] = useState(null);
  // State for mobile filter modal
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  // Get all matches for the league filter
  const allMatches = getCurrentMatches('all');
  
  // Navigation functions in correct scope
  const navigateToOddsPage = () => {
    navigate('/odds');
  };
  
  const navigateToStatsOverall = () => {
    navigate('/stats');
  };
  
  const navigateToStatsLeagues = () => {
    navigate('/stats', { state: { activeTab: 'leagues' } });
  };
  
  const navigateToStatsTeams = () => {
    navigate('/stats', { state: { activeTab: 'teams' } });
  };
  
  // Function to receive accuracy data from AccuracyComparison
  const handleAccuracyUpdate = (accuracy) => {
    setAiAccuracy(accuracy);
  };
  
  // Custom scroll handler for Today's Odds
  useEffect(() => {
    if (!oddsRef.current) return;
    const oddsBox = oddsRef.current;
    oddsBox.style.position = 'sticky';
    oddsBox.style.top = '1rem';
  }, []);
    
  return (
    <>
      <SEO 
        title="Football Predictions - We Know Better"
        description="Make and compare football predictions with AI. Join We Know Better to track your prediction accuracy and compete with fans worldwide."
        path="/"
      />
      
      <div className="max-w-6xl mx-auto px-2 mb-8">
        {/* Hero Section - Updated to use dynamic AI accuracy */}
        <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-r from-[#1a1f2b] to-[#2a3142] mb-6 shadow-xl">
  <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <path fill="#40c456" d="M39.9,-68.5C52.5,-62.1,64.1,-52.6,73.1,-40.2C82.1,-27.9,88.5,-14,88.7,0.1C88.9,14.1,82.9,28.2,73.7,39.7C64.4,51.1,51.8,59.8,38.4,64.8C25,69.8,12.5,71.1,-0.5,71.9C-13.5,72.7,-27.1,73.1,-38.3,68C-49.5,62.8,-58.5,52.2,-65.1,40C-71.7,27.8,-76,14,-77.9,-1.1C-79.8,-16.1,-79.2,-32.2,-71.7,-44.3C-64.2,-56.4,-49.8,-64.5,-36,-69.3C-22.3,-74.1,-11.1,-75.6,1.3,-78C13.8,-80.3,27.5,-74.8,39.9,-68.5Z" transform="translate(100 100)" />
    </svg>
  </div>
  
  {/* Different layout for mobile and desktop */}
  <div className="relative z-10 p-6 md:p-8">
    {/* Mobile layout - more compact with circle beside buttons */}
    <div className="md:hidden">
      <h1 className="text-2xl font-bold text-white mb-2">We Know Better Football Predictions</h1>
      <p className="text-gray-300 text-sm mb-4">
        Join thousands of football fans making smarter predictions with our cutting-edge AI analysis. Compare your accuracy with others and improve your betting strategy.
      </p>
      
      <div className="flex justify-between items-center mb-2">
        <div className="flex flex-col space-y-2 flex-1 mr-4">
          <button 
            onClick={() => navigateToOddsPage()}
            className="px-4 py-2 rounded-lg bg-[#40c456] text-white font-medium text-sm hover:bg-[#3ab04e] transition-colors duration-200 flex items-center justify-center"
          >
            <Calendar className="w-4 h-4 mr-2" />
            View Today's Odds
          </button>
          
          <button 
            onClick={() => navigate('/stats')}
            className="px-4 py-2 rounded-lg bg-[#242938] text-white font-medium text-sm hover:bg-[#2c3344] transition-colors duration-200 flex items-center justify-center"
          >
            <LineChart className="w-4 h-4 mr-2" />
            Explore Stats
          </button>
        </div>
        
        <div className="relative w-24 h-24 flex-shrink-0">
          <div className="absolute inset-0 bg-[#40c456] rounded-full opacity-10 animate-pulse"></div>
          <div className="absolute inset-1 bg-[#1a1f2b] rounded-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-[#40c456] text-2xl font-bold">
                {aiAccuracy ? `${aiAccuracy.toFixed(1)}%` : '...'}
              </div>
              <div className="text-gray-400 text-xs">AI Accuracy</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    {/* Desktop layout - remains unchanged */}
    <div className="hidden md:flex flex-col md:flex-row items-center">
      <div className="md:w-2/3 mb-6 md:mb-0 md:pr-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">We Know Better Football Predictions</h1>
        <p className="text-gray-300 text-sm md:text-base mb-4">
          Join thousands of football fans making smarter predictions with our cutting-edge AI analysis. Help us to Help YOU!
        </p>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => navigateToOddsPage()}
            className="px-4 py-2 rounded-lg bg-[#40c456] text-white font-medium text-sm hover:bg-[#3ab04e] transition-colors duration-200 flex items-center"
          >
            <Calendar className="w-4 h-4 mr-2" />
            View Today's Odds
          </button>
          
          <button 
            onClick={() => navigate('/stats')}
            className="px-4 py-2 rounded-lg bg-[#242938] text-white font-medium text-sm hover:bg-[#2c3344] transition-colors duration-200 flex items-center"
          >
            <LineChart className="w-4 h-4 mr-2" />
            Explore Stats
          </button>
        </div>
      </div>
      
      <div className="md:w-1/3 flex justify-center">
        <div className="relative w-32 h-32 md:w-40 md:h-40">
          <div className="absolute inset-0 bg-[#40c456] rounded-full opacity-10 animate-pulse"></div>
          <div className="absolute inset-2 bg-[#1a1f2b] rounded-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-[#40c456] text-3xl md:text-4xl font-bold">
                {aiAccuracy ? `${aiAccuracy.toFixed(1)}%` : '...'}
              </div>
              <div className="text-gray-400 text-xs md:text-sm">AI Accuracy</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

        {/* Desktop layout with feature shortcuts above main content */}
        <div className="hidden md:block">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <FeatureCard 
              icon={LineChart} 
              title="Performance Analytics" 
              onClick={navigateToStatsOverall}
              gradient="from-emerald-500 to-teal-600"
            />
            <FeatureCard 
              icon={Calendar} 
              title="Today's Odds" 
              onClick={navigateToOddsPage}
              gradient="from-blue-500 to-indigo-600"
            />
            <FeatureCard 
              icon={Award} 
              title="Top Clubs" 
              onClick={navigateToStatsTeams}
              gradient="from-amber-500 to-orange-600"
            />
            <FeatureCard 
              icon={Trophy} 
              title="Top Leagues" 
              onClick={navigateToStatsLeagues}
              gradient="from-purple-500 to-pink-600"
            />
          </div>
        </div>

        {/* Desktop row with perfect alignment */}
        <div className="hidden md:flex space-x-4">
          {/* Left sidebar - Top Performing Leagues */}
          <div className="mt-4">
            <div className="w-[280px] flex-shrink-0">
              <div className="bg-[#1a1f2b] rounded-lg overflow-hidden shadow-lg border border-gray-800">
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
                onAccuracyUpdate={handleAccuracyUpdate} // Pass the callback to receive accuracy updates
              />
            </div>
          </div>

          {/* Right sidebar - Blog Preview */}
          <div className="mt-4">
            <div className="w-[280px] flex-shrink-0">
              <div className="bg-[#1a1f2b] rounded-lg overflow-hidden shadow-lg border border-gray-800">
                <BlogPreview />
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile components */}
        <div className="md:hidden">
          {/* Mobile Hero Stats - Simplified version */}
          <div className="flex justify-center my-4">
  <div className="grid grid-cols-2 gap-3 w-full">
    <button
      onClick={() => navigateToStatsTeams()}
      className="bg-[#1a1f2b] p-4 rounded-lg shadow-md border border-gray-800 hover:border-emerald-500 group transition-all duration-200 w-full flex items-center justify-center"
    >
      <div className="flex items-center">
        <Award className="w-5 h-5 text-emerald-500 mr-3 group-hover:scale-110 transition-transform duration-200" />
        <div className="flex flex-col items-start">
          <div className="text-white text-2xl font-bold group-hover:text-emerald-400 transition-colors duration-200">500+</div>
          <div className="text-gray-400 text-xs group-hover:text-gray-300 transition-colors duration-200">Clubs Covered</div>
        </div>
      </div>
    </button>
    
    <button
      onClick={() => navigateToStatsLeagues()}
      className="bg-[#1a1f2b] p-4 rounded-lg shadow-md border border-gray-800 hover:border-blue-500 group transition-all duration-200 w-full flex items-center justify-center"
    >
      <div className="flex items-center">
        <Trophy className="w-5 h-5 text-blue-500 mr-3 group-hover:scale-110 transition-transform duration-200" />
        <div className="flex flex-col items-start">
          <div className="text-white text-2xl font-bold group-hover:text-blue-400 transition-colors duration-200">30+</div>
          <div className="text-gray-400 text-xs group-hover:text-gray-300 transition-colors duration-200">Leagues Covered</div>
        </div>
      </div>
    </button>
  </div>
</div>
          
          <AccuracyComparison 
            user={user} 
            onSignInClick={() => setAuthModalOpen(true)}
          />
          
          {/* Action buttons for mobile */}
          <div className="grid grid-cols-2 gap-3 my-4">
            <button
              onClick={() => navigate('/stats')}
              className="p-3 bg-[#242938] rounded-lg shadow-md border border-gray-800 flex items-center justify-center"
            >
              <LineChart className="w-4 h-4 text-emerald-400 mr-2" />
              <span className="text-white text-sm font-medium">Stats Hub</span>
            </button>
            <button
              onClick={() => navigateToOddsPage()}
              className="p-3 bg-[#242938] rounded-lg shadow-md border border-gray-800 flex items-center justify-center"
            >
              <Calendar className="w-4 h-4 text-blue-400 mr-2" />
              <span className="text-white text-sm font-medium">Betting Odds</span>
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
          {/* Overlay */}
          <div 
            className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isMobileFilterOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setIsMobileFilterOpen(false)}
          ></div>
          
          {/* Side menu panel - improved styling */}
          <div 
            className={`absolute top-0 left-0 bottom-0 w-4/5 max-w-xs bg-[#1a1f2b] overflow-auto transition-transform duration-300 shadow-xl ${isMobileFilterOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <div className="p-4 flex justify-between items-center border-b border-gray-700">
              <h3 className="text-white font-medium">Filter Leagues</h3>
              <button 
                onClick={() => setIsMobileFilterOpen(false)}
                className="text-gray-400 hover:text-white"
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
                  className="w-full py-2 pl-9 pr-4 bg-[#242938] border border-gray-700 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#40c456] focus:border-[#40c456]"
                />
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
              </div>
              
              <div className="space-y-2">
                {/* All Leagues option */}
                <button 
                  className={`w-full p-3 text-left rounded-md flex items-center ${!selectedLeague ? 'bg-[#40c456]/10 text-[#40c456] border border-[#40c456]/30' : 'text-white hover:bg-[#242938] border border-transparent'}`}
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
                      className={`w-full p-3 text-left rounded-md flex items-center ${selectedLeague === leagueKey ? 'bg-[#40c456]/10 text-[#40c456] border border-[#40c456]/30' : 'text-white hover:bg-[#242938] border border-transparent'}`}
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
            
        {/* Floating filter button for mobile - redesigned */}
        <div className="md:hidden fixed left-4 bottom-4 z-40">
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="w-12 h-12 rounded-full bg-[#40c456] text-white shadow-lg flex items-center justify-center hover:bg-[#3ab04e] transition-colors"
            aria-label="Filter Leagues"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
            
        {/* Desktop row for matches and filters - with better alignment */}
        <div className="hidden md:flex mt-6 space-x-4">
          {/* Left sidebar for league filter */}
          <div className="w-[280px] flex-shrink-0">
            <div className="sticky" style={{ top: '1rem' }}>
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