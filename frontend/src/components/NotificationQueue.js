// NotificationQueue.js
import React, { useState, useEffect } from 'react';
import GoalNotification from './GoalNotification';

const NotificationQueue = ({ notifications, onDismiss }) => {
  const [currentNotification, setCurrentNotification] = useState(null);
  const [queue, setQueue] = useState([]);
  const [processedIds] = useState(new Set());

  // Handle incoming notifications
  useEffect(() => {
    if (notifications.length > 0) {
      // Only add notifications we haven't processed yet
      const newNotifications = notifications.filter(
        notification => !processedIds.has(notification.id)
      );

      if (newNotifications.length > 0) {
        console.log('Adding new notifications to queue:', newNotifications);
        newNotifications.forEach(notification => processedIds.add(notification.id));
        setQueue(prev => [...prev, ...newNotifications]);
      }
    }
  }, [notifications, processedIds]);

  // Process queue
  useEffect(() => {
    if (queue.length > 0 && !currentNotification) {
      const nextNotification = queue[0];
      console.log('Processing next notification:', nextNotification);
      setCurrentNotification(nextNotification);
      setQueue(prev => prev.slice(1));
    } else if (queue.length === 0 && !currentNotification) {
      // When queue is empty and no current notification, clear everything
      onDismiss('all');
      processedIds.clear();
    }
  }, [queue, currentNotification, onDismiss, processedIds]);

  const handleDismiss = () => {
    setCurrentNotification(null);
  };

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