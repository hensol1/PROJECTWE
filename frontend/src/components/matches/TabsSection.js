import React from 'react';
import { format } from 'date-fns';

export const TabsSection = ({ 
  selectedDay, 
  setSelectedDay, 
  getDateForSelection 
}) => {
  const days = ['yesterday', 'today', 'tomorrow'];

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#1a1f2b] text-white rounded-t-lg shadow-lg overflow-hidden border-b border-gray-700">
      <div className="flex justify-between">
        {days.map((day) => {
          const date = getDateForSelection(day);
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`
                flex-1 text-center py-2 transition-all duration-200
                ${selectedDay === day
                  ? 'bg-[#242938] text-white font-medium'
                  : 'text-gray-400 hover:bg-[#242938]/50'
                }
              `}
            >
              <div className="font-medium text-sm">
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </div>
              <div className="text-xs opacity-75">
                {format(date, 'MMM d')}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};