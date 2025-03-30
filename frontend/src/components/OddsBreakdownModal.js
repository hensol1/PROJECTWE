import React from 'react';
import { X } from 'lucide-react';

const OddsBreakdownModal = ({ match, onClose }) => {
  // Extract bookmakers data
  const bookmakers = match?.odds?.bookmakers || [];
  
  // Only show Match Winner bets (id: 1)
  const filteredBookmakers = bookmakers.filter(bm => 
    bm.bets && bm.bets.some(bet => bet.id === 1)
  );
  
  // Sort bookmakers alphabetically
  const sortedBookmakers = [...filteredBookmakers].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-2" onClick={onClose}>
      <div 
        className="bg-[#1a1f2b] w-full max-w-md rounded-lg overflow-hidden max-h-[90vh] mx-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 md:px-4 md:py-3 border-b border-gray-700">
          <div className="text-white font-semibold">
            <div className="flex items-center gap-2">
              <div className="flex gap-2 items-center">
                {match.homeTeam?.crest && (
                  <img 
                    src={match.homeTeam.crest} 
                    alt={match.homeTeam.name}
                    className="w-4 h-4 md:w-5 md:h-5 object-contain"
                  />
                )}
                <span className="text-xs md:text-sm">{match.homeTeam.name}</span>
              </div>
              <span className="text-xs text-gray-400">vs</span>
              <div className="flex gap-2 items-center">
                {match.awayTeam?.crest && (
                  <img 
                    src={match.awayTeam.crest} 
                    alt={match.awayTeam.name}
                    className="w-4 h-4 md:w-5 md:h-5 object-contain"
                  />
                )}
                <span className="text-xs md:text-sm">{match.awayTeam.name}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-auto max-h-[calc(90vh-60px)]">
          {sortedBookmakers.length > 0 ? (
            <table className="w-full text-white">
              <thead className="text-[10px] md:text-xs text-gray-400 uppercase bg-[#242938]">
                <tr className="border-b border-gray-700">
                  <th className="px-2 py-2 text-left">Bookmaker</th>
                  <th className="px-2 py-2 text-center">Home</th>
                  <th className="px-2 py-2 text-center">Draw</th>
                  <th className="px-2 py-2 text-center">Away</th>
                </tr>
              </thead>
              <tbody>
                {sortedBookmakers.map((bookmaker) => {
                  // Find the Match Winner bet
                  const bet = bookmaker.bets.find(b => b.id === 1);
                  if (!bet) return null;
                  
                  // Get home, draw, away odds
                  const homeOdd = bet.values.find(v => v.value === "Home")?.odd;
                  const drawOdd = bet.values.find(v => v.value === "Draw")?.odd;
                  const awayOdd = bet.values.find(v => v.value === "Away")?.odd;
                  
                  return (
                    <tr key={bookmaker.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                      <td className="px-2 py-2 text-xs md:text-sm">{bookmaker.name}</td>
                      <td className="px-2 py-2 text-center text-xs md:text-sm font-medium">{homeOdd?.toFixed(2) || "-"}</td>
                      <td className="px-2 py-2 text-center text-xs md:text-sm font-medium">{drawOdd?.toFixed(2) || "-"}</td>
                      <td className="px-2 py-2 text-center text-xs md:text-sm font-medium">{awayOdd?.toFixed(2) || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Add harmonic mean odds as footer */}
              {match.odds?.harmonicMeanOdds && (
                <tfoot className="bg-[#242938] font-semibold text-xs md:text-sm">
                  <tr className="border-t border-gray-600">
                    <td className="px-2 py-2 text-left">HARMONIC MEAN</td>
                    <td className="px-2 py-2 text-center">{match.odds.harmonicMeanOdds.home.toFixed(2)}</td>
                    <td className="px-2 py-2 text-center">{match.odds.harmonicMeanOdds.draw.toFixed(2)}</td>
                    <td className="px-2 py-2 text-center">{match.odds.harmonicMeanOdds.away.toFixed(2)}</td>
                  </tr>
                  {/* Add implied probabilities row */}
                  <tr className="text-[10px] text-emerald-400">
                    <td className="px-2 py-1 text-left">IMPLIED PROB.</td>
                    <td className="px-2 py-1 text-center">{match.odds.impliedProbabilities.home}%</td>
                    <td className="px-2 py-1 text-center">{match.odds.impliedProbabilities.draw}%</td>
                    <td className="px-2 py-1 text-center">{match.odds.impliedProbabilities.away}%</td>
                  </tr>
                </tfoot>
              )}
            </table>
          ) : (
            <div className="text-center text-gray-400 py-8">
              No detailed odds available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OddsBreakdownModal;