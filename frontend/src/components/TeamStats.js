// Modified TeamStats.js for inline match details
import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import TeamMatchDetails from './TeamMatchDetails';

const TeamStats = () => {
  const [teamStats, setTeamStats] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [activeTab, setActiveTab] = useState('top');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for managing match details
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [matchHistory, setMatchHistory] = useState(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchError, setMatchError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch both the standard team stats and all teams
        const [standardData, allTeamsData] = await Promise.all([
          api.fetchTeamStats(),
          api.fetchAllTeams()
        ]);
        
        setTeamStats(standardData);
        setAllTeams(allTeamsData?.teams || []);
        setError(null);
      } catch (err) {
        setError('Failed to load team statistics. Please try again later.');
        console.error('Error fetching team stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Helper to format date for better readability
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Filter teams based on search term
  const filteredTeams = useMemo(() => {
    if (!teamStats) return { topTeams: [], bottomTeams: [] };
    
    if (!searchTerm.trim()) {
      return {
        topTeams: teamStats.topTeams || [],
        bottomTeams: teamStats.bottomTeams || []
      };
    }
    
    // Use all teams for searching if available, otherwise fallback to top/bottom
    const teamsToSearch = allTeams.length > 0 
      ? allTeams 
      : [...(teamStats.topTeams || []), ...(teamStats.bottomTeams || [])];
    
    // Filter by name
    const filtered = teamsToSearch.filter(team => 
      team.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Sort by accuracy (descending)
    const sorted = [...filtered].sort((a, b) => b.accuracy - a.accuracy);
    
    return {
      topTeams: sorted,
      bottomTeams: [] // We don't need separate bottom teams when searching
    };
  }, [teamStats, searchTerm, allTeams]);

  // Handler for team selection to show match details
  const handleTeamClick = async (team) => {
    try {
      console.log('Team clicked:', team.id, team.name);
      
      // If the same team is clicked, just toggle the view
      if (selectedTeam && selectedTeam.id === team.id) {
        console.log('Same team clicked, toggling view');
        setSelectedTeam(null);
        setMatchHistory(null);
        return;
      }
      
      // Set new team and loading state
      setSelectedTeam(team);
      setLoadingMatches(true);
      setMatchError(null);
      setMatchHistory(null); // Clear previous data
      
      console.log(`Fetching match history for team ID: ${team.id}`);
      
      // Fetch match history with the explicit team ID and cache busting
      const timestamp = Date.now();
      const history = await api.fetchTeamMatchHistory(team.id, timestamp);
      console.log('Received match history for team ID ' + team.id + ':', history);
      
      // Check if the received data matches the requested team
      if (history?.team?.id !== team.id) {
        console.error(`Team ID mismatch! Requested: ${team.id}, Received: ${history?.team?.id}`);
        throw new Error('Server returned data for the wrong team');
      }
      
      setMatchHistory(history);
    } catch (err) {
      console.error(`Error fetching match history for team ${team.id}:`, err);
      setMatchError(`Failed to load match history for ${team.name}. Please try again later.`);
    } finally {
      setLoadingMatches(false);
    }
  };

  // Handler to close match details
  const handleCloseDetails = () => {
    setSelectedTeam(null);
    setMatchHistory(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (!teamStats) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
        <strong className="font-bold">No Data: </strong>
        <span className="block sm:inline">
          No team stats data found. This might be because no team stats have been generated yet or the stats file is empty.
          Please ask an administrator to generate team stats from the admin panel.
        </span>
      </div>
    );
  }
  
  // Debug info to help diagnose issues
  if (process.env.NODE_ENV === 'development') {
    console.log('Team Stats Data:', teamStats);
    console.log('All Teams Count:', allTeams.length);
  }

  const { topTeams, bottomTeams, lastUpdated, totalTeamsAnalyzed } = teamStats;
  
  // Determine which teams to display based on search and active tab
  const teamsToDisplay = searchTerm.trim() 
    ? filteredTeams.topTeams 
    : (activeTab === 'top' ? filteredTeams.topTeams : filteredTeams.bottomTeams);

  // Function to render match history for a team
  const renderMatchHistory = (team) => {
    if (selectedTeam?.id !== team.id) return null;

    if (loadingMatches) {
      return (
        <tr className="bg-white">
          <td colSpan="5" className="px-4 py-4">
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          </td>
        </tr>
      );
    }

    if (matchError) {
      return (
        <tr className="bg-white">
          <td colSpan="5" className="px-4 py-4">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{matchError}</span>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr className="bg-white">
        <td colSpan="5" className="p-0">
          <div className="border-t border-gray-200">
            <TeamMatchDetails 
              matchHistory={matchHistory} 
              onClose={handleCloseDetails}
              isInline={true}
            />
          </div>
        </td>
      </tr>
    );
  };

  // Function to render mobile match history for a team
  const renderMobileMatchHistory = (team) => {
    if (selectedTeam?.id !== team.id) return null;

    if (loadingMatches) {
      return (
        <div className="bg-white p-4 border-t border-gray-200">
          <div className="flex justify-center items-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        </div>
      );
    }

    if (matchError) {
      return (
        <div className="bg-white p-4 border-t border-gray-200">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{matchError}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white border-t border-gray-200">
        <TeamMatchDetails 
          matchHistory={matchHistory} 
          onClose={handleCloseDetails}
          isInline={true}
        />
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-3 py-3 sm:px-4 sm:py-5 border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-1">
            Team Prediction Performance
          </h3>
          <p className="w-full sm:w-auto mt-1 max-w-2xl text-xs sm:text-sm text-gray-500">
            Last updated: {formatDate(lastUpdated)}
          </p>
        </div>
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">
          Analysis based on {totalTeamsAnalyzed} teams with 5+ matches.
        </p>
      </div>

      {/* Search input */}
      <div className="px-3 py-3 sm:px-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for a team..."
            className="w-full px-4 py-2 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
          />
          <div className="absolute left-3 top-2.5 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {!searchTerm && (
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('top')}
              className={`${
                activeTab === 'top'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 sm:py-4 px-3 sm:px-6 border-b-2 font-medium text-xs sm:text-sm`}
            >
              Top 20 Teams
            </button>
            <button
              onClick={() => setActiveTab('bottom')}
              className={`${
                activeTab === 'bottom'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 sm:py-4 px-3 sm:px-6 border-b-2 font-medium text-xs sm:text-sm`}
            >
              Bottom 20 Teams
            </button>
          </nav>
        </div>
      )}

      {/* Results message */}
      {searchTerm && (
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs sm:text-sm text-gray-600">
          {teamsToDisplay.length === 0 
            ? 'No teams found matching your search'
            : `Found ${teamsToDisplay.length} ${teamsToDisplay.length === 1 ? 'team' : 'teams'} matching "${searchTerm}"`}
        </div>
      )}

      {/* Mobile view for small screens */}
      <div className="block sm:hidden">
        <div className="divide-y divide-gray-200">
          {teamsToDisplay.length > 0 ? (
            teamsToDisplay.map((team, index) => (
              <React.Fragment key={team.id}>
                <div 
                  className={`p-3 ${selectedTeam?.id === team.id ? 'bg-green-50' : ''} cursor-pointer hover:bg-gray-50`}
                  onClick={() => handleTeamClick(team)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className="text-sm font-bold w-6">
                        {searchTerm ? index + 1 : activeTab === 'top' ? index + 1 : totalTeamsAnalyzed - index}
                      </span>
                      {team.crest && (
                        <div className="flex-shrink-0 h-6 w-6 mr-2">
                          <img className="h-6 w-6" src={team.crest} alt={`${team.name} logo`} />
                        </div>
                      )}
                      <div className="text-sm font-medium truncate max-w-[120px]">{team.name}</div>
                    </div>
                    <div className="text-xs font-medium text-gray-500">
                      {team.correctPredictions}/{team.totalMatches}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="flex-grow">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            searchTerm ? 
                              (team.accuracy > 50 ? 'bg-green-600' : 'bg-red-600') :
                              (activeTab === 'top' ? 'bg-green-600' : 'bg-red-600')
                          }`}
                          style={{ width: `${team.accuracy}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="ml-2 text-xs text-gray-900">{team.accuracy.toFixed(1)}%</div>
                  </div>
                </div>
                {/* Render match history inline for this team */}
                {renderMobileMatchHistory(team)}
              </React.Fragment>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              No teams found matching your search
            </div>
          )}
        </div>
      </div>

      {/* Desktop view for larger screens */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Rank
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Team
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Prediction Accuracy
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Correct / Total
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teamsToDisplay.length > 0 ? (
              teamsToDisplay.map((team, index) => (
                <React.Fragment key={team.id}>
                  <tr 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${selectedTeam?.id === team.id ? 'bg-green-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {searchTerm ? index + 1 : activeTab === 'top' ? index + 1 : totalTeamsAnalyzed - index}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {team.crest && (
                          <div className="flex-shrink-0 h-8 w-8 mr-3">
                            <img className="h-8 w-8" src={team.crest} alt={`${team.name} logo`} />
                          </div>
                        )}
                        <div className="text-sm font-medium text-gray-900">{team.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${
                            searchTerm ? 
                              (team.accuracy > 50 ? 'bg-green-600' : 'bg-red-600') :
                              (activeTab === 'top' ? 'bg-green-600' : 'bg-red-600')
                          }`}
                          style={{ width: `${team.accuracy}%` }}
                        ></div>
                      </div>
                      <div className="text-sm text-gray-900 mt-1">{team.accuracy.toFixed(1)}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {team.correctPredictions} / {team.totalMatches}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleTeamClick(team)}
                        className="text-green-600 hover:text-green-900 focus:outline-none"
                      >
                        {selectedTeam?.id === team.id ? 'Hide Details' : 'View Matches'}
                      </button>
                    </td>
                  </tr>
                  {/* Render match history inline for this team */}
                  {renderMatchHistory(team)}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                  No teams found matching your search
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamStats;