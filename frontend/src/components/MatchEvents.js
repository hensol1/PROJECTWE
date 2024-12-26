import React from 'react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { 
  CircleOff, 
  ArrowRightLeft, 
  Clock, 
  X,
  Flag
} from 'lucide-react';
import { GiSoccerBall } from "react-icons/gi";
import { TbCardsFilled } from "react-icons/tb";
import { cn } from "../lib/utils";
import api from '../api';

const MatchEvents = ({ matchId, isOpen, onClose, homeTeam, awayTeam, match }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!isOpen) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.fetchMatchEvents(matchId);
        console.log('Events response:', response.data);
        setEvents(response.data);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to load match events');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchEvents();

    // Set up 5-minute interval if match is live and modal is open
    let intervalId;
    if (isOpen && match?.status === 'IN_PLAY') {
      intervalId = setInterval(fetchEvents, 5 * 60 * 1000); // 5 minutes
    }

    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [matchId, isOpen, match?.status]); // Added match?.status to dependencies

  const getEventIcon = (type, detail) => {
    switch (type?.toUpperCase()) {
      case 'GOAL':
      case 'NORMAL GOAL':
        if (detail?.includes('Missed Penalty')) {
          return <GiSoccerBall className="w-4 h-4 text-red-600" />;
        }
        return <GiSoccerBall className="w-4 h-4 text-green-600" />;
      case 'SUBSTITUTION':
      case 'SUBST':
        return <ArrowRightLeft className="w-4 h-4 text-blue-600" />;
      case 'YELLOW CARD':
      case 'CARD':
        if (detail?.includes('Red Card')) {
          return <TbCardsFilled className="w-4 h-4 text-red-600" />;
        }
        return <TbCardsFilled className="w-4 h-4 text-yellow-500" />;
      case 'RED CARD':
        return <TbCardsFilled className="w-4 h-4 text-red-600" />;
      case 'VAR':
        return <Flag className="w-4 h-4 text-purple-600" />;
      case 'PENALTY':
        if (detail?.includes('Missed') || detail?.includes('Saved')) {
          return <GiSoccerBall className="w-4 h-4 text-red-600" />;
        }
        return <GiSoccerBall className="w-4 h-4 text-green-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="border-b pb-2">
          <div className="h-6 bg-gradient-to-b from-gray-50 to-white"></div>
          <div className="flex items-center justify-between w-full px-4 pb-2">
            {/* Home Team */}
            <div className="flex items-center gap-2">
              <img 
                src={homeTeam?.crest} 
                alt={homeTeam?.name} 
                className="w-6 h-6 object-contain"
              />
              <span className="text-xs">{homeTeam?.name}</span>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500">
                {match?.status === 'FINISHED' ? 'FT' :
                 match?.status === 'HALFTIME' ? 'HT' :
                 match?.status === 'IN_PLAY' ? `${match.minute}'` : ''}
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-base font-bold">
                  {match?.score?.fullTime?.home || 0}
                </span>
                <span className="text-base font-bold">-</span>
                <span className="text-base font-bold">
                  {match?.score?.fullTime?.away || 0}
                </span>
              </div>
            </div>

            {/* Away Team */}
            <div className="flex items-center gap-2">
              <span className="text-xs">{awayTeam?.name}</span>
              <img 
                src={awayTeam?.crest} 
                alt={awayTeam?.name} 
                className="w-6 h-6 object-contain"
              />
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : error ? (
            <div className="text-center text-red-600 p-4">{error}</div>
          ) : events.length === 0 ? (
            <div className="text-center text-gray-500 p-4">
              No events available for this match
            </div>
          ) : (
            <div className="space-y-1 py-2">
              {events.map(event => {
                const isHomeTeam = event.team?.name === homeTeam?.name;
                return (
                  <div 
                    key={`${event.time?.elapsed}-${event.type}-${event.player?.id}`}
                    className={cn(
                      "flex items-center gap-2 py-1 px-4",
                      isHomeTeam ? "justify-start" : "flex-row-reverse"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium">
                        {event.time?.elapsed}'
                        {event.time?.extra && `+${event.time.extra}`}
                      </span>
                      {getEventIcon(event.type, event.detail)}
                    </div>
                    
                    <div className={cn(
                      "flex flex-col",
                      isHomeTeam ? "items-start" : "items-end"
                    )}>
                      <span className="text-sm">{event.player?.name || 'Unknown Player'}</span>
                      {event.type?.toUpperCase() === 'SUBSTITUTION' || event.type?.toUpperCase() === 'SUBST' ? (
                        <span className="text-xs text-gray-500">
                          Out: {event.assist?.name}
                        </span>
                      ) : (
                        event.assist?.name && !event.detail?.includes('Missed Penalty') && (
                          <span className="text-xs text-gray-500">
                            Assist: {event.assist.name}
                          </span>
                        )
                      )}
                      {event.detail && (
                        <span className="text-xs text-gray-500">{event.detail}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MatchEvents;