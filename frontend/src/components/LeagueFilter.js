// LeagueFilter.js
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const LeagueFilter = ({ leagues, selectedLeague, onLeagueSelect, isMobileOpen, onClose }) => {
  // Prevent body scroll when mobile filter is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen]);

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar content */}
      <div className={`
        fixed md:relative top-0 left-0 h-full w-72 md:w-auto
        bg-white/90 backdrop-blur-sm shadow-lg md:shadow-sm rounded-r-lg md:rounded-lg
        z-[51] md:z-auto
        transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 border-b border-gray-100">
          {/* Mobile header */}
          <div className="md:hidden flex justify-between items-center p-4">
            <h3 className="text-lg font-semibold text-gray-700">Today's Events</h3>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={20} />
            </button>
          </div>

          {/* Desktop header */}
          <h3 className="hidden md:block text-sm font-semibold text-gray-700 p-4">
            Today's Events
          </h3>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto h-[calc(100%-3.5rem)]">
          <div className="p-4 space-y-1">
            <button
              onClick={() => {
                onLeagueSelect(null);
                onClose?.();
              }}
              className={`w-full text-left px-2 py-1.5 rounded-md transition-colors ${
                !selectedLeague
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              All Leagues
            </button>
            {leagues.map((league) => (
              <button
                key={league.id}
                onClick={() => {
                  onLeagueSelect(league.id);
                  onClose?.();
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                  selectedLeague === league.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {league.country?.flag && (
                    <img
                      src={league.country.flag}
                      alt={league.country.name}
                      className="w-3 h-3 object-contain"
                    />
                  )}
                  <img
                    src={league.emblem}
                    alt={league.name}
                    className="w-4 h-4 object-contain"
                  />
                  <span className="text-sm truncate">{league.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default LeagueFilter;