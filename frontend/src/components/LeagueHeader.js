import React from 'react';

const LeagueHeader = ({ leagueName, leagueEmblem, country }) => {
  return (
    <div className="flex items-center flex-grow relative">
      {/* Country Info - Left aligned */}
      {country && country.name && (
        <div className="flex items-center absolute left-0">
          {country.flag && (
            <img 
              src={country.flag} 
              alt={country.name}
              className="w-3 h-3 object-contain"
            />
          )}
          <span className="text-xs text-indigo-600 ml-0.5">{country.name}</span>
        </div>
      )}
      
      {/* League Info - Centered */}
      <div className="flex items-center space-x-1.5 mx-auto">
        <img 
          src={leagueEmblem} 
          alt={leagueName} 
          className="w-4 h-4 object-contain"
        />
        <span className="text-xs font-medium text-indigo-600">{leagueName}</span>
      </div>
    </div>
  );
};

export default LeagueHeader;