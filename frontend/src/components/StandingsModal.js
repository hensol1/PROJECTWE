import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../api';

const StandingsModal = ({ league, onClose }) => {
  const [standings, setStandings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Get table names based on league ID and other data
  const getTableName = (leagueId, tableIndex, groupName) => {
    // For special leagues with known playoff structure
    if (leagueId === 383) { // Israeli league
      return tableIndex === 0 ? "Championship Playoff" : "Relegation Playoff";
    }
    
    // For CONMEBOL Libertadores and other tournaments with group stages
    if ([13, 2, 3].includes(leagueId)) { // Libertadores, Champions League, Europa League
      return groupName || `Group ${String.fromCharCode(65 + tableIndex)}`; // Group A, B, C...
    }
    
    // For leagues with other playoff structures
    if (tableIndex === 0) {
      return "Main Table";
    } else {
      return `Table ${tableIndex + 1}`;
    }
  };

  // Determine appropriate season based on league and date
  const getSeasonForLeague = (leagueId) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Array of leagues that run in a calendar year format (Apr-Nov)
    // Scandinavian leagues and others with similar schedules
    const calendarYearLeagues = [103, 113, 188, 119, 135, 327, 169, 13, 11];
    //103, // Eliteserien (Norway)
    //113, // Allsvenskan (Sweden)
    //188, // Superliga (Denmark)
    //119, // Veikkausliiga (Finland)
    //135, // Meistriliiga (Estonia)
    //327, // Erovnuli Liga (Georgia)
    //169  // China Super League (China)
    //13   // Libertadores (South America)
    //11   // Copa Sudamericana (South America)
    
    if (calendarYearLeagues.includes(leagueId)) {
      // For calendar year leagues (like Norway, Sweden, etc.)
      return currentMonth < 4 ? currentYear - 1 : currentYear;
    } else {
      // For traditional European season format (Aug-May)
      return currentMonth < 8 ? currentYear - 1 : currentYear;
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        // Use the customized season logic based on league ID
        const season = getSeasonForLeague(league.id);
        const response = await api.getStandings(league.id, season);
        setStandings(response.data);
      } catch (error) {
        console.error('Error fetching standings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, [league.id]);

  // Render a single standings table
  const renderStandingsTable = (tableData, tableIndex) => {
    // If the table contains a group property, use it for the name
    const groupName = tableData[0]?.group ? tableData[0].group : null;
    const tableName = getTableName(league.id, tableIndex, groupName);
    
    return (
      <div key={tableIndex} className="mb-6 last:mb-0">
        {/* Table Name/Header */}
        <div className="bg-gray-800 text-white px-3 py-2 text-sm font-medium rounded-t-md">
          {tableName}
        </div>
        
        {/* Table itself */}
        <table className="w-full text-xs md:text-sm text-white">
          <thead className="text-[10px] md:text-xs text-gray-400 uppercase">
            <tr className="border-b border-gray-700">
              <th className="px-1 md:px-4 py-2 md:py-3 text-left w-6">#</th>
              <th className="px-1 md:px-4 py-2 md:py-3 text-left">Team</th>
              <th className="px-1 md:px-2 py-2 md:py-3 text-center">MP</th>
              <th className="px-1 md:px-2 py-2 md:py-3 text-center">W</th>
              <th className="px-1 md:px-2 py-2 md:py-3 text-center">D</th>
              <th className="px-1 md:px-2 py-2 md:py-3 text-center">L</th>
              {!isMobile && (
                <th className="px-2 py-3 text-center">G</th>
              )}
              <th className="px-1 md:px-2 py-2 md:py-3 text-center">+/-</th>
              <th className="px-1 md:px-2 py-2 md:py-3 text-center">P</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row) => (
              <tr key={row.team.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                <td className="px-1 md:px-4 py-1 md:py-3">{row.rank}</td>
                <td className="px-1 md:px-4 py-1 md:py-3">
                  <div className="flex items-center gap-1 md:gap-2">
                    <img 
                      src={row.team.logo} 
                      alt={row.team.name}
                      className="w-4 h-4 md:w-5 md:h-5 object-contain"
                    />
                    <span className="truncate max-w-[80px] md:max-w-full">{row.team.name}</span>
                  </div>
                </td>
                <td className="px-1 md:px-2 py-1 md:py-3 text-center">{row.all.played}</td>
                <td className="px-1 md:px-2 py-1 md:py-3 text-center">{row.all.win}</td>
                <td className="px-1 md:px-2 py-1 md:py-3 text-center">{row.all.draw}</td>
                <td className="px-1 md:px-2 py-1 md:py-3 text-center">{row.all.lose}</td>
                {!isMobile && (
                  <td className="px-2 py-3 text-center">{`${row.all.goals.for}:${row.all.goals.against}`}</td>
                )}
                <td className="px-1 md:px-2 py-1 md:py-3 text-center">{row.goalsDiff}</td>
                <td className="px-1 md:px-2 py-1 md:py-3 text-center font-bold">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
      <div className="bg-[#1a1f2b] w-full max-w-2xl rounded-lg overflow-hidden max-h-[90vh] mx-2">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 md:px-4 md:py-3 border-b border-gray-700">
          <div className="flex items-center gap-2 md:gap-3">
            {league.country?.flag && (
              <img 
                src={league.country.flag} 
                alt={league.country.name}
                className="w-4 h-3 md:w-6 md:h-4 object-cover rounded-sm"
              />
            )}
            {league.emblem && (
              <img 
                src={league.emblem} 
                alt={league.name}
                className="w-5 h-5 md:w-6 md:h-6 object-contain"
              />
            )}
            <span className="text-white text-sm md:text-base font-medium">{league.name}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={isMobile ? 18 : 20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-auto max-h-[calc(90vh-60px)] p-3">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
          ) : standings?.standings ? (
            // Check if standings is a nested array (multiple tables)
            Array.isArray(standings.standings[0]) ? (
              // Map through all the tables
              standings.standings.map((tableData, index) => (
                renderStandingsTable(tableData, index)
              ))
            ) : (
              // Fallback for single table format
              renderStandingsTable(standings.standings, 0)
            )
          ) : (
            <div className="text-center text-gray-400 py-8">
              No standings available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StandingsModal;
