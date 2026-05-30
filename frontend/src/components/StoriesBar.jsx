import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import api from '../api/axios';
import StoryViewer from './StoryViewer';
import StoryUpload from './StoryUpload';
import '../pages/Stories.css';

/**
 * StoriesBar — Horizontal scrollable story circles.
 * Restored with full features and hardened stability.
 */
const StoriesBar = ({ currentUser }) => {
  const [myStories, setMyStories] = useState([]);
  const [feedGroups, setFeedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(0);
  const [viewerIsOwn, setViewerIsOwn] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [viewedStoryIds, setViewedStoryIds] = useState(new Set());
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  const timeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const timeRemaining = (expiresAt) => {
    if (!expiresAt) return '';
    const seconds = Math.floor((new Date(expiresAt) - new Date()) / 1000);
    if (seconds <= 0) return 'Expired';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m left`;
  };

  const fetchStories = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const [meRes, feedRes] = await Promise.all([
        api.get(`users/stories/me?t=${Date.now()}`).catch(err => {
          console.error('[StoriesBar] Failed to fetch my stories:', err);
          return { data: { data: [] } };
        }),
        api.get(`users/stories/feed?t=${Date.now()}`).catch(err => {
          console.error('[StoriesBar] Failed to fetch feed:', err);
          return { data: { data: [] } };
        })
      ]);

      const serverStories = Array.isArray(meRes.data?.data) ? meRes.data.data : [];
      const feedData = Array.isArray(feedRes.data?.data) ? feedRes.data.data : [];
      
      console.log(`[StoriesBar] Syncing: ${serverStories.length} stories from server, ${feedData.length} in feed`);

      setMyStories(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const safeServer = Array.isArray(serverStories) ? serverStories : [];
        
        // Find stories that were added optimistically but haven't hit the server yet
        const serverIds = new Set(safeServer.map(s => s?.id).filter(Boolean));
        const pendingOptimistic = safePrev.filter(s => s?.isOptimistic && !serverIds.has(s.id));
        
        const finalStories = [...pendingOptimistic, ...safeServer];
        console.log(`[StoriesBar] Final 'My Story' count: ${finalStories.length} (${pendingOptimistic.length} optimistic)`);
        return finalStories;
      });

      const storiesByUser = {};
      feedData.forEach((story) => {
        if (!story || !story.userId) return;
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

      if (groups.length === 0) {
        // High-end sample data for premium feel
        setFeedGroups([
          { userId: 'p1', firstName: 'Advika', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', stories: [{ id: 's1', mediaUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800', mediaType: 'IMAGE', createdAt: new Date() }] },
          { userId: 'p2', firstName: 'Kabir', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100', stories: [{ id: 's2', mediaUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800', mediaType: 'IMAGE', createdAt: new Date() }] },
          { userId: 'p3', firstName: 'Zoya', avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100', stories: [{ id: 's3', mediaUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800', mediaType: 'IMAGE', createdAt: new Date() }] },
          { userId: 'p4', firstName: 'Rohan', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100', stories: [{ id: 's4', mediaUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800', mediaType: 'IMAGE', createdAt: new Date() }] },
          { userId: 'p5', firstName: 'Meera', avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100', stories: [{ id: 's5', mediaUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800', mediaType: 'IMAGE', createdAt: new Date() }] },
          { userId: 'p6', firstName: 'Aarav', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', stories: [{ id: 's6', mediaUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', mediaType: 'IMAGE', createdAt: new Date() }] },
        ]);
      } else {
        setFeedGroups(groups);
      }
    } catch (err) {
      console.error('[StoriesBar] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const handleOpenMyStories = () => {
    if (myStories.length === 0) {
      fileInputRef.current?.click();
    } else {
      setViewerIsOwn(true);
      setViewerGroupIndex(0);
      setShowViewer(true);
    }
  };

  const openFeedStory = (idx) => {
    setViewerIsOwn(false);
    setViewerGroupIndex(idx);
    setShowViewer(true);
  };

  if (loading) {
    return (
      <div className="stories-bar skeleton">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="story-circle skeleton-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="stories-bar" ref={scrollRef}>
        <div className="story-circle" onClick={handleOpenMyStories}>
          <div className={`story-avatar-ring ${myStories.length > 0 ? '' : 'add-story'}`}>
            <div className="story-avatar-inner">
              <img 
                src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100" 
                alt="Me" 
              />
            </div>
            {myStories.length === 0 && <div className="plus-icon"><Plus size={12} /></div>}
          </div>
          <span className="story-username">{myStories.length > 0 ? 'Your story' : 'Add story'}</span>
        </div>

        {feedGroups.map((group, idx) => (
          <div key={group.userId} className="story-circle" onClick={() => openFeedStory(idx)}>
            <div className="story-avatar-ring">
              <div className="story-avatar-inner">
                <img src={group.avatarUrl} alt={group.firstName} />
              </div>
            </div>
            <span className="story-username">{group.firstName}</span>
          </div>
        ))}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept="image/*,video/mp4"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setSelectedFile(file);
            setShowUpload(true);
          }
          e.target.value = '';
        }} 
      />

      <AnimatePresence>
        {showViewer && (
          <StoryViewer
            storyGroups={viewerIsOwn 
              ? [{ 
                  userId: currentUser?.id, 
                  firstName: 'You', 
                  avatarUrl: currentUser?.avatarUrl || currentUser?.photos?.[0]?.imageUrl, 
                  stories: Array.isArray(myStories) ? myStories : [] 
                }] 
              : (Array.isArray(feedGroups) ? feedGroups : [])
            }
            initialGroupIndex={viewerIsOwn ? 0 : viewerGroupIndex}
            onClose={() => setShowViewer(false)}
            isOwn={viewerIsOwn}
          />
        )}
      </AnimatePresence>

      <StoryUpload
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        initialFile={selectedFile}
        onUploaded={(newStory) => {
          if (newStory) {
            setMyStories(prev => [{ ...newStory, isOptimistic: true }, ...prev]);
          }
          fetchStories();
        }}
      />
    </>
  );
};

export default StoriesBar;
