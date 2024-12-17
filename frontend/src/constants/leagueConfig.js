// constants/leagueConfig.js
export const CUPS_WITHOUT_STANDINGS = [
    45,  // FA Cup
    48,  // League Cup
    137, // Copa del Rey
    90,  // DFB Pokal
    143, // Copa del Rey
    199,  // Coppa Italia
    96    // Portugal
];

// Helper function to check if a league should show standings
export const shouldShowStandings = (leagueId) => {
    return !CUPS_WITHOUT_STANDINGS.includes(leagueId);
};