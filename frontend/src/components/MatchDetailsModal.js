import React, { useState, useEffect } from 'react';
import { X, Tv } from 'lucide-react';
import api from '../api';
import TeamPredictionHistory from './TeamPredictionHistory';

const MatchDetailsModal = ({ match, onClose }) => {
  const [activeTab, setActiveTab] = useState('predictions'); // Changed default to predictions
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatchDetails = async () => {
      setLoading(true);
      try {
        // Only fetch events since we're replacing lineups with prediction history
        const eventsResponse = await api.fetchMatchEvents(match.id);
        setEvents(eventsResponse.data || []);
      } catch (error) {
        console.error('Error fetching match details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchDetails();
  }, [match.id]);

  const formatEventTime = (time) => {
    if (!time?.elapsed) return '';
    return `${time.elapsed}'${time.extra ? `+${time.extra}` : ''}`;
  };
  
  // Format match date/time for display when match hasn't started
  const formatMatchTime = (utcDateString) => {
    if (!utcDateString) return 'TBD';
    
    const matchDate = new Date(utcDateString);
    
    // Format time as HH:MM
    const hours = matchDate.getHours().toString().padStart(2, '0');
    const minutes = matchDate.getMinutes().toString().padStart(2, '0');
    
    return `${hours}:${minutes}`;
  };
  
  const formatEventDetails = (event) => {
    // Special case for Missed Penalty
    if (event.type === 'Goal' && event.detail === 'Missed Penalty') {
      return (
        <div>
          <span>{event.player?.name}</span>
          <span className="text-red-400 ml-2">(Missed Penalty)</span>
        </div>
      );
    }
    
    // For substitutions
    if (event.type === 'subst') {
      return (
        <div>
          <span className="text-emerald-400">{event.player?.name}</span>
          <span className="text-gray-400"> in • </span>
          <span className="text-red-400">{event.assist?.name}</span>
          <span className="text-gray-400"> out</span>
        </div>
      );
    }
    
    // For VAR events
    if (event.type?.toLowerCase() === 'var') {
      return (
        <div>
          <span>{event.player?.name || 'VAR Decision'}</span>
          <span className="text-blue-400 block text-xs"> {event.detail}</span>
        </div>
      );
    }
    
    // For all other events
    return (
      <div>
        <span>{event.player?.name}</span>
        {event.assist?.name && event.player?.name !== event.assist?.name && (
          <span className="text-gray-400"> (assist: {event.assist.name})</span>
        )}
      </div>
    );
  };
              
  const getEventIcon = (type, detail) => {
    // Special case for Missed Penalty
    if (type?.toLowerCase() === 'goal' && detail === 'Missed Penalty') {
      return '❌⚽'; // Ball with X symbol to indicate missed penalty
    }
    
    switch (type?.toLowerCase()) {
      case 'goal':
        return '⚽';
      case 'card':
        return detail === 'Yellow Card' ? '🟨' : '🟥';
      case 'subst':
        return '↔️';
      case 'var':
        return <Tv size={16} className="text-blue-400" />;
      default:
        // Check if the detail contains VAR-related text
        if (detail?.toLowerCase()?.includes('var') || 
            detail?.toLowerCase()?.includes('video assistant referee')) {
          return <Tv size={16} className="text-blue-400" />;
        }
        return null;
    }
  };            
  
  // Determine if the match has not started yet
  const matchNotStarted = match.status === 'SCHEDULED' || match.status === 'TIMED';

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
      <div className="bg-[#1a1f2b] w-full max-w-2xl rounded-lg overflow-hidden max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="relative flex flex-col bg-[#1a1f2b] border-b border-gray-700/50">
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-white z-10"
          >
            <X size={16} className="sm:w-5 sm:h-5" />
          </button>

          <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <img src={match.homeTeam.crest} alt="" className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="text-white text-xs sm:text-sm">{match.homeTeam.name}</span>
            </div>
            <div className="flex flex-col items-center">
              {matchNotStarted ? (
                // Show match time if match hasn't started yet
                <div className="text-xl sm:text-3xl font-bold text-white tracking-wider">
                  {formatMatchTime(match.utcDate)}
                </div>
              ) : (
                // Show the score for matches that have started or finished
                <div className="text-xl sm:text-3xl font-bold text-white tracking-wider">
                  {match.score.fullTime.home !== null ? match.score.fullTime.home : '0'} - {match.score.fullTime.away !== null ? match.score.fullTime.away : '0'}
                </div>
              )}
              <div className="text-emerald-400 text-xs sm:text-sm">
                {match.status === 'FINISHED' ? 'Full Time' : 
                 match.status === 'IN_PLAY' ? `${match.minute}'` : 
                 match.status === 'HALFTIME' ? 'Half Time' :
                 match.status === 'PAUSED' ? 'Paused' :
                 'Not Started'}
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <span className="text-white text-xs sm:text-sm">{match.awayTeam.name}</span>
              <img src={match.awayTeam.crest} alt="" className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="border-t border-gray-700/50 flex-1 overflow-auto">
          <div className="p-4">
            {loading ? (
              <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
              </div>
            ) : activeTab === 'events' ? (
              <div className="space-y-1">
                {events.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    No match events available
                  </div>
                ) : (
                  events.map((event, index) => {
                    const isHomeTeamEvent = event.team?.name === match.homeTeam.name;
              
                    return (
                      <div key={index} className="flex items-start gap-3 py-2 text-sm text-white">
                        <div className="min-w-[32px] text-gray-400">
                          {event.time?.elapsed}{event.time?.extra ? `+${event.time.extra}` : ''}'
                        </div>
                        
                        {/* Home team events on the left */}
                        {isHomeTeamEvent && (
                          <div className="flex-1 flex items-center gap-2 justify-start">
                            {event.type && (
                              <span className="text-base">
                                {getEventIcon(event.type, event.detail)}
                              </span>
                            )}
                            {formatEventDetails(event)}
                          </div>
                        )}
              
                        {/* Empty space in the middle */}
                        {!isHomeTeamEvent && <div className="flex-1" />}
              
                        {/* Away team events on the right */}
                        {!isHomeTeamEvent && (
                          <div className="flex-1 flex items-center gap-2 justify-end">
                            {formatEventDetails(event)}
                            {event.type && (
                              <span className="text-base">
                                {getEventIcon(event.type, event.detail)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              // New Prediction History Tab
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Home Team Prediction History */}
                <div className="space-y-4">
                  <TeamPredictionHistory 
                    teamId={match.homeTeam.id}
                    teamName={match.homeTeam.name}
                    teamLogo={match.homeTeam.crest}
                  />
                </div>

                {/* Away Team Prediction History */}
                <div className="space-y-4">
                  <TeamPredictionHistory 
                    teamId={match.awayTeam.id}
                    teamName={match.awayTeam.name}
                    teamLogo={match.awayTeam.crest}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Tabs */}
        <div className="border-t border-gray-700 flex">
          <button
            className={`flex-1 p-2 sm:p-4 text-xs sm:text-sm font-medium ${
              activeTab === 'events' 
                ? 'text-emerald-400 border-t-2 border-emerald-400 -mt-px' 
                : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('events')}
          >
            Match Events
          </button>
          <button
            className={`flex-1 p-2 sm:p-4 text-xs sm:text-sm font-medium ${
              activeTab === 'predictions' 
                ? 'text-emerald-400 border-t-2 border-emerald-400 -mt-px' 
                : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('predictions')}
          >
            Prediction History
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchDetailsModal;