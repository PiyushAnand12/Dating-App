import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bell, Heart, MessageCircle, Star, CheckCheck, Zap, UserPlus, Eye, ShoppingBag, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import PremiumLoader from '../components/PremiumLoader';
import './ActivityFeed.css';

const ActivityFeed = () => {
  const { user, loading: authLoading } = useAuth();
  const { socket } = useSocket(localStorage.getItem('token'));
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await api.get('users/activity');
      setActivities(res.data.data);
    } catch (err) {
      console.error('Failed to fetch activities', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user, fetchActivities]);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notif) => {
      // Refresh feed when new notification arrives
      fetchActivities();
    };

    socket.on('notification', handleNewNotification);
    return () => socket.off('notification', handleNewNotification);
  }, [socket, fetchActivities]);

  const handleMarkAllRead = async () => {
    try {
      const unreadIds = activities.filter(a => !a.isRead).map(a => a.id);
      if (unreadIds.length === 0) return;

      await api.patch('/users/activity/read', { activityIds: unreadIds });
      setActivities(prev => prev.map(a => ({ ...a, isRead: true })));
    } catch (err) {
      console.error('Failed to mark activities as read', err);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'LIKE_RECEIVED': return <div className="icon-wrap like"><Heart size={16} fill="currentColor" /></div>;
      case 'NEW_MATCH': return <div className="icon-wrap match"><MessageCircle size={16} fill="currentColor" /></div>;
      case 'STORY_REACTION': return <div className="icon-wrap story"><Star size={16} fill="currentColor" /></div>;
      case 'PROFILE_VISIT': return <div className="icon-wrap visit"><Eye size={16} /></div>;
      case 'PROFILE_UPDATED': return <div className="icon-wrap visit"><UserPlus size={16} /></div>;
      case 'PHOTOS_UPDATED': return <div className="icon-wrap story"><Image size={16} /></div>;
      case 'BOOST_START': return <div className="icon-wrap boost"><Zap size={16} fill="currentColor" /></div>;
      case 'WISH_ADDED': return <div className="icon-wrap wish"><ShoppingBag size={16} /></div>;
      default: return <div className="icon-wrap default"><Bell size={16} /></div>;
    }
  };

  const getActivityText = (activity, isBlurred) => {
    const actorName = isBlurred ? 'Someone' : (activity.actor?.firstName || 'A user');
    
    switch (activity.type) {
      case 'LIKE_RECEIVED':
        return <p><strong className={isBlurred ? 'blurred-text' : ''}>{actorName}</strong> liked your profile. <span className="action-text">Swipe back to match!</span></p>;
      case 'NEW_MATCH':
        return <p>You matched with <strong>{actorName}</strong>! <span className="action-text">Start the conversation.</span></p>;
      case 'STORY_REACTION':
        return <p><strong>{actorName}</strong> reacted to your story: <span className="reaction-emoji">{activity.metadata?.emoji || '❤️'}</span></p>;
      case 'PROFILE_VISIT':
        return <p><strong>{actorName}</strong> checked out your profile.</p>;
      case 'PROFILE_UPDATED':
        return <p><strong>{actorName}</strong> updated their profile. <span className="action-text">See what's new!</span></p>;
      case 'PHOTOS_UPDATED':
        return <p><strong>{actorName}</strong> added fresh photos. <span className="action-text">Take a look!</span></p>;
      case 'BOOST_START':
        return <p>Your profile is being <strong>Boosted</strong>! You're getting 10x more views.</p>;
      default:
        return <p><strong>{actorName}</strong> {activity.metadata?.body || 'interacted with you.'}</p>;
    }
  };

  const groupActivities = (acts) => {
    const groups = { Today: [], Yesterday: [], Earlier: [] };
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    acts.forEach(act => {
      const actDate = new Date(act.createdAt);
      if (actDate >= today) groups.Today.push(act);
      else if (actDate >= yesterday) groups.Yesterday.push(act);
      else groups.Earlier.push(act);
    });
    return groups;
  };

  if (authLoading || loading) {
    return (
      <div className="activity-page loading-state">
        <PremiumLoader text="Updating your feed..." />
      </div>
    );
  }

  const isBasicTier = user?.subscriptionTier === 'BASIC';
  const unreadCount = activities.filter(a => !a.isRead).length;
  const groups = groupActivities(activities);

  return (
    <div className="activity-page">
      <header className="activity-header">
        <div className="header-top">
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <h2>Activity</h2>
          <div className="header-actions">
            {unreadCount > 0 && (
              <button className="mark-read-btn" onClick={handleMarkAllRead}>
                <CheckCheck size={16} />
                <span>Mark Read</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="activity-main">
        {isBasicTier && activities.some(a => a.type === 'LIKE_RECEIVED') && (
          <motion.div 
            className="upgrade-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="upgrade-content">
              <div className="upgrade-text">
                <h3>See Who Likes You</h3>
                <p>Unlock the grid to see everyone who swiped right.</p>
              </div>
              <button className="upgrade-btn" onClick={() => navigate('/profile')}>Upgrade</button>
            </div>
            <div className="avatar-grid-preview">
              {[1, 2, 3].map(i => <div key={i} className="preview-avatar" />)}
            </div>
          </motion.div>
        )}

        {activities.length === 0 ? (
          <div className="empty-state">
            <div className="glass-bell-container">
              <div className="glass-bell-glow" />
              <div className="glass-bell">
                <Bell size={44} strokeWidth={1.5} />
              </div>
            </div>
            <h3>All Caught Up</h3>
            <p>Your likes, matches, and story reactions will appear here as they happen.</p>
            <button className="activity-explore-btn" onClick={() => navigate('/')}>Keep Exploring</button>
          </div>
        ) : (
          <div className="activity-groups">
            {Object.entries(groups).map(([label, items]) => items.length > 0 && (
              <div key={label} className="activity-group">
                <h4 className="group-label">{label}</h4>
                <div className="group-items">
                  <AnimatePresence>
                    {items.map((activity) => {
                      const isLike = activity.type === 'LIKE_RECEIVED';
                      const shouldBlur = isLike && isBasicTier;
                      const avatarUrl = activity.actor?.photos?.[0]?.url || '/images/profile1.png';

                      return (
                        <motion.div 
                          key={activity.id} 
                          className={`activity-item ${!activity.isRead ? 'unread' : ''}`}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          onClick={() => {
                            if (activity.type === 'NEW_MATCH' || activity.type === 'PHOTOS_UPDATED' || activity.type === 'PROFILE_UPDATED') {
                              navigate('/chat');
                            }
                          }}
                        >
                          <div className={`avatar-container ${shouldBlur ? 'blurred' : ''}`}>
                            <img src={avatarUrl} alt="" className="actor-img" />
                            {activity.actor?.isActive && !shouldBlur && <div className="online-indicator" />}
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="activity-info">
                            {getActivityText(activity, shouldBlur)}
                            <span className="timestamp">
                              {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {!activity.isRead && <div className="unread-indicator" />}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ActivityFeed;
