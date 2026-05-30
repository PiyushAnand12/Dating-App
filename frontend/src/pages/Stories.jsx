import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Camera, Trash2, Eye, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import StoryViewer from '../components/StoryViewer';
import StoryUpload from '../components/StoryUpload';
import PremiumLoader from '../components/PremiumLoader';
import './Stories.css';

/**
 * Standalone Stories page — manage your stories & view feed.
 */
const Stories = () => {
  const { user: currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [myStories, setMyStories] = useState([]);
  const [feedGroups, setFeedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(0);
  const [viewerIsOwn, setViewerIsOwn] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate('/login');
    }
  }, [currentUser, authLoading, navigate]);

  const fetchStories = useCallback(async () => {
    try {
      const [myRes, feedRes] = await Promise.all([
        api.get('users/stories/me'),
        api.get('users/stories/feed'),
      ]);

      setMyStories(myRes.data.data || []);

      const storiesByUser = {};
      (feedRes.data.data || []).forEach((story) => {
        const userId = story.userId;
        if (!storiesByUser[userId]) {
          storiesByUser[userId] = {
            userId,
            firstName: story.user?.firstName || 'User',
            avatarUrl: story.user?.avatarUrl || '/images/default-avatar.png',
            stories: [],
          };
        }
        storiesByUser[userId].stories.push(story);
      });

      const groups = Object.values(storiesByUser).sort((a, b) => {
        const aLatest = new Date(a.stories[0]?.createdAt || 0);
        const bLatest = new Date(b.stories[0]?.createdAt || 0);
        return bLatest - aLatest;
      });

      setFeedGroups(groups);
      return { myStories: myRes.data.data, groups };
    } catch (err) {
      console.error('Failed to fetch stories:', err);
      return { myStories: [], groups: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchStories().then(({ groups, myStories: myS }) => {
        const params = new URLSearchParams(window.location.search);
        const userIdParam = params.get('userId');
        if (userIdParam) {
          const groupIdx = groups.findIndex(g => g.userId === userIdParam);
          if (groupIdx > -1) {
            setViewerIsOwn(false);
            setViewerGroupIndex(groupIdx);
            setShowViewer(true);
          } else if (userIdParam === currentUser.id && myS.length > 0) {
            setViewerIsOwn(true);
            setViewerGroupIndex(0);
            setShowViewer(true);
          }
        }
      });
    }
  }, [currentUser, fetchStories]);

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h`;
  };

  const timeRemaining = (expiresAt) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hrs > 0) return `${hrs}h ${mins}m left`;
    return `${mins}m left`;
  };

  const deleteStory = async (storyId) => {
    try {
      await api.delete(`users/stories/${storyId}`);
      setMyStories(prev => prev.filter(s => s.id !== storyId));
    } catch (err) {
      console.error('Failed to delete story:', err);
    }
  };

  const openMyStories = () => {
    if (myStories.length === 0) return;
    setViewerIsOwn(true);
    setViewerGroupIndex(0);
    setShowViewer(true);
  };

  const openFeedStory = (idx) => {
    setViewerIsOwn(false);
    setViewerGroupIndex(idx);
    setShowViewer(true);
  };

  const getViewerGroups = () => {
    if (viewerIsOwn) {
      return [{
        userId: currentUser.id,
        firstName: currentUser.firstName || 'You',
        avatarUrl: currentUser.avatarUrl || '/images/default-avatar.png',
        stories: myStories,
      }];
    }
    return feedGroups;
  };

  if (authLoading || loading) {
    return (
      <div className="stories-page loading-state">
        <PremiumLoader text="Syncing stories..." />
      </div>
    );
  }

  return (
    <div className="stories-page">
      {/* ─── Header ─── */}
      <nav className="stories-page-nav glass">
        <button className="nav-icon-btn" onClick={() => navigate('/')} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="gradient-text nav-title">Stories</h2>
        <button
          className="nav-icon-btn"
          onClick={() => setShowUpload(true)}
          aria-label="Add Story"
          style={{ color: 'var(--primary)' }}
        >
          <Plus size={22} />
        </button>
      </nav>

      {/* ─── My Stories Section ─── */}
      <section className="stories-section">
        <h3 className="stories-section-title">Your Stories</h3>

        {myStories.length === 0 ? (
          <div className="stories-empty-card" onClick={() => setShowUpload(true)}>
            <div className="stories-empty-icon">
              <Camera size={28} />
            </div>
            <div>
              <div className="stories-empty-text">Share your moment</div>
              <div className="stories-empty-hint">Tap to add a story</div>
            </div>
          </div>
        ) : (
          <div className="stories-my-grid">
            {/* Add more button */}
            <div className="story-grid-add" onClick={() => setShowUpload(true)}>
              <Plus size={24} />
              <span>Add</span>
            </div>

            {myStories.map((story) => (
              <div
                key={story.id}
                className="story-grid-item"
                onClick={openMyStories}
              >
                {story.mediaType === 'VIDEO' ? (
                  <video src={story.mediaUrl} muted playsInline />
                ) : (
                  <img src={story.mediaUrl} alt="Your story" />
                )}
                <div className="story-grid-overlay">
                  <div className="story-grid-meta">
                    <span className="story-grid-time">
                      <Clock size={10} /> {timeAgo(story.createdAt)}
                    </span>
                    <span className="story-grid-remaining">
                      {timeRemaining(story.expiresAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Feed Stories Section ─── */}
      <section className="stories-section">
        <h3 className="stories-section-title">Recent Stories</h3>

        {feedGroups.length === 0 ? (
          <div className="stories-empty-card">
            <div className="stories-empty-icon" style={{ opacity: 0.3 }}>
              <Eye size={28} />
            </div>
            <div>
              <div className="stories-empty-text" style={{ color: 'var(--text-muted)' }}>
                No stories yet
              </div>
              <div className="stories-empty-hint">
                Stories from matches & favorites will appear here
              </div>
            </div>
          </div>
        ) : (
          <div className="stories-feed-list">
            {feedGroups.map((group, idx) => (
              <div
                key={group.userId}
                className="story-feed-card"
                onClick={() => openFeedStory(idx)}
              >
                <div className="story-feed-avatar-ring">
                  <div className="story-feed-avatar">
                    <img
                      src={group.avatarUrl || '/images/default-avatar.png'}
                      alt={group.firstName}
                    />
                  </div>
                </div>
                <div className="story-feed-info">
                  <div className="story-feed-name">{group.firstName}</div>
                  <div className="story-feed-count">
                    {group.stories.length} {group.stories.length === 1 ? 'story' : 'stories'} • {timeAgo(group.stories[0]?.createdAt)}
                  </div>
                </div>
                <div className="story-feed-preview">
                  {group.stories[0]?.mediaType === 'VIDEO' ? (
                    <video src={group.stories[0].mediaUrl} muted playsInline />
                  ) : (
                    <img
                      src={group.stories[0]?.mediaUrl}
                      alt="Preview"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Viewer ─── */}
      <AnimatePresence>
        {showViewer && (
          <StoryViewer
            storyGroups={getViewerGroups()}
            initialGroupIndex={viewerIsOwn ? 0 : viewerGroupIndex}
            onClose={() => setShowViewer(false)}
            isOwn={viewerIsOwn}
          />
        )}
      </AnimatePresence>

      {/* ─── Upload ─── */}
      <StoryUpload
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={fetchStories}
      />
    </div>
  );
};

export default Stories;
