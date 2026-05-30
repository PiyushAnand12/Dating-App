import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ShieldCheck, LogOut, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDirection, setLastDirection] = useState(null);

  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [userToReject, setUserToReject] = useState(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login');
      } else if (user.role !== 'ADMIN') {
        // Kick non-admins out
        navigate('/');
      }
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchPendingUsers = async () => {
      try {
        const res = await api.get('/admin/users?status=UNDER_REVIEW');
        setUsers(res.data.data.reverse()); // Reverse for stack mapping
      } catch (err) {
        console.error('Failed to fetch pending users', err);
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === 'ADMIN') {
      fetchPendingUsers();
    }
  }, [user]);

  const handleApprove = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/approve`);
    } catch (err) {
      console.error('Failed to approve user', err);
    }
  };

  const handleReject = async (userId, reason) => {
    try {
      await api.post(`/admin/users/${userId}/reject`, { reason });
    } catch (err) {
      console.error('Failed to reject user', err);
    }
  };

  const swipe = async (direction, swipedUser = null) => {
    if (users.length === 0 && !swipedUser) return;
    
    const targetUser = swipedUser || users[users.length - 1];
    setLastDirection(direction);

    if (direction === 'right') {
      // Approve immediately
      await handleApprove(targetUser.id);
      popUser();
    } else if (direction === 'left') {
      // Open reject modal, do not pop user yet
      setUserToReject(targetUser);
      setShowRejectModal(true);
      setLastDirection(null); // Reset direction so card snaps back if cancelled
    }
  };

  const popUser = () => {
    setTimeout(() => {
      setUsers((prev) => prev.slice(0, -1));
      setLastDirection(null);
    }, 300);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) return;
    await handleReject(userToReject.id, rejectReason);
    setShowRejectModal(false);
    setRejectReason('');
    setUserToReject(null);
    setLastDirection('left');
    popUser();
  };

  const cancelReject = () => {
    setShowRejectModal(false);
    setRejectReason('');
    setUserToReject(null);
    // Card snaps back automatically because we haven't popped it
  };

  if (authLoading || loading) {
    return <div className="admin-dashboard loading-state"><p>Loading...</p></div>;
  }

  return (
    <div className="admin-dashboard">
      <nav className="admin-nav">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <ShieldCheck color="#34c759" size={28} />
          <TrendingUp className="logout-icon" size={24} onClick={() => navigate('/admin/analytics')} title="Revenue Analytics" />
        </div>
        <h2 className="gradient-text" style={{ background: 'linear-gradient(135deg, #34c759, #30b0c7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Moderation
        </h2>
        <LogOut className="logout-icon" onClick={logout} />
      </nav>

      <div className="swipe-container">
        <AnimatePresence>
          {users.map((u, index) => {
            const isTop = index === users.length - 1;
            // Hide the card if it's currently being rejected in the modal to prevent visual glitching
            if (showRejectModal && userToReject?.id === u.id) return null;

            return (
              <motion.div
                key={u.id}
                className="admin-card"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  rotate: isTop ? 0 : (index % 2 === 0 ? 2 : -2)
                }}
                exit={{ 
                  x: lastDirection === 'right' ? 1000 : (lastDirection === 'left' ? -1000 : 0),
                  opacity: 0,
                  rotate: lastDirection === 'right' ? 45 : (lastDirection === 'left' ? -45 : 0)
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                drag={isTop ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(e, info) => {
                  if (info.offset.x > 100) swipe('right', u);
                  else if (info.offset.x < -100) swipe('left', u);
                }}
                style={{ zIndex: index }}
              >
                <div className="admin-card-image">
                  <img src={u.photos?.[0]?.url || '/images/profile1.png'} alt={u.firstName} />
                  <div className="status-badge">PENDING</div>
                  <div className="card-gradient-overlay" style={{ background: 'linear-gradient(to top, var(--bg-card) 0%, transparent 100%)', position: 'absolute', bottom: 0, width: '100%', height: '50%' }} />
                </div>
                
                <div className="admin-card-info">
                  <h3>{u.firstName}</h3>
                  <p className="email">{u.email}</p>
                  <p className="bio">{u.bio || 'No bio provided.'}</p>
                </div>

                {isTop && (
                  <div className="admin-action-buttons">
                    <button className="admin-action-btn reject" onClick={() => swipe('left', u)}>
                      <X size={32} />
                    </button>
                    <button className="admin-action-btn approve" onClick={() => swipe('right', u)}>
                      <Check size={32} />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {users.length === 0 && (
          <div className="admin-empty-state">
            <ShieldCheck size={64} />
            <h3>Queue is empty!</h3>
            <p>You've reviewed all pending profiles.</p>
          </div>
        )}
      </div>

      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Reject Profile</h3>
            <p style={{marginBottom: '1rem', color: 'var(--text-secondary)'}}>Please provide a reason for rejecting {userToReject?.firstName}.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Inappropriate photo, spam, underage..."
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-cancel" onClick={cancelReject}>Cancel</button>
              <button className="btn-reject" onClick={confirmReject} disabled={!rejectReason.trim()}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; // Trigger HMR
