import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { List, Plus, X, Globe, Lock, MoreVertical, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Wishlists.css';

const Wishlists = () => {
  const [wishlists, setWishlists] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWishlistName, setNewWishlistName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchWishlists = async () => {
    try {
      const res = await api.get('users/wishlists');
      setWishlists(res.data.data);
    } catch (err) {
      console.error('Failed to fetch wishlists', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlists();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newWishlistName.trim()) return;
    try {
      const res = await api.post('users/wishlists', {
        name: newWishlistName,
        isPublic
      });
      setWishlists([res.data.data, ...wishlists]);
      setShowCreateModal(false);
      setNewWishlistName('');
    } catch (err) {
      console.error('Failed to create wishlist', err);
    }
  };

  if (loading) return <div className="loading-screen"><div className="loader"></div></div>;

  return (
    <div className="wishlists-page">
      <div className="wishlists-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={24} />
        </button>
        <h1>My Wishlists</h1>
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="create-wishlist-btn" 
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={20} />
        </motion.button>
      </div>

      <div className="wishlists-grid">
        {wishlists.length === 0 ? (
          <div className="empty-wishlists">
            <List size={48} />
            <h2>Create your first wishlist</h2>
            <p>Organize potential matches by categories or goals.</p>
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              Get Started
            </button>
          </div>
        ) : (
          wishlists.map((list) => (
            <motion.div 
              key={list.id}
              className="wishlist-card glass"
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate(`/wishlists/${list.id}`)}
            >
              <div className="wishlist-card-header">
                <h3>{list.name}</h3>
                {list.isPublic ? <Globe size={14} color="#4cd964" /> : <Lock size={14} color="#999" />}
              </div>
              <div className="wishlist-card-footer">
                <span>{list._count?.items || 0} items</span>
                <MoreVertical size={16} />
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <motion.div 
              className="create-modal glass"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>New Wishlist</h2>
                <X className="close-icon" onClick={() => setShowCreateModal(false)} />
              </div>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label>Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Dream Dates" 
                    value={newWishlistName}
                    onChange={(e) => setNewWishlistName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group toggle">
                  <span>Public Visibility</span>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <button type="submit" className="btn-primary">Create Wishlist</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Wishlists;
