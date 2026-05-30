import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import NotificationToast from './NotificationToast';

const NotificationLayout = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!socket) return;

    socket.on('notification', (notif) => {
      console.log('%c [REAL-TIME] Notification Received:', 'color: #ff4d6d; font-weight: bold', notif);
      setNotifications(prev => [...prev, { ...notif, id: Date.now() }]);
    });

    socket.on('emergency_alert', (data) => {
      setNotifications(prev => [...prev, { 
        id: Date.now(),
        title: '🚨 EMERGENCY ALERT',
        body: `${data.userName} triggered their panic button! Check location: ${data.latitude}, ${data.longitude}`,
        type: 'EMERGENCY'
      }]);
    });

    socket.on('emergency_resolved', (data) => {
      setNotifications(prev => [...prev, { 
        id: Date.now(),
        title: '✅ Safety Resolved',
        body: `${data.userName} is now safe.`,
        type: 'SAFETY_SUCCESS'
      }]);
    });

    socket.on('safety_alert', (data) => {
      if (user?.role === 'ADMIN') {
        setNotifications(prev => [...prev, { 
          id: Date.now(),
          title: '🛡️ ADMIN: PANIC TRIGGERED',
          body: `User ${data.userName} (${data.userId}) triggered panic button.`,
          type: 'ADMIN_SAFETY'
        }]);
      }
    });

    return () => {
      socket.off('notification');
      socket.off('emergency_alert');
      socket.off('emergency_resolved');
      socket.off('safety_alert');
    };
  }, [socket]);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="global-notification-portal">
      {notifications.map(notif => (
        <NotificationToast 
          key={notif.id} 
          notification={notif} 
          onClose={() => removeNotification(notif.id)} 
        />
      ))}
    </div>
  );
};

export default NotificationLayout;
