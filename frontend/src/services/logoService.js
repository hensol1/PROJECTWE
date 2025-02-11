// services/logoService.js
export class LogoService {
    static getTeamLogoPath(teamId) {
      // First try to get local logo
      const localPath = `/logos/teams/${teamId}.png`;
      
      return {
        localPath,
        // API path as fallback
        apiPath: `https://media.api-sports.io/football/teams/${teamId}.png`
      };
    }
  
    static getCompetitionLogoPath(competitionId) {
      const localPath = `/logos/competitions/${competitionId}.png`;
      
      return {
        localPath,
        apiPath: `https://media.api-sports.io/football/leagues/${competitionId}.png`
      };
    }
  
    static extractIdFromUrl(url) {
      // Extract ID from API URL
      const matches = url.match(/teams\/(\d+)\.png/) || url.match(/leagues\/(\d+)\.png/);
      return matches ? matches[1] : null;
    }
  }