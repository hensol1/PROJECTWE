import React from 'react';
import { X } from 'lucide-react';

const LeagueFilter = ({ leagues, selectedLeague, onLeagueSelect, isMobileOpen, onClose }) => {
  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar content */}
      <div className={`
        fixed md:relative top-0 bottom-0 left-0 w-72 md:w-auto
        bg-white/90 backdrop-blur-sm shadow-lg md:shadow-sm rounded-r-lg md:rounded-lg
        z-50 md:z-auto
        transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4">
          {/* Mobile close button */}
          <div className="flex justify-between items-center mb-4 md:hidden">
            <h3 className="text-lg font-semibold text-gray-700">Leagues</h3>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={20} />
            </button>
          </div>

          {/* Desktop title */}
          <h3 className="hidden md:block text-sm font-semibold text-gray-700 mb-3 px-2">
            Today's Events
          </h3>

          {/* League buttons */}
          <div className="space-y-1">
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