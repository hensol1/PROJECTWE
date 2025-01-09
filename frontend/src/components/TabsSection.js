// TabsSection.js
import React, { memo, useCallback } from 'react';
import { BiAlarm, BiAlarmOff } from "react-icons/bi";

// Separate DateTabs into its own memoized component
const DateTabs = memo(({ selectedDay, onDateSelect }) => {
  const handleClick = useCallback((day) => {
    onDateSelect(day);
  }, [onDateSelect]);

  return (
    <div className="inline-flex p-0.5 rounded-xl overflow-hidden shadow-lg" 
      style={{ background: `linear-gradient(135deg, #171923 0%, #1e2231 100%)` }}>
      {['yesterday', 'today', 'tomorrow'].map((day) => (
        <button
          key={day}
          onClick={() => handleClick(day)}
          className={`
            px-6 py-2 text-sm font-medium rounded-lg transition-all duration-300
            flex items-center justify-center min-w-[100px]
            ${selectedDay === day
              ? 'bg-white bg-opacity-10 text-white'
              : 'text-gray-400 hover:text-white hover:bg-white hover:bg-opacity-5'
            }
          `}
        >
          {day.charAt(0).toUpperCase() + day.slice(1)}
        </button>
      ))}
    </div>
  );
});

// Separate StatusTabs into its own memoized component
const StatusTabs = memo(({ selectedDay, activeTab, onTabChange, hasAnyLiveMatches }) => {
  if (selectedDay === 'yesterday') {
    return (
      <button className="px-6 py-2 text-sm font-medium text-white bg-white bg-opacity-10 rounded-lg flex items-center gap-2 min-w-[100px]">
        <BiAlarmOff className="w-4 h-4" />
        Finished
      </button>
    );
  }

  if (selectedDay === 'tomorrow') {
    return (
      <button className="px-6 py-2 text-sm font-medium text-white bg-white bg-opacity-10 rounded-lg flex items-center gap-2 min-w-[100px]">
        <BiAlarm className="w-4 h-4" />
        Scheduled
      </button>
    );
  }

  return (
    ['live', 'finished', 'scheduled'].map((tab) => (
      <button
        key={tab}
        onClick={() => onTabChange(tab)}
        className={`
          px-6 py-2 text-sm font-medium rounded-lg transition-all duration-300
          flex items-center justify-center gap-2 min-w-[100px]
          ${activeTab === tab
            ? 'bg-white bg-opacity-10 text-white'
            : 'text-gray-400 hover:text-white hover:bg-white hover:bg-opacity-5'
          }
        `}
      >
        {tab === 'live' && (
          <span className={`w-2 h-2 rounded-full ${hasAnyLiveMatches ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        )}
        {tab === 'finished' && <BiAlarmOff className="w-4 h-4" />}
        {tab === 'scheduled' && <BiAlarm className="w-4 h-4" />}
        {tab.charAt(0).toUpperCase() + tab.slice(1)}
      </button>
    ))
  );
});

const TabsSection = memo(({ 
  selectedDay, 
  setSelectedDay, 
  activeTab, 
  handleTabChange, 
  hasAnyLiveMatches, 
  getDateForSelection, 
  fetchMatches 
}) => {
  const handleDateSelect = useCallback((day) => {
    setSelectedDay(day);
    if (day === 'yesterday') {
      handleTabChange('finished');
    } else if (day === 'tomorrow') {
      handleTabChange('scheduled');
    }
    fetchMatches(getDateForSelection(day));
  }, [setSelectedDay, handleTabChange, fetchMatches, getDateForSelection]);

  return (
    <div className="flex flex-col space-y-4 mb-4">
      <div className="flex flex-col items-center gap-2">
        <DateTabs 
          selectedDay={selectedDay} 
          onDateSelect={handleDateSelect} 
        />

        <div className="inline-flex p-0.5 rounded-xl overflow-hidden shadow-lg"
          style={{ background: `linear-gradient(135deg, #171923 0%, #1e2231 100%)` }}>
          <StatusTabs
            selectedDay={selectedDay}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            hasAnyLiveMatches={hasAnyLiveMatches}
          />
        </div>
      </div>
    </div>
  );
});

// Add display names for better debugging
DateTabs.displayName = 'DateTabs';
StatusTabs.displayName = 'StatusTabs';
TabsSection.displayName = 'TabsSection';

export default TabsSection;