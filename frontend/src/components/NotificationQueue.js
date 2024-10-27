import React, { useState, useEffect, useCallback } from 'react';
import GoalNotification from './GoalNotification';

const NotificationQueue = ({ notifications, onDismiss }) => {
  const [currentNotification, setCurrentNotification] = useState(null);
  const [queue, setQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle new notifications
  useEffect(() => {
    if (notifications.length > 0) {
      setQueue(prev => [...prev, ...notifications]);
    }
  }, [notifications]);

  // Process queue
  useEffect(() => {
    const processQueue = () => {
      if (queue.length > 0 && !currentNotification && !isProcessing) {
        setIsProcessing(true);
        setCurrentNotification(queue[0]);
        setQueue(prev => prev.slice(1));
      }
    };

    processQueue();
  }, [queue, currentNotification, isProcessing]);

  const handleDismiss = useCallback(() => {
    if (currentNotification) {
      onDismiss(currentNotification);
      setCurrentNotification(null);
      setIsProcessing(false);
      
      // Add a small delay before processing the next notification
      setTimeout(() => {
        setIsProcessing(false);
      }, 100);
    }
  }, [currentNotification, onDismiss]);

  if (!currentNotification) return null;

  return (
    <GoalNotification
      match={currentNotification.match}
      scoringTeam={currentNotification.scoringTeam}
      onClose={handleDismiss}
      autoClose={true}
    />
  );
};

export default NotificationQueue;