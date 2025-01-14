import React from 'react';
import { ListFilter } from 'lucide-react';

const LeagueFilterButton = ({ onClick, selectedLeague }) => {
  return (
    <button
      onClick={onClick}
      className="md:hidden fixed bottom-4 left-4 z-30 bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
    >
      <div className="relative">
        <ListFilter size={24} />
        {selectedLeague && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full" />
        )}
      </div>
    </button>
  );
};

export default LeagueFilterButton;