import React, { useState, useEffect } from 'react';
import { X, Tv } from 'lucide-react';
import api from '../api';

const FieldVisualization = ({ lineup, teamColor }) => {
    const [selectedPlayer, setSelectedPlayer] = useState(null);
  
    const getPositions = (formation) => {
      const rows = formation.split('-').map(Number);
      let positions = [];
      
      // Add goalkeeper
      positions.push({ x: 50, y: 90 });
      
      // Add other positions based on formation
      rows.forEach((playersInRow, index) => {
        const spacing = 100 / (playersInRow + 1);
        const yPos = 75 - (index * 20);
        
        for(let i = 1; i <= playersInRow; i++) {
          positions.push({
            x: spacing * i,
            y: yPos
          });
        }
      });
      
      return positions;
    };
  
    if (!lineup?.formation || !lineup?.startXI) return null;
  
    const positions = getPositions(lineup.formation);
  
    return (
      <div className="relative w-full aspect-[4/3] bg-emerald-800 rounded-lg">
        {/* Field lines */}
        <div className="absolute inset-0 border-2 border-white/30 m-2">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-white/30" />
          <div className="absolute w-36 h-36 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-white/30 rounded-full" />
          <div className="absolute left-0 right-0 top-0 h-24 border-b border-white/30" />
          <div className="absolute left-0 right-0 bottom-0 h-24 border-t border-white/30" />
        </div>
  
        {/* Players */}
        {lineup.startXI.map((player, index) => {
          const position = positions[index];
          if (!position) return null;
  
          const lastName = player.name.split(' ').pop();
  
          return (
            <div 
              key={player.id || index}
              className="absolute flex flex-col items-center"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <button
                onClick={() => setSelectedPlayer(selectedPlayer?.id === player.id ? null : player)}
                className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full ${
                  teamColor === 'red' ? 'bg-red-500' : 'bg-white'
                } flex items-center justify-center`}
              >
                <span className={`text-xs sm:text-sm ${
                  teamColor === 'red' ? 'text-white' : 'text-black'
                }`}>
                  {player.number}
                </span>
              </button>
              
              {/* Player name - only show on desktop or when selected on mobile */}
              {(window.innerWidth > 640 || selectedPlayer?.id === player.id) && (
                <div className={`
                  absolute -bottom-6 left-1/2 -translate-x-1/2 
                  bg-black/90 text-white text-[10px] sm:text-xs 
                  px-1.5 py-0.5 rounded whitespace-nowrap
                  transition-all
                  ${selectedPlayer?.id === player.id ? 'scale-110' : ''}
                `}>
                  {lastName}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  
  const MatchDetailsModal = ({ match, onClose }) => {
    const [activeTab, setActiveTab] = useState('lineups'); // Set default to lineups
    const [events, setEvents] = useState([]);
    const [lineups, setLineups] = useState({
      home: null,
      away: null
    });
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      const fetchMatchDetails = async () => {
        setLoading(true);
        try {
          const [eventsResponse, lineupsResponse] = await Promise.all([
            api.fetchMatchEvents(match.id),
            api.fetchMatchLineups(match.id)
          ]);
          
          setEvents(eventsResponse.data || []);
          setLineups({
            home: lineupsResponse.data?.find(l => l.team.id === match.homeTeam.id) || null,
            away: lineupsResponse.data?.find(l => l.team.id === match.awayTeam.id) || null
          });
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
      
      const formatEventDetails = (event) => {
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
            {event.assist?.name && (
              <span className="text-gray-400"> (assist: {event.assist.name})</span>
            )}
          </div>
        );
      };
            
      const getEventIcon = (type, detail) => {
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
      
      
  
    return (
      <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
        <div className="bg-[#1a1f2b] w-full max-w-2xl rounded-lg overflow-hidden max-h-[80vh] flex flex-col">  {/* Updated size constraints */}
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
                <div className="text-xl sm:text-3xl font-bold text-white tracking-wider">
                  {match.score.fullTime.home} - {match.score.fullTime.away}
                </div>
                <div className="text-emerald-400 text-xs sm:text-sm">
                  {match.status === 'FINISHED' ? 'Full Time' : 
                   match.status === 'IN_PLAY' ? `${match.minute}'` : 
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
            <div className="p-4">  {/* Reduced padding */}
              {loading ? (
                <div className="flex justify-center items-center h-96">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                </div>
) : activeTab === 'events' ? (
    <div className="space-y-1">
      {events.map((event, index) => {
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
      })}
    </div>
                    ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                  {/* Home Team */}
                  <div>
                    <div className="flex items-center justify-between mb-2 sm:mb-4">
                      <h3 className="text-emerald-400 text-sm font-medium">
                        {match.homeTeam.name}
                      </h3>
                      {lineups.home?.formation && (
                        <span className="text-xs sm:text-sm text-gray-400">({lineups.home.formation})</span>
                      )}
                    </div>
                    
                    <FieldVisualization 
                      lineup={lineups.home} 
                      teamColor="red"
                    />
  
                    {lineups.home?.startXI && (
                      <div className="mt-2 sm:mt-4">
                        {lineups.home.substitutes?.length > 0 && (
                          <>
                            <div className="text-emerald-400 text-xs sm:text-sm font-medium mb-1 sm:mb-2">Substitutes</div>
                            {lineups.home.substitutes.map((player) => (
                              <div key={player.id} className="text-white text-xs sm:text-sm grid grid-cols-[1.5rem,1fr,2rem] sm:grid-cols-[2rem,1fr,2rem] gap-1 sm:gap-2 opacity-75">
                                <span className="text-gray-400">{player.number}</span>
                                <span className="truncate">{player.name}</span>
                                <span className="text-gray-400">{player.pos}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
  
                  {/* Away Team */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-emerald-400 font-medium">
                        {match.awayTeam.name}
                      </h3>
                      {lineups.away?.formation && (
                        <span className="text-sm text-gray-400">({lineups.away.formation})</span>
                      )}
                    </div>
                    
                    <FieldVisualization 
                      lineup={lineups.away}
                      teamColor="white"
                    />
  
                    {lineups.away?.startXI && (
                      <div className="mt-4">
                        {lineups.away.substitutes?.length > 0 && (
                          <>
                            <div className="text-emerald-400 text-sm font-medium mb-2">Substitutes</div>
                            {lineups.away.substitutes.map((player) => (
                              <div key={player.id} className="text-white text-sm grid grid-cols-[2rem,1fr,2rem] gap-2 opacity-75">
                                <span className="text-gray-400">{player.number}</span>
                                <span>{player.name}</span>
                                <span className="text-gray-400">{player.pos}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
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
                activeTab === 'lineups' 
                  ? 'text-emerald-400 border-t-2 border-emerald-400 -mt-px' 
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('lineups')}
            >
              Line-ups
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  export default MatchDetailsModal;