import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, MapPin, Heart, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Favorites.css';

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const navigate = useNavigate();

  const fetchFavorites = async () => {
    try {
      const res = await api.get('users/favorites');
      setFavorites(res.data.data);
    } catch (err) {
      console.error('Failed to fetch favorites', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const removeFavorite = async (userId) => {
    try {
      await api.delete(`users/favorites/${userId}`);
      setFavorites(prev => prev.filter(f => f.targetUserId !== userId));
    } catch (err) {
      console.error('Failed to remove favorite', err);
    }
  };

  const toggleSelection = (userId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const bulkRemove = async () => {
    if (selectedIds.size === 0) return;
    try {
      await api.delete('users/favorites/bulk-remove', { 
        data: { targetIds: Array.from(selectedIds) } 
      });
      setFavorites(prev => prev.filter(f => !selectedIds.has(f.targetUserId)));
      setSelectedIds(new Set());
      setIsSelectMode(false);
    } catch (err) {
      console.error('Failed to bulk remove favorites', err);
    }
  };

  if (loading) {
    return (
      <div className="favorites-loading">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      <div className="favorites-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h1>Favorites</h1>
        <button 
          className={`select-mode-btn ${isSelectMode ? 'active' : ''}`}
          onClick={() => {
            setIsSelectMode(!isSelectMode);
            setSelectedIds(new Set());
          }}
        >
          {isSelectMode ? 'Cancel' : 'Select'}
        </button>
      </div>

      <div className="favorites-content">
        {isSelectMode && selectedIds.size > 0 && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bulk-actions-bar glass"
          >
            <span>{selectedIds.size} selected</span>
            <button className="delete-selected-btn" onClick={bulkRemove}>
              Delete Selected
            </button>
          </motion.div>
        )}

        {favorites.length === 0 ? (
          <div className="no-favorites">
            <div className="empty-state-icon">
              <Star size={64} color="var(--primary)" />
            </div>
            <h2>No favorites yet</h2>
            <p>Start exploring to find people you like!</p>
            <button className="explore-btn" onClick={() => navigate('/discovery')}>
              Explore Now
            </button>
          </div>
        ) : (
          <div className="favorites-grid">
            <AnimatePresence>
              {favorites.map((fav) => (
                <motion.div 
                  key={fav.targetUserId}
                  className={`favorite-card glass ${selectedIds.has(fav.targetUserId) ? 'selected' : ''}`}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => {
                    if (isSelectMode) toggleSelection(fav.targetUserId);
                    else navigate(`/profile/${fav.targetUserId}`);
                  }}
                >
                  <div className="fav-image">
                    <img src={fav.user.mainPhotoUrl || '/images/profile1.png'} alt={fav.user.firstName} />
                    {isSelectMode ? (
                      <div className="selection-overlay">
                        <div className={`check-circle ${selectedIds.has(fav.targetUserId) ? 'checked' : ''}`}>
                          {selectedIds.has(fav.targetUserId) && <Star size={12} fill="white" />}
                        </div>
                      </div>
                    ) : (
                      <button 
                        className="remove-fav-btn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFavorite(fav.targetUserId);
                        }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div className="fav-info">
                    <h3>{fav.user.firstName}, {fav.user.age}</h3>
                    <div className="fav-location">
                      <MapPin size={14} />
                      <span>{fav.user.city || 'Nearby'}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
