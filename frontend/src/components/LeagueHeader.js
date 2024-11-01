import React from 'react';

const LeagueHeader = ({ leagueName, leagueEmblem, country }) => {
  return (
    <div className="flex items-center flex-grow">
      <div className="flex items-center space-x-2">
        {/* Country Info - shown first if available */}
        {country && country.name && (
          <div className="flex items-center">
            {country.flag && (
              <img 
                src={country.flag} 
                alt={country.name}
                className="w-4 h-4 object-contain"
              />
            )}
            <span className="text-sm text-gray-600 ml-1">{country.name}</span>
            <span className="mx-2 text-gray-400">•</span>
          </div>
        )}
        
        {/* League Info */}
        <img 
          src={leagueEmblem} 
          alt={leagueName} 
          className="w-5 h-5 object-contain"
        />
        <span className="font-semibold">{leagueName}</span>
      </div>
    </div>
  );
};

export default LeagueHeader;