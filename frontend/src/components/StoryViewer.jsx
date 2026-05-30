import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/axios';

const STORY_DURATION = 5000; // 5 seconds per story
const ALLOWED_EMOJIS = ['❤️', '😂', '😮', '😢', '😡'];

/**
 * Full-screen immersive story viewer — Instagram/Bumble style.
 *
 * Props:
 * - storyGroups: Array of { userId, firstName, avatarUrl, stories: [...] }
 * - initialGroupIndex: Which user group to start from
 * - onClose: Close callback
 * - isOwn: Boolean — if true, shows view count instead of reactions
 */
const StoryViewer = ({ storyGroups, initialGroupIndex = 0, onClose, isOwn = false }) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [floatingEmoji, setFloatingEmoji] = useState(null);
  const [reactedEmojis, setReactedEmojis] = useState(new Set());
  const [direction, setDirection] = useState('next');
  const [imageLoaded, setImageLoaded] = useState(false);

  const timerRef = useRef(null);
  const progressRef = useRef(null);
  const holdTimerRef = useRef(null);

  const currentGroup = storyGroups[groupIndex];
  const currentStory = currentGroup?.stories?.[storyIndex];
  const totalStoriesInGroup = currentGroup?.stories?.length || 0;

  // ─── Track story view ────────────────────────────────
  useEffect(() => {
    if (currentStory && !isOwn) {
      api.post(`users/stories/${currentStory.id}/view`).catch(() => {});
    }
  }, [currentStory?.id, isOwn]);

  // ─── Auto-advance timer ──────────────────────────────
  const startTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    if (isPaused || !imageLoaded) return;

    timerRef.current = setTimeout(() => {
      goNext();
    }, STORY_DURATION);
  }, [isPaused, groupIndex, storyIndex, storyGroups.length, totalStoriesInGroup, imageLoaded]);

  useEffect(() => {
    startTimer();
    return () => clearTimeout(timerRef.current);
  }, [startTimer]);

  // ─── Reset image loaded state when story changes ─────
  useEffect(() => {
    if (currentStory?.mediaType === 'IMAGE') {
      setImageLoaded(false);
    } else {
      setImageLoaded(true);
    }
  }, [currentStory?.id]);

  // ─── Navigation ──────────────────────────────────────
  const goNext = useCallback(() => {
    if (storyIndex < totalStoriesInGroup - 1) {
      setStoryIndex(prev => prev + 1);
      setDirection('next');
    } else if (groupIndex < storyGroups.length - 1) {
      setGroupIndex(prev => prev + 1);
      setStoryIndex(0);
      setDirection('next');
    } else {
      onClose();
    }
    setReactedEmojis(new Set());
  }, [storyIndex, totalStoriesInGroup, groupIndex, storyGroups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(prev => prev - 1);
      setDirection('prev');
    } else if (groupIndex > 0) {
      setGroupIndex(prev => prev - 1);
      const prevGroup = storyGroups[groupIndex - 1];
      setStoryIndex(prevGroup.stories.length - 1);
      setDirection('prev');
    }
    setReactedEmojis(new Set());
  }, [storyIndex, groupIndex, storyGroups]);

  // ─── Touch/Mouse handlers for pause ──────────────────
  const handlePointerDown = useCallback(() => {
    holdTimerRef.current = setTimeout(() => {
      setIsPaused(true);
      clearTimeout(timerRef.current);
    }, 200);
  }, []);

  const handlePointerUp = useCallback(() => {
    clearTimeout(holdTimerRef.current);
    if (isPaused) {
      setIsPaused(false);
    }
  }, [isPaused]);

  // ─── Keyboard navigation ─────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goPrev();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, onClose]);

  // ─── React to story ──────────────────────────────────
  const handleReaction = async (emoji) => {
    if (reactedEmojis.has(emoji)) return;

    setReactedEmojis(prev => new Set([...prev, emoji]));
    setFloatingEmoji(emoji);
    setTimeout(() => setFloatingEmoji(null), 1000);

    // Pause briefly
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 800);

    try {
      await api.post(`users/stories/${currentStory.id}/react`, { emoji });
    } catch (err) {
      console.error('Reaction failed:', err);
    }
  };

  // ─── Format time ago ─────────────────────────────────
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  };

  const timeRemaining = (expiresAt) => {
    if (!expiresAt) return 'Unknown';
    const expiryDate = new Date(expiresAt);
    if (isNaN(expiryDate.getTime())) return 'Unknown';
    
    const diff = expiryDate.getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    
    if (hrs > 0) return `${hrs}h left`;
    return `${mins}m left`;
  };

  if (!currentGroup || !currentStory) return null;

  return (
    <motion.div
      className="story-viewer-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="story-viewer-content">
        {/* ─── Progress Bars ─── */}
        <div className="story-progress-container">
          {currentGroup.stories.map((_, idx) => (
            <div key={idx} className="story-progress-bar">
              <div
                ref={idx === storyIndex ? progressRef : null}
                className={`story-progress-fill ${
                  idx < storyIndex ? 'completed' :
                  idx === storyIndex ? (isPaused ? 'active paused' : 'active') : ''
                }`}
                style={{
                  '--story-duration': `${STORY_DURATION}ms`,
                  width: idx < storyIndex ? '100%' : (idx === storyIndex ? undefined : '0%'),
                  ...(idx === storyIndex && !imageLoaded ? { width: '0%', animation: 'none' } : {})
                }}
                key={`${currentStory.id}-${idx}-${storyIndex}`}
              />
            </div>
          ))}
        </div>

        {/* ─── Header ─── */}
        <div className="story-viewer-header">
          <div className="story-user-info">
            <div className="story-user-avatar">
              <img
                src={currentGroup.avatarUrl || '/images/default-avatar.png'}
                alt={currentGroup.firstName}
              />
            </div>
            <div>
              <div className="story-user-name">
                {isOwn ? 'Your Story' : currentGroup.firstName}
              </div>
              <div className="story-timestamp">
                {timeAgo(currentStory.createdAt)} • <span className="story-expiry">{timeRemaining(currentStory.expiresAt)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isOwn && (currentStory.viewsCount !== undefined || currentStory._count?.views !== undefined) && (
              <div className="story-views-indicator" title="Total Views">
                <Eye size={16} />
                <span>{currentStory.viewsCount ?? currentStory._count?.views ?? 0}</span>
              </div>
            )}
            {isOwn && (
              <button
                className="story-delete-btn"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (window.confirm('Delete this story?')) {
                    try {
                      await api.delete(`users/stories/${currentStory.id}`);
                      onClose(); // Close viewer after deletion
                    } catch (err) {
                      console.error('Delete failed:', err);
                    }
                  }
                }}
                aria-label="Delete story"
              >
                <X size={20} color="#ff3b30" />
              </button>
            )}
            <button
              className="story-close-btn"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              aria-label="Close stories"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ─── Media ─── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStory.id}
            className="story-viewer-media"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            {currentStory.mediaType?.toUpperCase() === 'VIDEO' ? (
              <video
                key={currentStory.id}
                src={currentStory.mediaUrl}
                autoPlay
                muted
                playsInline
                onEnded={goNext}
                onError={(e) => console.error('[StoryViewer] Video Load Error:', currentStory.mediaUrl, e)}
                style={{ pointerEvents: 'none' }}
              />
            ) : (
              <img
                key={currentStory.id}
                src={currentStory.mediaUrl}
                alt="Story"
                draggable={false}
                onLoad={() => {
                  console.log('[StoryViewer] Image Loaded:', currentStory.mediaUrl);
                  setImageLoaded(true);
                }}
                onError={(e) => {
                  console.error('[StoryViewer] Image Load Error:', currentStory.mediaUrl, e);
                  // Force a single retry if it's a signed URL issue
                  if (!e.target.dataset.retried) {
                    e.target.dataset.retried = 'true';
                    e.target.src = currentStory.mediaUrl;
                  }
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* ─── Navigation Zones ─── */}
        <div
          className="story-nav-left"
          onClick={goPrev}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        <div
          className="story-nav-right"
          onClick={goNext}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        {/* ─── Navigation Hints ─── */}
        {(groupIndex > 0 || storyIndex > 0) && (
          <div className="story-swipe-hint left">
            <ChevronLeft size={20} />
          </div>
        )}
        {(groupIndex < storyGroups.length - 1 || storyIndex < totalStoriesInGroup - 1) && (
          <div className="story-swipe-hint right">
            <ChevronRight size={20} />
          </div>
        )}

        {/* ─── Floating Reaction ─── */}
        <AnimatePresence>
          {floatingEmoji && (
            <motion.div
              className="story-reaction-float"
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -200, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            >
              {floatingEmoji}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Footer (Reactions) ─── */}
        {!isOwn && (
          <div className="story-viewer-footer">
            <div className="story-reaction-bar">
              {ALLOWED_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  className={`story-reaction-btn ${reactedEmojis.has(emoji) ? 'reacted' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReaction(emoji);
                  }}
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StoryViewer;
