// Update MatchFilters.js to use the redesigned TabsSection

import React from 'react';
import { TabsSection } from './TabsSection';

export const MatchFilters = ({ 
  selectedDay,
  setSelectedDay,
  getDateForSelection,
  // Keep these props for compatibility
  activeTab,
  onTabChange,
  hasAnyLiveMatches,
  predictionFilter,
  setPredictionFilter
}) => {
  return (
    <div className="w-full max-w-2xl"> {/* Set the same width as matches component */}
      <TabsSection 
        selectedDay={selectedDay}
        setSelectedDay={setSelectedDay}
        getDateForSelection={getDateForSelection}
      />
      {/* Status tabs have been removed */}
    </div>
  );
};