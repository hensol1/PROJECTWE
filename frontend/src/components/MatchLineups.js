import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader } from '../components/ui/dialog';
import { X, Users } from 'lucide-react';
import { cn } from "../lib/utils";
import api from '../api';

const MatchLineups = ({ matchId, isOpen, onClose, homeTeam, awayTeam, match, competition, isTab = false }) => {
  const [lineups, setLineups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLineups = async () => {
      if (!isOpen && !isTab) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.fetchMatchLineups(matchId);
        if (response.data && Array.isArray(response.data)) {
          setLineups(response.data);
        } else {
          setLineups([]);
        }
      } catch (err) {
        console.error('Error fetching lineups:', err);
        setError('Failed to load match lineups');
        setLineups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLineups();
  }, [matchId, isOpen, isTab]);

  const LineupSection = ({ teamLineup, isHome }) => {
    if (!teamLineup || !teamLineup.team) return null;

    return (
      <div className={cn(
        "flex-1 px-3",
        isHome ? "border-r border-gray-200" : ""
      )}>
        {/* Formation & Coach */}
        <div className="text-center mb-3">
          <div className="text-sm font-semibold">{teamLineup.formation}</div>
          <div className="text-xs text-gray-600">{teamLineup.coach?.name}</div>
        </div>

        {/* Starting XI */}
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 mb-2">Starting XI</div>
          <div className="space-y-1">
            {teamLineup.startXI?.map((player) => (
              <div key={player.id || `player-${player.name}`} className="flex items-center text-xs">
                <span className="w-6 text-gray-500">{player.number}</span>
                <span>{player.name}</span>
                <span className="ml-auto text-gray-500">{player.pos}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Substitutes */}
        <div>
          <div className="text-xs font-medium text-gray-500 mb-2">Substitutes</div>
          <div className="space-y-1">
            {teamLineup.substitutes?.map((player) => (
              <div key={player.id || `sub-${player.name}`} className="flex items-center text-xs">
                <span className="w-6 text-gray-500">{player.number}</span>
                <span>{player.name}</span>
                <span className="ml-auto text-gray-500">{player.pos}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const LineupsContent = () => (
    <>
      {loading ? (
        <div className="flex justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : error ? (
        <div className="text-center text-red-600 p-4">{error}</div>
      ) : lineups.length === 0 ? (
        <div className="text-center p-4">
          <p className="text-gray-600 font-medium mb-1">No lineups available</p>
          <p className="text-sm text-gray-500">Team lineups are typically announced around 1 hour before kickoff</p>
        </div>
      ) : (
        <div className="flex divide-x">
          {lineups.map((teamLineup, index) => (
            <LineupSection 
              key={teamLineup.team?.id || `team-${index}`}
              teamLineup={teamLineup}
              isHome={index === 0}
            />
          ))}
        </div>
      )}
    </>
  );

  // If it's used as a tab, just return the content
  if (isTab) {
    return <LineupsContent />;
  }

  // Otherwise, return the full dialog
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="border-b">
          <div className="h-2 bg-gradient-to-b from-gray-50 to-white"></div>
          <div className="relative flex justify-center items-center px-3 py-1">
            <span className="text-xs">{competition?.name}</span>
            <button
              onClick={onClose}
              className="absolute right-1 top-1 p-0.5 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center justify-between w-full px-3 py-1">
            <div className="flex items-center gap-1">
              <img 
                src={homeTeam?.crest} 
                alt={homeTeam?.name} 
                className="w-4 h-4 object-contain"
              />
              <span className="text-[11px]">{homeTeam?.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px]">{awayTeam?.name}</span>
              <img 
                src={awayTeam?.crest} 
                alt={awayTeam?.name} 
                className="w-4 h-4 object-contain"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
          <LineupsContent />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MatchLineups;