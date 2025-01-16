import React from 'react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
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

    fetchEvents();

    let intervalId;
    if (isOpen && match?.status === 'IN_PLAY') {
      intervalId = setInterval(fetchEvents, 5 * 60 * 1000);
    }

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
          return <GiSoccerBall className="w-4 h-4 text-red-500" />;
        }
        return <GiSoccerBall className="w-4 h-4 text-emerald-500" />;
      case 'SUBSTITUTION':
      case 'SUBST':
        return <ArrowRightLeft className="w-4 h-4 text-blue-400" />;
      case 'YELLOW CARD':
      case 'CARD':
        if (detail?.includes('Red Card')) {
          return <TbCardsFilled className="w-4 h-4 text-red-500" />;
        }
        return <TbCardsFilled className="w-4 h-4 text-yellow-500" />;
      case 'RED CARD':
        return <TbCardsFilled className="w-4 h-4 text-red-500" />;
      case 'VAR':
        return <Flag className="w-4 h-4 text-purple-400" />;
      case 'PENALTY':
        if (detail?.includes('Missed') || detail?.includes('Saved')) {
          return <GiSoccerBall className="w-4 h-4 text-red-500" />;
        }
        return <GiSoccerBall className="w-4 h-4 text-emerald-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const renderContent = () => {
    if (activeTab === 'events') {
      if (loading) {
        return (
          <div className="flex justify-center p-8">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        );
      }

      if (error) {
        return <div className="text-center text-red-400 p-6">{error}</div>;
      }

      if (events.length === 0) {
        return (
          <div className="text-center text-gray-400 p-6">
            No events available for this match
          </div>
        );
      }

      return (
        <div className="divide-y divide-gray-800">
          {events.map((event) => {
            const isHomeTeam = event.team?.name === homeTeam?.name;
            return (
              <div 
                key={`${event.time?.elapsed}-${event.type}-${event.player?.id}`}
                className={cn(
                  "flex items-center gap-3 py-3 px-4 hover:bg-gray-800/50 transition-colors",
                  isHomeTeam ? "flex-row" : "flex-row-reverse"
                )}
              >
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1 rounded-full",
                  isHomeTeam ? "bg-green-500/10" : "bg-blue-500/10"
                )}>
                  <span className="text-xs font-medium text-gray-300">
                    {event.time?.elapsed}'
                    {event.time?.extra && `+${event.time.extra}`}
                  </span>
                  {getEventIcon(event.type, event.detail)}
                </div>
                
                <div className={cn(
                  "flex flex-col gap-0.5",
                  isHomeTeam ? "items-start" : "items-end"
                )}>
                  <span className="text-sm font-medium group-hover:text-emerald-400 transition-colors">
                    {event.player?.name}
                  </span>
                  {(event.type?.toUpperCase() === 'SUBSTITUTION' || event.type?.toUpperCase() === 'SUBST') ? (
                    <div className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                      Out: {event.assist?.name}
                    </div>
                  ) : (
                    event.assist?.name && !event.detail?.includes('Missed Penalty') && (
                      <div className="text-xs text-emerald-400">
                        Assist: {event.assist.name}
                      </div>
                    )
                  )}
                  {event.detail && event.detail !== 'Normal Goal' && (
                    <span className="text-xs text-gray-500">{event.detail}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    } else {
      console.log('Rendering MatchLineups tab with props:', {
        matchId,
        homeTeam,
        awayTeam,
        match,
        competition,
        isTab: true
      });

      return (
        <MatchLineups
          matchId={matchId}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          match={match}
          competition={competition}
          isTab={true}
        />
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 gap-0 bg-gray-900 text-white">
        <div className="relative border-b border-gray-800">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1 hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
          
          {/* Competition name */}
          <div className="text-center py-3">
            <span className="text-sm text-gray-400">{competition?.name}</span>
          </div>

          {/* Match details */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-800/50">
            <div className="flex items-center gap-3">
              <img 
                src={homeTeam?.crest} 
                alt={homeTeam?.name} 
                className="w-8 h-8 object-contain"
              />
              <span className="text-sm font-medium">{homeTeam?.name}</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-xs text-emerald-400 mb-1">
                {match?.status === 'FINISHED' ? 'FT' :
                match?.status === 'HALFTIME' ? 'HT' :
                match?.status === 'IN_PLAY' ? `${match.minute}'` : ''}
              </span>
              <div className="flex items-center gap-3 text-xl font-bold">
                <span>{match?.score?.fullTime?.home || 0}</span>
                <span className="text-gray-500">-</span>
                <span>{match?.score?.fullTime?.away || 0}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{awayTeam?.name}</span>
              <img 
                src={awayTeam?.crest} 
                alt={awayTeam?.name} 
                className="w-8 h-8 object-contain"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            {['events', 'lineups'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === tab
                    ? "text-emerald-400 border-b-2 border-emerald-400"
                    : "text-gray-400 hover:text-gray-300"
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  {tab === 'events' ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <Users className="w-4 h-4" />
                  )}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MatchEvents;