import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Globe, Lock, Share2, Trash2, MapPin } from 'lucide-react';
import api from '../api/axios';
import './Wishlists.css';

const WishlistDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    try {
      const res = await api.get(`users/wishlists/${id}`);
      setWishlist(res.data.data);
    } catch (err) {
      console.error('Failed to fetch wishlist details', err);
      navigate('/wishlists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this wishlist?')) return;
    try {
      await api.delete(`users/wishlists/${id}`);
      navigate('/wishlists');
    } catch (err) {
      console.error('Failed to delete wishlist', err);
    }
  };

  const toggleVisibility = async () => {
    try {
      await api.patch(`users/wishlists/${id}/settings`, {
        isPublic: !wishlist.isPublic
      });
      setWishlist({ ...wishlist, isPublic: !wishlist.isPublic });
    } catch (err) {
      console.error('Failed to update wishlist visibility', err);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/wishlists/shared/${id}`;
    navigator.clipboard.writeText(url);
    alert('Public link copied to clipboard!');
  };

  if (loading) return <div className="loading-screen"><div className="loader"></div></div>;

  return (
    <div className="wishlist-details-page">
      <div className="details-header glass">
        <div className="header-top">
          <button className="back-btn" onClick={() => navigate('/wishlists')}>
            <ArrowLeft size={24} />
          </button>
          <div className="header-actions">
            {wishlist.isPublic && (
              <button className="action-icon-btn" onClick={handleShare}>
                <Share2 size={20} />
              </button>
            )}
            <button className="action-icon-btn delete" onClick={handleDelete}>
              <Trash2 size={20} />
            </button>
          </div>
        </div>
        <div className="header-content">
          <h1>{wishlist.name}</h1>
          <div className="visibility-toggle" onClick={toggleVisibility}>
            {wishlist.isPublic ? (
              <><Globe size={14} /> <span>Public</span></>
            ) : (
              <><Lock size={14} /> <span>Private</span></>
            )}
          </div>
        </div>
      </div>

      <div className="details-content">
        {wishlist.items.length === 0 ? (
          <div className="empty-details">
            <p>No items in this wishlist yet.</p>
            <button className="btn-secondary" onClick={() => navigate('/')}>Find People</button>
          </div>
        ) : (
          <div className="items-grid">
            {wishlist.items.map((item) => {
              if (!item.user) return null;
              const mainPhoto = item.user.photos?.[0]?.imageUrl || '/images/profile1.png';
              
              return (
                <motion.div 
                  key={item.targetId}
                  className="item-card glass"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => navigate(`/profile/${item.targetId}`)}
                >
                  <div className="item-image">
                    <img src={mainPhoto} alt={item.user.firstName} />
                  </div>
                  <div className="item-info">
                    <h3>{item.user.firstName}, {item.user.age}</h3>
                    <div className="item-location">
                      <MapPin size={12} />
                      <span>{item.user.city || 'Nearby'}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistDetails;
