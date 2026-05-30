import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Crown, Settings, LogOut, Save, Plus, X, Image as ImageIcon, Zap, MessageSquare, ShieldAlert, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import BoostModal from '../components/BoostModal';
import PromptManager from '../components/PromptManager';
import { openSubscriptionCheckout } from '../services/razorpay.service';
import PremiumLoader from '../components/PremiumLoader';
import './Profile.css';

const Profile = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const activeSlotRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    bio: '',
    jobTitle: '',
    company: '',
    livingIn: '',
    height: 170,
    relationshipGoal: 'STILL_FIGURING_OUT',
    gender: 'MAN',
    dateOfBirth: '',
  });
  const [preferences, setPreferences] = useState({
    showMe: 'EVERYONE',
    minAge: 18,
    maxAge: 50,
    maxDistanceKm: 50,
    interestIds: [],
    relationshipGoals: [],
    minHeight: 100,
    maxHeight: 250,
    sortBy: 'DISTANCE',
    distanceUnit: 'KM',
    hideDistance: false,
  });
  const [allInterests, setAllInterests] = useState([]);
  const [myInterests, setMyInterests] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [tier, setTier] = useState('BASIC');
  const [isBoosted, setIsBoosted] = useState(false);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState('MONTHLY');

  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const res = await api.get('/interests');
        setAllInterests(res.data.data);
      } catch (err) {
        console.error('Failed to fetch interests', err);
      }
    };
    fetchInterests();
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/users/me');
        const userData = res.data.data;
        
        setProfileData({
          bio: userData.bio || '',
          jobTitle: userData.jobTitle || '',
          company: userData.company || '',
          livingIn: userData.city || '',
          height: userData.height || 170,
          relationshipGoal: userData.relationshipGoal || 'STILL_FIGURING_OUT',
          gender: userData.gender || 'MAN',
          dateOfBirth: userData.dateOfBirth ? userData.dateOfBirth.split('T')[0] : '',
        });

        if (userData.preferences) {
          setPreferences({
            showMe: userData.preferences.showMe || 'EVERYONE',
            minAge: userData.preferences.minAge || 18,
            maxAge: userData.preferences.maxAge || 50,
            maxDistanceKm: userData.preferences.maxDistanceKm || 50,
            interestIds: userData.preferences.interestIds || [],
            relationshipGoals: userData.preferences.relationshipGoals || [],
            minHeight: userData.preferences.minHeight || 100,
            maxHeight: userData.preferences.maxHeight || 250,
            sortBy: userData.preferences.sortBy || 'DISTANCE',
            distanceUnit: userData.preferences.distanceUnit || 'KM',
            hideDistance: userData.preferences.hideDistance || false,
          });
        }

        if (userData.interests) {
          setMyInterests(userData.interests.map(i => i.interestId));
        }

        if (userData.photos) {
          setPhotos(userData.photos);
        }

        if (userData.subscriptionTier) {
          setTier(userData.subscriptionTier);
        }

        if (userData.isBoosted) {
          setIsBoosted(true);
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handlePreferenceChange = (e) => {
    const { name, value } = e.target;
    let val = name.includes('Age') || name.includes('Distance') ? Number(value) : value;
    
    // Prevent invalid age entries on the fly for better UX
    if (name === 'minAge' && val < 18 && value !== '') val = 18;
    if (name === 'maxAge' && val > 100) val = 100;

    setPreferences(prev => ({ ...prev, [name]: val }));
  };

  const handleSave = async () => {
    // 0. Validation check
    if (preferences.minAge < 18) {
      alert('Minimum age must be at least 18 according to our safety guidelines.');
      return;
    }
    if (preferences.minAge > preferences.maxAge) {
      alert('Minimum age cannot be greater than maximum age.');
      return;
    }

    setSaving(true);
    try {
      // 1. Update Core Profile
      await api.put('/users/me', {
        bio: profileData.bio,
        jobTitle: profileData.jobTitle,
        company: profileData.company,
        livingIn: profileData.livingIn,
        height: Number(profileData.height),
        relationshipGoal: profileData.relationshipGoal,
        gender: profileData.gender,
        dateOfBirth: profileData.dateOfBirth,
      });

      // 2. Update My Interests (Selections)
      if (myInterests.length > 0) {
        await api.post('/interests', { interestIds: myInterests });
      }

      // 3. Update Discovery Preferences (including interest filters)
      await api.post('/users/preferences', preferences);

      // Successfully saved - redirect to Discovery Deck
      navigate('/'); 
    } catch (err) {
      console.error('Failed to save profile', err);
      const msg = err.response?.data?.message || 'Validation failed. Please ensure all fields are correct (Age must be 18+).';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUpgrade = async (selectedTier) => {
    try {
      // 1. Get Razorpay Config
      const configRes = await api.get('/payments/config');
      const { keyId } = configRes.data.data;

      // 2. Create Subscription Session
      const sessionRes = await api.post('/payments/create-checkout-session', { 
        tier: selectedTier,
        duration: selectedDuration 
      });
      const { subscriptionId } = sessionRes.data.data;

      // 3. Open Razorpay Modal
      await openSubscriptionCheckout({
        subscriptionId,
        keyId,
        prefill: {
          name: user?.firstName || '',
          email: user?.email || '',
        },
        onSuccess: async (response) => {
          // 4. Verify on backend
          try {
            await api.post('/payments/verify-payment', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
            });
            alert(`Successfully upgraded to ${selectedTier}!`);
            window.location.reload(); // Refresh to show new tier
          } catch (verifyErr) {
            console.error('Verification failed', verifyErr);
            alert('Payment successful but verification failed. Please contact support.');
          }
        },
        onDismiss: () => {
          console.log('Payment modal dismissed');
        }
      });
    } catch (err) {
      console.error('Failed to initiate checkout', err);
      alert(err.response?.data?.message || 'Failed to initiate checkout');
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will lose premium features at the end of the billing period.')) {
      return;
    }
    
    try {
      await api.delete('/payments/cancel-subscription');
      alert('Subscription cancelled successfully. It will remain active until the end of the current period.');
      window.location.reload();
    } catch (err) {
      console.error('Failed to cancel subscription', err);
      alert(err.response?.data?.message || 'Failed to cancel subscription');
    }
  };

  const [uploadingSlot, setUploadingSlot] = useState(null);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    const targetPosition = activeSlotRef.current;
    if (!file || targetPosition === null) return;

    setUploadingSlot(targetPosition);
    console.log(`[GodMode] Starting upload. Slot: ${targetPosition}, File: ${file.name}, Size: ${file.size}`);
    
    const formData = new FormData();
    formData.append('avatar', file); 
    formData.append('position', targetPosition); 

    try {
      const res = await api.post('/media/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log(`[GodMode] Server Response:`, res.data);
      
      console.log(`[Frontend] Upload successful! Fetching updated profile...`);
      // Refresh photos - add timestamp to bypass any caching
      const updatedUser = await api.get(`/users/me?t=${Date.now()}`);
      console.log(`[GodMode] Refresh Success. Full Photos Array:`, updatedUser.data.data.photos);
      setPhotos(updatedUser.data.data.photos || []);
    } catch (err) {
      console.error('Failed to upload photo', err);
      alert('Upload failed. Please check file size and type.');
    } finally {
      setUploadingSlot(null);
      e.target.value = ''; // Reset input to allow same file selection
    }
  };

  const handleDeletePhoto = async (e, photoId) => {
    if (e) e.stopPropagation();
    if (!photoId) {
      console.warn(`[GodMode] Cannot delete: ID is missing.`);
      alert('This photo cannot be deleted yet (it might be a placeholder). Please try uploading a new photo over it.');
      return;
    }
    console.log(`[GodMode] Attempting delete for ID: ${photoId}`);
    try {
      await api.delete(`/media/${photoId}`);
      console.log(`[GodMode] Delete successful.`);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (err) {
      console.error(`[GodMode] Delete FAILED:`, err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="profile-page loading-state">
        <PremiumLoader text="Polishing your profile..." />
      </div>
    );
  }

  const primaryPhoto = (photos && photos.length > 0 && photos[0].imageUrl) ? photos[0].imageUrl : 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=800&q=80';

  // Safeguard: Ensure every photo has an imageUrl
  const safePhotos = photos.map(p => ({
    ...p,
    imageUrl: p.imageUrl || 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&q=80&w=800'
  }));
  return (
    <div className="profile-page premium-layout">
      {/* Premium Hero Section */}
      <div className="premium-hero">
        <nav className="hero-nav">
          <button className="icon-btn glass-blur" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h2 className="nav-title">Settings</h2>
          <button className="icon-btn glass-blur danger" onClick={logout}>
            <LogOut size={18} />
          </button>
        </nav>
        <div className="hero-content">
          <div className="hero-avatar">
            <img 
              src={primaryPhoto} 
              alt="Profile" 
              onError={(e) => { 
                e.target.onerror = null; 
                e.target.src = 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=400&q=80';
                // Also update the hero-bg if possible, or just let it be
              }}
            />
            {tier !== 'BASIC' && (
              <div className={`hero-tier-badge ${tier.toLowerCase()}`}>
                <Crown size={14} fill="currentColor" /> {tier}
              </div>
            )}
          </div>
          <div className="hero-user-details">
            <h1 className="hero-name">{user?.firstName || 'User'}</h1>
            <p className="hero-email">{user?.email}</p>
          </div>
          <div className="hero-actions">
            {isBoosted ? (
              <div className="hero-btn boost-active">
                <Zap size={16} fill="#ffcc00" color="#ffcc00" /> Boost Active
              </div>
            ) : (
              <button className="hero-btn boost-btn" onClick={() => setShowBoostModal(true)}>
                <Zap size={16} fill="currentColor" /> Get Boost
              </button>
            )}
            <button className="hero-btn edit-btn" onClick={() => document.getElementById('details-section').scrollIntoView({behavior: 'smooth'})}>
              Edit Info
            </button>
          </div>
        </div>
      </div>

      <div className="subscription-section">
        <div className="duration-selector-container">
          <div className="segmented-control">
            {['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'].map(d => (
              <button 
                key={d}
                className={`segment-btn ${selectedDuration === d ? 'active' : ''}`}
                onClick={() => setSelectedDuration(d)}
              >
                {d.charAt(0) + d.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="sub-cards-container">
          {/* Free Plan */}
          <div className={`sub-card basic ${tier === 'BASIC' ? 'active-tier' : ''}`}>
            <div className="sub-card-icon-wrapper">
              <Settings size={32} color="#8e8e93" />
            </div>
            <h3>Free</h3>
            <ul className="sub-features">
              <li>Basic matching</li>
              <li>Limited swipes (50/day)</li>
              <li>Ads shown</li>
            </ul>
            {tier === 'BASIC' && <div className="current-plan-tag">Current Plan</div>}
          </div>

          {/* Gold Plan */}
          <div className={`sub-card gold ${tier === 'GOLD' ? 'active-tier' : ''}`}>
            <div className="popular-badge">Most Popular</div>
            <div className="sub-card-icon-wrapper">
              <Crown size={32} color="#ffd700" />
            </div>
            <h3>Gold</h3>
            <ul className="sub-features">
              <li>Unlimited swipes</li>
              <li>See who liked you</li>
              <li>5 boosts/month</li>
              <li>No ads</li>
            </ul>
            {tier === 'BASIC' ? (
              <button onClick={() => handleUpgrade('GOLD')}>
                Upgrade ({selectedDuration.toLowerCase()})
              </button>
            ) : tier === 'GOLD' ? (
              <>
                <div className="current-plan-tag">Current Plan</div>
                <button className="cancel-sub-btn" onClick={handleCancelSubscription}>
                  Cancel Subscription
                </button>
              </>
            ) : null}
          </div>

          {/* Platinum Plan */}
          <div className={`sub-card platinum ${tier === 'PLATINUM' ? 'active-tier' : ''}`}>
            <div className="sub-card-icon-wrapper">
              <Crown size={32} color="#e5e5ea" />
            </div>
            <h3>Platinum</h3>
            <ul className="sub-features">
              <li>All Gold features</li>
              <li>Priority support</li>
              <li>10 boosts/month</li>
              <li>Incognito mode</li>
            </ul>
            {tier !== 'PLATINUM' ? (
              <button onClick={() => handleUpgrade('PLATINUM')}>
                Upgrade ({selectedDuration.toLowerCase()})
              </button>
            ) : (
              <>
                <div className="current-plan-tag">Current Plan</div>
                <button className="cancel-sub-btn" onClick={handleCancelSubscription}>
                  Cancel Subscription
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3><ImageIcon size={20} /> Manage Photos</h3>
        <div className="photo-grid">
          {[...Array(6)].map((_, index) => {
            // FIND the photo that belongs to this specific position index
            const photo = safePhotos.find(p => p.position === index);
            if (photo) console.log(`[GodMode] Rendering Slot ${index} with photo:`, photo);
            
            return (
              <div key={index} className={`photo-slot ${!photo ? 'empty' : ''}`}>
                {photo ? (
                  <>
                    <img src={photo.imageUrl} alt={`User photo ${index + 1}`} />
                    <button 
                      type="button"
                      className="delete-btn" 
                      onClick={(e) => handleDeletePhoto(e, photo.id)}
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <div className="add-photo-trigger" onClick={() => {
                    activeSlotRef.current = index;
                    fileInputRef.current?.click();
                  }}>
                    {uploadingSlot === index ? (
                      <div className="slot-loader">
                        <div className="spinner-small"></div>
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      <Plus size={32} className="add-icon" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handlePhotoUpload} 
          style={{ display: 'none' }}
        />
      </div>

      <div className="form-section">
        <h3><MessageSquare size={20} /> Icebreakers</h3>
        <p className="section-hint">Answer these fun prompts to help matches start a conversation with you!</p>
        <PromptManager />
      </div>

      <div id="details-section" className="form-section">
        <h3><Settings size={20} /> Profile Details</h3>
        <div className="settings-card-group">
        
        <div className="form-group">
          <label>Bio</label>
          <textarea 
            className="form-control" 
            name="bio"
            value={profileData.bio} 
            onChange={handleProfileChange}
            placeholder="A little bit about you..."
          />
        </div>
        
        <div className="form-group">
          <label>Job Title</label>
          <input 
            type="text" 
            className="form-control" 
            name="jobTitle"
            value={profileData.jobTitle} 
            onChange={handleProfileChange}
          />
        </div>

        <div className="form-group">
          <label>Company</label>
          <input 
            type="text" 
            className="form-control" 
            name="company"
            value={profileData.company} 
            onChange={handleProfileChange}
          />
        </div>

        <div className="form-group">
          <label>City</label>
          <input 
            type="text" 
            className="form-control" 
            name="livingIn"
            value={profileData.livingIn} 
            onChange={handleProfileChange}
          />
        </div>

        <div className="form-group">
          <label>Gender</label>
          <select 
            className="form-control" 
            name="gender"
            value={profileData.gender} 
            onChange={handleProfileChange}
          >
            <option value="MAN">Man</option>
            <option value="WOMAN">Woman</option>
            <option value="NON_BINARY">Non-Binary</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Date of Birth</label>
          <input 
            type="date" 
            className="form-control" 
            name="dateOfBirth"
            value={profileData.dateOfBirth} 
            onChange={handleProfileChange}
          />
        </div>

        <div className="form-group">
          <label>Height (cm): {profileData.height}</label>
          <input 
            type="range" 
            name="height"
            min="100" max="250"
            value={profileData.height} 
            onChange={handleProfileChange}
            style={{ width: '100%' }}
          />
        </div>

        <div className="form-group">
          <label>Relationship Goal</label>
          <select 
            className="form-control" 
            name="relationshipGoal"
            value={profileData.relationshipGoal} 
            onChange={handleProfileChange}
          >
            <option value="LONG_TERM_PARTNER">Long-term partner</option>
            <option value="LONG_TERM_BUT_OPEN">Long-term, open to short</option>
            <option value="SHORT_TERM_BUT_OPEN">Short-term, open to long</option>
            <option value="SHORT_TERM_FUN">Short-term fun</option>
            <option value="NEW_FRIENDS">New friends</option>
            <option value="STILL_FIGURING_OUT">Still figuring it out</option>
          </select>
        </div>
        </div>
      </div>

      <div className="form-section">
        <h3>My Interests (Select up to 10)</h3>
        <p className="section-hint">These will be shown on your profile to help people get to know you.</p>
        <div className="interests-selection-grid">
          {allInterests.map(interest => (
            <button
              key={interest.id}
              className={`interest-chip ${myInterests.includes(interest.id) ? 'active' : ''}`}
              onClick={() => {
                if (myInterests.includes(interest.id)) {
                  setMyInterests(prev => prev.filter(id => id !== interest.id));
                } else if (myInterests.length < 10) {
                  setMyInterests(prev => [...prev, interest.id]);
                }
              }}
            >
              {interest.name}
            </button>
          ))}
        </div>
      </div>

      <div className="form-section">
        <h3>Discovery Preferences</h3>
        <div className="settings-card-group">
        
        <div className="form-group">
          <label>Show Me</label>
          <div className="segmented-control">
            {['MEN', 'WOMEN', 'EVERYONE'].map(option => (
              <button 
                key={option}
                className={`segment-btn ${preferences.showMe === option ? 'active' : ''}`}
                onClick={() => setPreferences(prev => ({ ...prev, showMe: option }))}
              >
                {option === 'EVERYONE' ? 'Everyone' : (option === 'MEN' ? 'Men' : 'Women')}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Age Range: {preferences.minAge} - {preferences.maxAge}</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input 
              type="number" 
              className="form-control" 
              name="minAge"
              min="18" max="100"
              value={preferences.minAge} 
              onChange={handlePreferenceChange}
            />
            <input 
              type="number" 
              className="form-control" 
              name="maxAge"
              min="18" max="100"
              value={preferences.maxAge} 
              onChange={handlePreferenceChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Maximum Distance (km): {preferences.maxDistanceKm}</label>
          <input 
            type="range" 
            name="maxDistanceKm"
            min="1" max="500"
            value={preferences.maxDistanceKm} 
            onChange={handlePreferenceChange}
            style={{ width: '100%' }}
          />
        </div>

        <div className="form-group">
          <label>Height Range: {preferences.minHeight}cm - {preferences.maxHeight}cm</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input 
              type="number" 
              className="form-control" 
              name="minHeight"
              min="100" max="250"
              value={preferences.minHeight} 
              onChange={handlePreferenceChange}
              placeholder="Min"
            />
            <input 
              type="number" 
              className="form-control" 
              name="maxHeight"
              min="100" max="250"
              value={preferences.maxHeight} 
              onChange={handlePreferenceChange}
              placeholder="Max"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Sort By</label>
          <select 
            className="form-control" 
            name="sortBy"
            value={preferences.sortBy} 
            onChange={handlePreferenceChange}
          >
            <option value="DISTANCE">Distance</option>
            <option value="RECENTLY_ACTIVE">Recently Active</option>
            <option value="AGE_ASC">Age (Youngest First)</option>
            <option value="AGE_DESC">Age (Oldest First)</option>
            <option value="RELEVANCE">Relevance</option>
          </select>
        </div>
        </div>

        <div className="settings-card-group" style={{ marginTop: '1.5rem' }}>
        <div className="form-group toggle-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ margin: 0 }}>Hide My Distance</label>
          <div className="ios-switch">
             <input 
               type="checkbox" 
               checked={preferences.hideDistance} 
               onChange={(e) => setPreferences(prev => ({ ...prev, hideDistance: e.target.checked }))}
             />
             <span className="ios-slider"></span>
          </div>
        </div>
        </div>

        <div className="settings-card-group" style={{ marginTop: '2rem' }}>
        <div className="form-group">
          <label style={{ marginBottom: '8px' }}>Target Relationship Goals</label>
          <p className="section-hint" style={{ marginBottom: '1rem' }}>Only see people looking for these:</p>
          <div className="interests-selection-grid">
            {[
              { id: 'LONG_TERM_PARTNER', name: 'Long-term' },
              { id: 'LONG_TERM_BUT_OPEN', name: 'LT, open to ST' },
              { id: 'SHORT_TERM_BUT_OPEN', name: 'ST, open to LT' },
              { id: 'SHORT_TERM_FUN', name: 'Short-term fun' },
              { id: 'NEW_FRIENDS', name: 'New friends' },
              { id: 'STILL_FIGURING_OUT', name: 'Still figuring out' },
            ].map(goal => (
              <button
                key={goal.id}
                className={`interest-chip filter ${preferences.relationshipGoals?.includes(goal.id) ? 'active' : ''}`}
                onClick={() => {
                  const currentGoals = preferences.relationshipGoals || [];
                  let nextGoals;
                  if (currentGoals.includes(goal.id)) {
                    nextGoals = currentGoals.filter(id => id !== goal.id);
                  } else {
                    nextGoals = [...currentGoals, goal.id];
                  }
                  setPreferences(prev => ({ ...prev, relationshipGoals: nextGoals }));
                }}
              >
                {goal.name}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label style={{ marginBottom: '4px' }}>Filter by Interests</label>
          <p className="section-hint" style={{ marginBottom: '1.5rem' }}>Only see people who have these interests.</p>
          <div className="interests-selection-grid">
            {allInterests.map(interest => (
              <button
                key={interest.id}
                className={`interest-chip filter ${preferences.interestIds?.includes(interest.id) ? 'active' : ''}`}
                onClick={() => {
                  const currentIds = preferences.interestIds || [];
                  let nextIds;
                  if (currentIds.includes(interest.id)) {
                    nextIds = currentIds.filter(id => id !== interest.id);
                  } else {
                    nextIds = [...currentIds, interest.id];
                  }
                  setPreferences(prev => ({ ...prev, interestIds: nextIds }));
                }}
              >
                {interest.name}
              </button>
            ))}
          </div>
        </div>
        </div>
        <button className="safety-center-btn" onClick={() => navigate('/safety')}>
          <ShieldAlert size={20} /> Safety Center
        </button>

        <button className="save-btn" onClick={handleSave} disabled={saving}>
          <Save size={20} /> {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      <BoostModal 
        isOpen={showBoostModal}
        onClose={() => setShowBoostModal(false)}
        onBoosted={() => setIsBoosted(true)}
      />
    </div>
  );
};

export default Profile;
