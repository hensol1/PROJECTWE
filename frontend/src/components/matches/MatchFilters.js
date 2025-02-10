import React from 'react';
import { BiAlarm, BiAlarmOff } from "react-icons/bi";
import { TabsSection } from './TabsSection';

export const MatchFilters = ({ 
  selectedDay,
  setSelectedDay,
  activeTab,
  onTabChange,
  hasAnyLiveMatches,
  getDateForSelection
}) => {
  const renderStatusTabs = () => {
    if (selectedDay === 'yesterday') {
      return (
        <div className="inline-flex bg-gray-100 p-0.5 rounded-lg shadow-md mt-2">
          <button
            className="px-3 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md bg-white text-blue-600 shadow-sm flex items-center justify-center"
            onClick={() => onTabChange('finished')}
          >
            <BiAlarmOff className="mr-1 sm:mr-2" />
            Finished
          </button>
        </div>
      );
    }

    if (selectedDay === 'tomorrow') {
      return (
        <div className="inline-flex bg-gray-100 p-0.5 rounded-lg shadow-md mt-2">
          <button
            className="px-3 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md bg-white text-blue-600 shadow-sm flex items-center justify-center"
            onClick={() => onTabChange('scheduled')}
          >
            <BiAlarm className="mr-1 sm:mr-2" />
            Scheduled
          </button>
        </div>
      );
    }

    return (
      <div className="inline-flex bg-gray-100 p-0.5 rounded-lg shadow-md mt-2">
        {['live', 'finished', 'scheduled'].map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`
              px-3 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ease-in-out
              flex items-center justify-center
              ${activeTab === tab
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            {tab === 'live' && (
              <span 
                className={`
                  inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-1 sm:mr-2
                  ${hasAnyLiveMatches ? 'bg-green-500 animate-pulse' : 'bg-red-500'}
                `}
              />
            )}
            {tab === 'finished' && <BiAlarmOff className="mr-1 sm:mr-2" />}
            {tab === 'scheduled' && <BiAlarm className="mr-1 sm:mr-2" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-4">
<TabsSection 
  selectedDay={selectedDay}
  setSelectedDay={setSelectedDay}  // This will now receive handleDayChange
  getDateForSelection={getDateForSelection}
/>
      {renderStatusTabs()}
    </div>
  );
};
