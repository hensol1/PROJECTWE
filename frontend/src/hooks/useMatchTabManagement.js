import { useState, useCallback, useEffect } from 'react';

export const useMatchTabManagement = (allLiveMatches, scheduledMatches, finishedMatches) => {
  const [activeTab, setActiveTab] = useState('live');
  const [isManualTabSelect, setIsManualTabSelect] = useState(false);

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

  // Watch for changes in match availability and update the tab if needed
  useEffect(() => {
    // Only run this effect after the component has mounted
    const currentTabHasMatches = 
      (activeTab === 'live' && allLiveMatches && Object.keys(allLiveMatches || {}).length > 0) ||
      (activeTab === 'scheduled' && scheduledMatches && Object.keys(scheduledMatches || {}).length > 0) ||
      (activeTab === 'finished' && finishedMatches && Object.keys(finishedMatches || {}).length > 0);
    
    // If no manual selection was made and current tab has no matches, 
    // determine a better tab with matches
    if (!isManualTabSelect && !currentTabHasMatches) {
      const newTab = determineAppropriateTab();
      setActiveTab(newTab);
    }
  }, [allLiveMatches, scheduledMatches, finishedMatches, activeTab, isManualTabSelect, determineAppropriateTab]);

  // Initialize with the appropriate tab based on available data
  useEffect(() => {
    // Run once on mount to set the initial tab
    const initialTab = determineAppropriateTab();
    setActiveTab(initialTab);
  }, [determineAppropriateTab]);

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