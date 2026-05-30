import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, CreditCard } from 'lucide-react';
import api from '../api/axios';
import './BoostModal.css';

const boostOptions = [
  { id: 'boost_1h', duration: 1, label: '1 Hour', price: '₹99', color: '#ff2d55' },
  { id: 'boost_6h', duration: 6, label: '6 Hours', price: '₹249', color: '#af52de', popular: true },
  { id: 'boost_24h', duration: 24, label: '24 Hours', price: '₹499', color: '#5856d6' },
];

const BoostModal = ({ isOpen, onClose, onBoosted }) => {
  const [selectedBoost, setSelectedBoost] = useState(boostOptions[1]);
  const [loading, setLoading] = useState(false);

  const handleBoost = async () => {
    setLoading(true);
    try {
      // In a real app, this would initiate Razorpay checkout
      // For now, we simulate success after a small delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const res = await api.post('/users/me/boost', { 
        durationHours: selectedBoost.duration 
      });
      
      onBoosted(res.data.data);
      onClose();
      alert(`Profile boosted for ${selectedBoost.label}!`);
    } catch (err) {
      console.error('Failed to boost profile', err);
      alert(err.response?.data?.message || 'Failed to activate boost');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="boost-modal-overlay">
          <motion.div 
            className="boost-modal-content glass"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
          >
            <button className="close-btn" onClick={onClose}><X /></button>
            
            <div className="boost-header">
              <div className="boost-icon-wrapper">
                <Zap size={32} fill="#ffcc00" color="#ffcc00" />
              </div>
              <h2>Boost Your Profile</h2>
              <p>Be the first profile seen in your area for up to 24 hours.</p>
            </div>

            <div className="boost-options">
              {boostOptions.map((option) => (
                <div 
                  key={option.id}
                  className={`boost-option ${selectedBoost.id === option.id ? 'active' : ''}`}
                  onClick={() => setSelectedBoost(option)}
                  style={{ '--option-color': option.color }}
                >
                  {option.popular && <span className="popular-tag">MOST POPULAR</span>}
                  <div className="option-info">
                    <span className="duration">{option.label}</span>
                    <span className="price">{option.price}</span>
                  </div>
                  <div className="selection-indicator" />
                </div>
              ))}
            </div>

            <div className="boost-benefits">
              <div className="benefit">
                <Zap size={16} /> <span>10x more profile views</span>
              </div>
              <div className="benefit">
                <Zap size={16} /> <span>Priority in Discovery deck</span>
              </div>
              <div className="benefit">
                <Zap size={16} /> <span>Increased match potential</span>
              </div>
            </div>

            <button 
              className="confirm-boost-btn" 
              onClick={handleBoost}
              disabled={loading}
              style={{ background: selectedBoost.color }}
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <CreditCard size={20} /> 
                  Boost for {selectedBoost.price}
                </>
              )}
            </button>
            
            <p className="secure-payment-text">
              Secure payment via Razorpay
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BoostModal;
