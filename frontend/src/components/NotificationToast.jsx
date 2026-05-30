import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Star, Bell, X } from 'lucide-react';
import './NotificationToast.css';

const NotificationToast = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (notification.type) {
      case 'NEW_MATCH': return <Heart className="toast-icon match" fill="currentColor" />;
      case 'LIKE_RECEIVED': return <Heart className="toast-icon like" fill="currentColor" />;
      case 'NEW_MESSAGE': return <MessageCircle className="toast-icon message" fill="currentColor" />;
      case 'FAVORITE_RECEIVED': return <Star className="toast-icon favorite" fill="currentColor" />;
      default: return <Bell className="toast-icon" />;
    }
  };

  return (
    <div className="notification-toast">
      <div className="toast-content">
        <div className="toast-icon-container">
          {getIcon()}
        </div>
        <div className="toast-text">
          <h4>{notification.title}</h4>
          <p>{notification.body}</p>
        </div>
      </div>
      <button className="toast-close" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
};

export default NotificationToast;
