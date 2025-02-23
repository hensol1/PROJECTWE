import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../api';

const StandingsModal = ({ league, onClose }) => {
  const [standings, setStandings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const response = await api.getStandings(league.id, new Date().getFullYear());
        setStandings(response.data);
      } catch (error) {
        console.error('Error fetching standings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, [league.id]);

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
      <div className="bg-[#1a1f2b] w-full max-w-2xl rounded-lg overflow-hidden max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-3">
            {league.country?.flag && (
              <img 
                src={league.country.flag} 
                alt={league.country.name}
                className="w-6 h-4 object-cover rounded-sm"
              />
            )}
            {league.emblem && (
              <img 
                src={league.emblem} 
                alt={league.name}
                className="w-6 h-6 object-contain"
              />
            )}
            <span className="text-white font-medium">{league.name}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-auto max-h-[calc(80vh-60px)]">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
          ) : standings?.standings ? (
            <table className="w-full text-sm text-white">
              <thead className="text-xs text-gray-400 uppercase">
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Team</th>
                  <th className="px-2 py-3 text-center">MP</th>
                  <th className="px-2 py-3 text-center">W</th>
                  <th className="px-2 py-3 text-center">D</th>
                  <th className="px-2 py-3 text-center">L</th>
                  <th className="px-2 py-3 text-center">G</th>
                  <th className="px-2 py-3 text-center">+/-</th>
                  <th className="px-2 py-3 text-center">P</th>
                </tr>
              </thead>
              <tbody>
                {standings.standings.map((row) => (
                  <tr key={row.team.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                    <td className="px-4 py-3">{row.rank}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img 
                          src={row.team.logo} 
                          alt={row.team.name}
                          className="w-5 h-5 object-contain"
                        />
                        <span>{row.team.name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">{row.all.played}</td>
                    <td className="px-2 py-3 text-center">{row.all.win}</td>
                    <td className="px-2 py-3 text-center">{row.all.draw}</td>
                    <td className="px-2 py-3 text-center">{row.all.lose}</td>
                    <td className="px-2 py-3 text-center">{`${row.all.goals.for}:${row.all.goals.against}`}</td>
                    <td className="px-2 py-3 text-center">{row.goalsDiff}</td>
                    <td className="px-2 py-3 text-center font-bold">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center text-gray-400 py-8">
              No standings available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StandingsModal;