import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import api from '../api/axios';
import './FilterModal.css';

const relationshipGoalOptions = [
  { value: 'LONG_TERM_PARTNER', label: 'Long-term partner' },
  { value: 'LONG_TERM_BUT_OPEN', label: 'Long-term, open to short' },
  { value: 'SHORT_TERM_BUT_OPEN', label: 'Short-term, open to long' },
  { value: 'SHORT_TERM_FUN', label: 'Short-term fun' },
  { value: 'NEW_FRIENDS', label: 'New friends' },
  { value: 'STILL_FIGURING_OUT', label: 'Still figuring it out' },
];

const activityOptions = [
  { value: 1, label: 'Last hour' },
  { value: 6, label: 'Last 6 hours' },
  { value: 24, label: 'Last 24 hours' },
  { value: 168, label: 'Last week' },
];

const sortOptions = [
  { value: 'RECENTLY_ACTIVE', label: 'Recent' },
  { value: 'DISTANCE', label: 'Nearest' },
  { value: 'RELEVANCE', label: 'Relevance' },
  { value: 'AGE_ASC', label: 'Youngest' },
  { value: 'AGE_DESC', label: 'Oldest' },
];

const FilterModal = ({ isOpen, onClose, onSave }) => {
  const [preferences, setPreferences] = useState({
    showMe: 'EVERYONE',
    minAge: 18,
    maxAge: 50,
    maxDistanceKm: 50,
    minHeight: 140,
    maxHeight: 210,
    relationshipGoals: [],
    interestIds: [],
    activeWithinHours: 168, // Default 1 week
    sortBy: 'RELEVANCE',
    distanceUnit: 'KM',
    hideDistance: false,
  });
  const [allInterests, setAllInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [prefRes, intRes] = await Promise.all([
            api.get('/users/me'),
            api.get('/interests')
          ]);
          
          const userData = prefRes.data.data;
          if (userData.preferences) {
            setPreferences({
              showMe: userData.preferences.showMe || 'EVERYONE',
              minAge: userData.preferences.minAge || 18,
              maxAge: userData.preferences.maxAge || 50,
              maxDistanceKm: userData.preferences.maxDistanceKm || 50,
              minHeight: userData.preferences.minHeight || 140,
              maxHeight: userData.preferences.maxHeight || 210,
              relationshipGoals: userData.preferences.relationshipGoals || [],
              interestIds: userData.preferences.interestIds || [],
              activeWithinHours: userData.preferences.activeWithinHours || 168,
              sortBy: userData.preferences.sortBy || 'RELEVANCE',
              distanceUnit: userData.preferences.distanceUnit || 'KM',
              hideDistance: userData.preferences.hideDistance || false,
            });
          }
          setAllInterests(intRes.data.data);
        } catch (err) {
          console.error('Failed to fetch filters', err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/users/preferences', preferences);
      onSave();
      onClose();
    } catch (err) {
      console.error('Failed to save preferences', err);
      alert(err.response?.data?.message || 'Failed to save filters. Check your age range.');
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = (id) => {
    setPreferences(prev => {
      const ids = prev.interestIds || [];
      return {
        ...prev,
        interestIds: ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]
      };
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="filter-modal-overlay">
          <motion.div 
            className="filter-modal-content glass"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="filter-header">
              <h3>Filters</h3>
              <button className="close-btn" onClick={onClose}><X /></button>
            </div>

            <div className="filter-body">
              <div className="filter-group">
                <label>Sort By</label>
                <div className="toggle-options flex-wrap">
                  {sortOptions.map(option => (
                    <button 
                      key={option.value}
                      className={preferences.sortBy === option.value ? 'active' : ''}
                      onClick={() => setPreferences(prev => ({ ...prev, sortBy: option.value }))}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <label>Show Me</label>
                <div className="toggle-options">
                  {['MEN', 'WOMEN', 'EVERYONE'].map(option => (
                    <button 
                      key={option}
                      className={preferences.showMe === option ? 'active' : ''}
                      onClick={() => setPreferences(prev => ({ ...prev, showMe: option }))}
                    >
                      {option === 'EVERYONE' ? 'Both' : option.charAt(0) + option.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <label>Age Range</label>
                <div className="range-container">
                  <div className="range-item">
                    <div className="range-label">
                      <span>Min Age</span>
                      <span>{preferences.minAge}</span>
                    </div>
                    <input 
                      type="range" min="18" max="100" 
                      value={preferences.minAge} 
                      onChange={(e) => setPreferences(prev => ({ ...prev, minAge: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="range-item">
                    <div className="range-label">
                      <span>Max Age</span>
                      <span>{preferences.maxAge}</span>
                    </div>
                    <input 
                      type="range" min="18" max="100" 
                      value={preferences.maxAge} 
                      onChange={(e) => setPreferences(prev => ({ ...prev, maxAge: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>

              <div className="filter-group">
                <label>Distance</label>
                <div className="range-item">
                  <div className="range-label">
                    <span>Maximum Distance</span>
                    <span>{preferences.maxDistanceKm}{preferences.distanceUnit.toLowerCase()}</span>
                  </div>
                  <input 
                    type="range" min="1" max={preferences.distanceUnit === 'KM' ? 160 : 100} 
                    value={preferences.maxDistanceKm} 
                    onChange={(e) => setPreferences(prev => ({ ...prev, maxDistanceKm: parseInt(e.target.value) }))}
                  />
                </div>
                
                <div className="sub-group mt-1">
                  <div className="setting-row">
                    <span>Distance Unit</span>
                    <div className="unit-toggle">
                      {['KM', 'MILES'].map(unit => (
                        <button 
                          key={unit}
                          className={preferences.distanceUnit === unit ? 'active' : ''}
                          onClick={() => setPreferences(prev => ({ ...prev, distanceUnit: unit }))}
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="setting-row">
                    <div className="setting-info">
                      <span>Hide My Distance</span>
                      <p>Your distance won't be shown to others</p>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={preferences.hideDistance}
                        onChange={(e) => setPreferences(prev => ({ ...prev, hideDistance: e.target.checked }))}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="filter-group">
                <label>Height Range</label>
                <div className="range-container">
                  <div className="range-item">
                    <div className="range-label">
                      <span>Min Height</span>
                      <span>{preferences.minHeight}cm</span>
                    </div>
                    <input 
                      type="range" min="100" max="250" 
                      value={preferences.minHeight} 
                      onChange={(e) => setPreferences(prev => ({ ...prev, minHeight: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="range-item">
                    <div className="range-label">
                      <span>Max Height</span>
                      <span>{preferences.maxHeight}cm</span>
                    </div>
                    <input 
                      type="range" min="100" max="250" 
                      value={preferences.maxHeight} 
                      onChange={(e) => setPreferences(prev => ({ ...prev, maxHeight: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>

              <div className="filter-group">
                <label>Recently Active</label>
                <div className="toggle-options flex-wrap">
                  {activityOptions.map(option => (
                    <button 
                      key={option.value}
                      className={preferences.activeWithinHours === option.value ? 'active' : ''}
                      onClick={() => setPreferences(prev => ({ ...prev, activeWithinHours: option.value }))}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <label>Relationship Goals</label>
                <div className="interests-grid">
                  {relationshipGoalOptions.map(goal => (
                    <button
                      key={goal.value}
                      className={`interest-chip ${preferences.relationshipGoals.includes(goal.value) ? 'active' : ''}`}
                      onClick={() => {
                        const current = preferences.relationshipGoals || [];
                        const next = current.includes(goal.value) 
                          ? current.filter(g => g !== goal.value) 
                          : [...current, goal.value];
                        setPreferences(prev => ({ ...prev, relationshipGoals: next }));
                      }}
                    >
                      {goal.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <label>Interests</label>
                <div className="interests-grid">
                  {allInterests.map(interest => (
                    <button
                      key={interest.id}
                      className={`interest-chip ${preferences.interestIds.includes(interest.id) ? 'active' : ''}`}
                      onClick={() => toggleInterest(interest.id)}
                    >
                      {interest.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="filter-footer">
              <button className="apply-btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Applying...' : (
                  <>
                    <Save size={20} /> Apply Filters
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FilterModal;
