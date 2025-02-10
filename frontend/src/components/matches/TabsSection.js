import React from 'react';
import { format } from 'date-fns';

export const TabsSection = ({ 
  selectedDay, 
  setSelectedDay, 
  getDateForSelection 
}) => {
  const days = ['yesterday', 'today', 'tomorrow'];

  return (
    <div className="flex justify-center gap-2">
      {days.map((day) => {
        const date = getDateForSelection(day);
        return (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${selectedDay === day
                ? 'bg-white text-blue-600 shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            {day.charAt(0).toUpperCase() + day.slice(1)}
            <span className="block text-xs opacity-75">
              {format(date, 'MMM d')}
            </span>
          </button>
        );
      })}
    </div>
  );
};
