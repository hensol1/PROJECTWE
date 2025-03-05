import { useState, useCallback, useEffect } from 'react';

export const useMatchTabManagement = (allLiveMatches, scheduledMatches, finishedMatches) => {
  const [activeTab, setActiveTab] = useState('live');
  const [isManualTabSelect, setIsManualTabSelect] = useState(false);
  // Add a ref to track if the initial selection has happened
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);

  // Determine the most appropriate tab based on available matches
  const determineAppropriateTab = useCallback((selectedDay = 'today') => {
    // For Yesterday, always show finished matches
    if (selectedDay === 'yesterday') {
      return 'finished';
    }
    
    // For Tomorrow, always show scheduled matches
    if (selectedDay === 'tomorrow') {
      return 'scheduled';
    }
    
    // For Today:
    // 1. Show live matches if available
    if (allLiveMatches && Object.keys(allLiveMatches || {}).length > 0) {
      return 'live';
    }
    
    // 2. Show scheduled matches if available
    if (scheduledMatches && Object.keys(scheduledMatches || {}).length > 0) {
      return 'scheduled';
    }
    
    // 3. Show finished matches if available
    if (finishedMatches && Object.keys(finishedMatches || {}).length > 0) {
      return 'finished';
    }
    
    // Default to scheduled if no matches are available
    return 'scheduled';
  }, [allLiveMatches, scheduledMatches, finishedMatches]);

  // Initialize with the appropriate tab based on available data - ONLY ONCE
  useEffect(() => {
    // Only run this once on initial mount
    if (!initialSelectionDone) {
      const initialTab = determineAppropriateTab();
      setActiveTab(initialTab);
      setInitialSelectionDone(true);
    }
  }, [determineAppropriateTab, initialSelectionDone]);

  // Handle tab changes
  const handleTabChange = useCallback((newTab) => {
    setIsManualTabSelect(true);
    setActiveTab(newTab);
  }, []);

  return {
    activeTab,
    isManualTabSelect,
    determineAppropriateTab,
    handleTabChange,
    setActiveTab,
    setIsManualTabSelect
  };
};