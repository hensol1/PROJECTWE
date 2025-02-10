import React from 'react';
import { sortLeagueMatches } from '../../utils/matchUtils';
import LeagueHeader from '../LeagueHeader';
import MatchBox from './MatchBox';
import AnimatedList from '../AnimatedList';

export const LeagueListing = ({ 
  matches,
  collapsedLeagues,
  onLeagueToggle,
  onVote,
  selectedLeague,
  activeTab
}) => {
  const sortedMatches = sortLeagueMatches(matches);
  
  return (
    <div className="w-full max-w-md mx-auto">
      {sortedMatches
        .filter(([leagueKey]) => {
          if (!selectedLeague) return true;
          const [, leagueId] = leagueKey.split('_');
          return parseInt(leagueId) === selectedLeague;
        })
        .map(([leagueKey, competitionMatches]) => {
          const [leagueName] = leagueKey.split('_');
          return (
            <div key={leagueKey} className="mb-4 last:mb-0">
              <button 
                className="w-full group relative overflow-hidden"
                onClick={() => onLeagueToggle(leagueKey)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 via-white to-indigo-50 opacity-90" />
                
                <div className="relative flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2.5 backdrop-blur-sm border border-indigo-100/50 rounded-lg group-hover:border-indigo-200/70 transition-all duration-300">
                  <LeagueHeader 
                    leagueName={leagueName}
                    leagueEmblem={competitionMatches[0].competition.emblem}
                    country={competitionMatches[0].competition.country}
                  />
                  
                  <div className={`
                    transition-transform duration-300 text-indigo-500 scale-75 sm:scale-100
                    ${collapsedLeagues[leagueKey] ? 'rotate-180' : 'rotate-0'}
                  `}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </div>
                </div>
              </button>
                  
              {!collapsedLeagues[leagueKey] && (
                <div className="mt-1">
                  <AnimatedList delay={200} className="!overflow-visible gap-1">
                    {competitionMatches.map(match => (
                      <MatchBox 
                        key={match.id} 
                        match={match}
                        onVote={onVote}
                        isLiveTab={activeTab === 'live'}
                      />
                    ))}
                  </AnimatedList>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
};
