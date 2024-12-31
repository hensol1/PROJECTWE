import React from 'react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader } from '../components/ui/dialog';
import { 
  CircleOff, 
  ArrowRightLeft, 
  Clock, 
  X,
  Flag,
  Users
} from 'lucide-react';
import { GiSoccerBall } from "react-icons/gi";
import { TbCardsFilled } from "react-icons/tb";
import { cn } from "../lib/utils";
import api from '../api';
import MatchLineups from './MatchLineups';

const MatchEvents = ({ matchId, isOpen, onClose, homeTeam, awayTeam, match, competition }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('events');

  useEffect(() => {
    const fetchEvents = async () => {
      if (!isOpen) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.fetchMatchEvents(matchId);
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
  }, [matchId, isOpen, match?.status]);

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
            {/* Home Team */}
            <div className="flex items-center gap-1">
              <img 
                src={homeTeam?.crest} 
                alt={homeTeam?.name} 
                className="w-4 h-4 object-contain"
              />
              <span className="text-[11px]">{homeTeam?.name}</span>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center -my-1">
              <span className="text-[10px] text-gray-500 leading-none">
                {match?.status === 'FINISHED' ? 'FT' :
                match?.status === 'HALFTIME' ? 'HT' :
                match?.status === 'IN_PLAY' ? `${match.minute}'` : ''}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold">{match?.score?.fullTime?.home || 0}</span>
                <span className="text-xs font-bold">-</span>
                <span className="text-xs font-bold">{match?.score?.fullTime?.away || 0}</span>
              </div>
            </div>

            {/* Away Team */}
            <div className="flex items-center gap-1">
              <span className="text-[11px]">{awayTeam?.name}</span>
              <img 
                src={awayTeam?.crest} 
                alt={awayTeam?.name} 
                className="w-4 h-4 object-contain"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('events')}
              className={cn(
                "flex-1 px-4 py-2 text-xs font-medium focus:outline-none transition-colors",
                activeTab === 'events'
                  ? "border-b-2 border-indigo-500 text-indigo-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                Events
              </div>
            </button>
            <button
              onClick={() => setActiveTab('lineups')}
              className={cn(
                "flex-1 px-4 py-2 text-xs font-medium focus:outline-none transition-colors",
                activeTab === 'lineups'
                  ? "border-b-2 border-indigo-500 text-indigo-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="w-4 h-4" />
                Lineups
              </div>
            </button>
          </div>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto">
          {activeTab === 'events' ? (
            loading ? (
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
                        "flex items-center gap-3 py-1.5 hover:bg-gradient-to-r",
                        isHomeTeam 
                          ? "justify-start hover:from-green-50 hover:to-transparent" 
                          : "flex-row-reverse hover:from-transparent hover:to-green-50",
                        "border-b border-gray-100"
                      )}
                    >
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-0.5 rounded-full",
                        isHomeTeam ? "bg-green-50" : "bg-blue-50"
                      )}>
                        <span className="text-xs font-semibold text-gray-600">
                          {event.time?.elapsed}'
                          {event.time?.extra && `+${event.time.extra}`}
                        </span>
                        {getEventIcon(event.type, event.detail)}
                      </div>
                      
                      <div className={cn(
                        "flex flex-col gap-0.5",
                        isHomeTeam ? "items-start" : "items-end"
                      )}>
                        <span className="text-sm font-medium">{event.player?.name}</span>
                        {(event.type?.toUpperCase() === 'SUBSTITUTION' || event.type?.toUpperCase() === 'SUBST') ? (
                          <div className={cn(
                            "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                            "bg-gray-100 text-gray-600"
                          )}>
                            <span>Out: {event.assist?.name}</span>
                          </div>
                        ) : (
                          event.assist?.name && !event.detail?.includes('Missed Penalty') && (
                            <div className="text-xs text-emerald-600">
                              Assist: {event.assist.name}
                            </div>
                          )
                        )}
                        {event.detail && event.detail !== 'Normal Goal' && (
                          <span className="text-xs text-gray-400">{event.detail}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <MatchLineups
              matchId={matchId}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              match={match}
              competition={competition}
              isTab={true}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MatchEvents;