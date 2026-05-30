import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserX, ArrowLeft, Shield, Search, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './BlockedUsers.css';

const BlockedUsers = () => {
  const navigate = useNavigate();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      const res = await api.get('users/blocks');
      setBlockedUsers(res.data.data);
    } catch (err) {
      console.error('Failed to fetch blocked users', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (targetUserId) => {
    if (!window.confirm('Unblock this user? They will be able to see you again if you swipe on each other.')) return;
    
    try {
      await api.delete(`users/block/${targetUserId}`);
      setBlockedUsers(prev => prev.filter(b => b.target.id !== targetUserId));
    } catch (err) {
      alert('Failed to unblock user');
    }
  };

  const filteredUsers = blockedUsers.filter(b => 
    b.target.firstName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="blocked-users-page">
      <nav className="blocked-nav">
        <ArrowLeft onClick={() => navigate(-1)} className="nav-icon" />
        <h2>Block List</h2>
        <Shield size={20} className="nav-icon active" />
      </nav>

      <main className="blocked-content">
        <header className="blocked-header glass">
          <UserX size={40} className="header-icon" />
          <h1>Managed Blocked Users</h1>
          <p>Users you block won't be able to see your profile, message you, or find you in discovery.</p>
        </header>

        <div className="search-bar glass">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search blocked users..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="blocked-list">
          {loading ? (
            <div className="loading-spinner">Loading...</div>
          ) : filteredUsers.length > 0 ? (
            <AnimatePresence>
              {filteredUsers.map((block) => (
                <motion.div 
                  key={block.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="blocked-item glass"
                >
                  <div className="user-info">
                    <img 
                      src={block.target.avatarUrl || `https://i.pravatar.cc/100?u=${block.target.id}`} 
                      alt={block.target.firstName} 
                    />
                    <div>
                      <h4>{block.target.firstName}</h4>
                      <span>Blocked on {new Date(block.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button className="unblock-btn" onClick={() => handleUnblock(block.target.id)}>
                    <UserCheck size={16} />
                    Unblock
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="empty-state glass">
              <UserX size={48} />
              <p>{searchQuery ? 'No users match your search.' : 'Your block list is empty.'}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BlockedUsers;
