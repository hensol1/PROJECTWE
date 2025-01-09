import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PiRankingFill } from "react-icons/pi";
import api from '../api';

// Website brand colors
const websiteColors = {
  primary: '#2ECC40', // Bright green
  primaryLight: '#4ddd5e', // Lighter shade for hover
  primaryTransparent: 'rgba(46, 204, 64, 0.1)' // Transparent green for table highlights
};

const StandingsModal = ({ 
  isOpen, 
  onClose, 
  standings, 
  isLoading, 
  error, 
  leagueName, 
  leagueFlag, 
  homeTeam, 
  awayTeam 
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 99999 }}>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-[500px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10">
          <div className="relative overflow-hidden rounded-t-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 via-white to-indigo-50 opacity-90" />
            <div className="relative flex items-center justify-between px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                {leagueFlag && (
                  <img 
                    src={leagueFlag} 
                    alt=""
                    className="w-5 h-3.5 object-cover rounded"
                  />
                )}
                <span className="font-semibold text-gray-900">{leagueName}</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-1">
          {isLoading && (
            <div className="flex justify-center py-8">
              <div 
                className="animate-spin rounded-full h-8 w-8 border-b-2"
                style={{ borderColor: websiteColors.primary }}
              ></div>
            </div>
          )}

          {error && (
            <div className="text-red-500 text-center py-4">
              {error}
            </div>
          )}

          {standings && (
            <table className="w-full text-sm">
              <thead className="text-xs sticky top-0 bg-gray-50 shadow-sm">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Team</th>
                  <th className="px-2 py-2 text-center">P</th>
                  <th className="px-2 py-2 text-center">W</th>
                  <th className="px-2 py-2 text-center">D</th>
                  <th className="px-2 py-2 text-center">L</th>
                  <th className="px-2 py-2 text-center">GD</th>
                  <th className="px-3 py-2 text-center">Pts</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {standings.map((team) => (
                  <tr 
                    key={team.team.id} 
                    style={{
                      backgroundColor: (team.team.name === homeTeam?.name || team.team.name === awayTeam?.name)
                        ? websiteColors.primaryTransparent
                        : 'transparent',
                    }}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-2">{team.rank}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <img 
                          src={team.team.logo} 
                          alt={team.team.name} 
                          className="w-4 h-4"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/fallback-team-logo.png';
                          }}
                        />
                        <span className={`truncate ${
                          team.team.name === homeTeam?.name || team.team.name === awayTeam?.name 
                            ? 'font-semibold' 
                            : ''
                        }`}>
                          {team.team.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center">{team.all.played}</td>
                    <td className="px-2 py-2 text-center">{team.all.win}</td>
                    <td className="px-2 py-2 text-center">{team.all.draw}</td>
                    <td className="px-2 py-2 text-center">{team.all.lose}</td>
                    <td className="px-2 py-2 text-center">{team.goalsDiff}</td>
                    <td className="px-3 py-2 text-center font-semibold">{team.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

const StandingsButton = ({ leagueId, season, homeTeam, awayTeam, leagueName, leagueFlag }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [standings, setStandings] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStandings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getStandings(leagueId, season);
      if (response.data.standings) {
        setStandings(response.data.standings);
      } else {
        setError('No standings data available');
      }
    } catch (err) {
      setError('Failed to fetch standings');
      console.error('Error fetching standings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    setIsOpen(true);
    if (!standings && !error) {
      fetchStandings();
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        title="View League Standings"
      >
        <PiRankingFill 
          className="w-5 h-5" 
          style={{ color: websiteColors.primary }}
        />
      </button>

      <StandingsModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        standings={standings}
        isLoading={isLoading}
        error={error}
        leagueName={leagueName}
        leagueFlag={leagueFlag}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
      />
    </>
  );
};

export default StandingsButton;