// Updated MatchFilters.js - removed status tabs

import React from 'react';
import { TabsSection } from './TabsSection';

export const MatchFilters = ({ 
  selectedDay,
  setSelectedDay,
  getDateForSelection,
  // Keeping these props for compatibility but not using them
  activeTab,
  onTabChange,
  hasAnyLiveMatches,
  predictionFilter,
  setPredictionFilter
}) => {
  return (
    <div className="flex flex-col items-center gap-4">
      <TabsSection 
        selectedDay={selectedDay}
        setSelectedDay={setSelectedDay}
        getDateForSelection={getDateForSelection}
      />
      {/* Status tabs have been removed */}
    </div>
  );
};