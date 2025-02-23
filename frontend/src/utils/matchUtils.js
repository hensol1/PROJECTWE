import { addDays, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

export const priorityLeagues = [2, 3, 39, 140, 78, 135, 61];

export const getDateForSelection = (selection) => {
  const today = new Date();
  switch(selection) {
    case 'yesterday':
      return subDays(today, 1);
    case 'tomorrow':
      return addDays(today, 1);
    default: // 'today'
      return today;
  }
};

export const filterMatchesByStatus = (matches, statuses, userTimeZone, selectedDate) => {
  if (!matches || typeof matches !== 'object') {
    console.warn('Invalid matches object provided to filterMatchesByStatus');
    return {};
  }

  return Object.entries(matches).reduce((acc, [leagueKey, leagueMatches]) => {
    if (!Array.isArray(leagueMatches)) return acc;

    const filteredMatches = leagueMatches.filter(match => {
      if (!match?.status) return false;
      
      const statusMatches = statuses.includes(match.status);
      
      if (statusMatches && match.status === 'TIMED') {
        if (!match.utcDate) return false;
        
        try {
          const matchDate = utcToZonedTime(parseISO(match.utcDate), userTimeZone);
          const startOfToday = startOfDay(selectedDate);
          const endOfToday = endOfDay(selectedDate);
          return matchDate >= startOfToday && matchDate <= endOfToday;
        } catch (error) {
          console.error('Error processing match date:', error);
          return false;
        }
      }
      
      return statusMatches;
    });

    if (filteredMatches.length > 0) {
      acc[leagueKey] = filteredMatches;
    }
    return acc;
  }, {});
};

export const extractLeagues = (matchesForCurrentDate = {}, allLiveMatches = {}) => {
  const leaguesMap = new Map();

  // Extract from regular matches
  if (matchesForCurrentDate && typeof matchesForCurrentDate === 'object') {
    Object.values(matchesForCurrentDate).forEach(leagueMatches => {
      if (Array.isArray(leagueMatches) && leagueMatches.length > 0) {
        const firstMatch = leagueMatches[0];
        if (firstMatch?.competition?.id) {
          leaguesMap.set(firstMatch.competition.id, {
            id: firstMatch.competition.id,
            name: firstMatch.competition.name || '',
            emblem: firstMatch.competition.emblem || '',
            country: firstMatch.competition.country || ''
          });
        }
      }
    });
  }

  // Extract from live matches
  if (allLiveMatches && typeof allLiveMatches === 'object') {
    Object.values(allLiveMatches).forEach(leagueMatches => {
      if (Array.isArray(leagueMatches) && leagueMatches.length > 0) {
        const firstMatch = leagueMatches[0];
        if (firstMatch?.competition?.id) {
          leaguesMap.set(firstMatch.competition.id, {
            id: firstMatch.competition.id,
            name: firstMatch.competition.name || '',
            emblem: firstMatch.competition.emblem || '',
            country: firstMatch.competition.country || ''
          });
        }
      }
    });
  }

  return Array.from(leaguesMap.values());
};

export const sortLeagueMatches = (matches) => {
  return Object.entries(matches)
    .sort(([leagueKeyA, matchesA], [leagueKeyB, matchesB]) => {
      const [, aId] = leagueKeyA.split('_');
      const [, bId] = leagueKeyB.split('_');

      const statusOrder = ['IN_PLAY', 'PAUSED', 'HALFTIME', 'LIVE', 'TIMED', 'SCHEDULED', 'FINISHED'];
      const statusA = Math.min(...matchesA.map(match => statusOrder.indexOf(match.status)));
      const statusB = Math.min(...matchesB.map(match => statusOrder.indexOf(match.status)));

      if (statusA !== statusB) {
        return statusA - statusB;
      }

      const aIndex = priorityLeagues.indexOf(parseInt(aId));
      const bIndex = priorityLeagues.indexOf(parseInt(bId));
      
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      } else if (aIndex !== -1) {
        return -1;
      } else if (bIndex !== -1) {
        return 1;
      }

      return leagueKeyA.localeCompare(leagueKeyB);
    });
};

