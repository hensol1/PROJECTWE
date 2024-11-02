// LeagueHeader.js
import React from 'react';

const LeagueHeader = React.memo(({ leagueName, leagueEmblem, country }) => {
  return (
    <div className="grid grid-cols-3 w-full items-center">
      {/* Left section - Country */}
      <div className="flex items-center">
        {country && country.name && (
          <>
            {country.flag && (
              <img 
                src={country.flag} 
                alt={country.name}
                className="w-3 h-3 sm:w-3.5 sm:h-3.5 object-contain" // Smaller on mobile
              />
            )}
            <span className="text-[10px] sm:text-xs font-medium text-indigo-700 ml-0.5 sm:ml-1 truncate">
              {country.name}
            </span>
          </>
        )}
      </div>

      {/* Center section - League */}
      <div className="flex items-center justify-center w-full">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <img 
            src={leagueEmblem} 
            alt={leagueName} 
            className="w-4 h-4 sm:w-5 sm:h-5 object-contain flex-shrink-0" // Smaller on mobile
          />
          <span className="text-xs sm:text-sm font-semibold text-indigo-800 truncate max-w-[100px] sm:max-w-[120px]">
            {leagueName}
          </span>
        </div>
      </div>

      {/* Right section - Empty for arrow */}
      <div></div>
    </div>
  );
});;

export default LeagueHeader;