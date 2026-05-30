import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, Info, MessageCircle, User, Bell, Sliders, Zap, Star, List, MapPin, ShieldCheck, Sparkles, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import FilterModal from '../components/FilterModal';
import BoostModal from '../components/BoostModal';
import StoriesBar from '../components/StoriesBar';
import TrustBadges from '../components/TrustBadges';
import PremiumLoader from '../components/PremiumLoader';
import './Discovery.css';

const Discovery = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDirection, setLastDirection] = useState(null);
  const { user: currentUser, loading: authLoading } = useAuth();
  const [showFilters, setShowFilters] = useState(false);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [favorites, setFavorites] = useState(new Set());
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [userToWishlist, setUserToWishlist] = useState(null);
  const [wishlists, setWishlists] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate('/login');
    }
  }, [currentUser, authLoading, navigate]);

  useEffect(() => {
    const fetchDiscovery = async () => {
      try {
        const res = await api.get('users/discovery');
        let discoveryUsers = res.data.data.map(u => ({
          id: u.userId,
          name: u.firstName,
          age: u.age,
          bio: u.bio,
          image: u.photos?.[0]?.url || '/images/profile1.png',
          photos: (u.photos || []).map(p => p.url || p),
          interests: (u.interests || []).map(i =>
            typeof i === 'string' ? i : (i?.name || i?.interest?.name || '')
          ).filter(Boolean),
          city: u.city,
          distance: u.distance,
          distanceUnit: u.distanceUnit,
          jobTitle: u.jobTitle,
          company: u.company,
          height: u.height,
          relationshipGoal: u.relationshipGoal,
          isBoosted: u.isBoosted,
          compatibilityScore: u.compatibilityScore ?? 0,
          tier: u.subscriptionTier || 'BASIC',
          prompts: u.prompts || [],
          badges: u.badges || [],
          aiInsight: u.aiInsight || "Your shared energy and community interests suggest a highly compatible and vibrant connection!"
        }));

        const samplePremium = [
          { id: 'p1', name: 'Advika', age: 26, bio: 'Luxury travel blogger & wine enthusiast. Looking for someone to share adventures. 🍷✈️', image: '/images/profile3.png', photos: ['/images/profile3.png', '/images/advika_pose_2.png', '/images/advika_pose_3.png'], tier: 'PLATINUM', city: 'Delhi', interests: ['Travel', 'Wine', 'Photography'], compatibilityScore: 92, aiInsight: "AI Insight: Your shared love for travel and adventure makes you a 92% match!", badges: ['VERIFIED', 'PREMIUM', 'PHONE_VERIFIED', 'KYC_VERIFIED', 'ID_VERIFIED', 'INCOME_VERIFIED'] },
          { id: 'p2', name: 'Kabir', age: 31, bio: 'Venture Capitalist. Amateur astronomer. Always looking for the next big thing. 🚀✨', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800', photos: ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800'], tier: 'PLATINUM', city: 'Gurgaon', interests: ['Tech', 'Business', 'Space'], compatibilityScore: 88, aiInsight: "AI Insight: You both share an analytical mindset and a passion for technology.", badges: ['VERIFIED', 'TOP_PICK', 'PHONE_VERIFIED', 'KYC_VERIFIED', 'ID_VERIFIED', 'INCOME_VERIFIED'] },
          { id: 'p3', name: 'Zoya', age: 28, bio: 'International human rights lawyer. Passionate about art history. ⚖️🎨', image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800', photos: ['https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800', 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'], tier: 'GOLD', city: 'Noida', interests: ['Art', 'Law', 'Reading'], compatibilityScore: 84, aiInsight: "AI Insight: You're both creative souls with matching artistic vibes.", badges: ['VERIFIED', 'SAFETY_FIRST', 'PHONE_VERIFIED', 'KYC_VERIFIED', 'ID_VERIFIED'] },
        ];

        setUsers([...discoveryUsers, ...samplePremium.reverse()]);
      } catch (err) {
        console.error('Failed to fetch discovery', err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchDiscovery();
    }
  }, [currentUser, refreshKey]);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const res = await api.get('users/favorites');
        setFavorites(new Set(res.data.data.map(f => f.targetUserId)));
      } catch (err) {
        console.error('Failed to fetch favorites', err);
      }
    };
    if (currentUser) fetchFavorites();
  }, [currentUser]);

  useEffect(() => {
    const fetchWishlists = async () => {
      try {
        const res = await api.get('users/wishlists');
        setWishlists(res.data.data);
      } catch (err) {
        console.error('Failed to fetch wishlists', err);
      }
    };
    if (currentUser) fetchWishlists();
  }, [currentUser]);

  const handleAddToWishlist = async (wishlistId) => {
    try {
      await api.post('users/wishlists/items', {
        wishlistId,
        targetId: userToWishlist.id
      });
      setShowWishlistModal(false);
      setUserToWishlist(null);
    } catch (err) {
      console.error('Failed to add to wishlist', err);
    }
  };

  const toggleFavorite = (e, userId) => {
    e.stopPropagation();
    const isFavorited = favorites.has(userId);

    setFavorites(prev => {
      const next = new Set(prev);
      if (isFavorited) next.delete(userId);
      else next.add(userId);
      return next;
    });

    const promise = isFavorited
      ? api.delete(`users/favorites/${userId}`)
      : api.post('users/favorites', { targetUserId: userId });

    promise.catch(err => {
      console.error('Failed to toggle favorite', err);
      setFavorites(prev => {
        const next = new Set(prev);
        if (isFavorited) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });
  };

  const swipe = (direction) => {
    if (users.length > 0) {
      const swipedUser = users[users.length - 1];
      setLastDirection(direction);

      if (!swipedUser.id.startsWith('p')) {
        const apiDirection = direction === 'right' ? 'LIKE' : (direction === 'super' ? 'SUPERLIKE' : 'PASS');
        api.post('users/swipes', {
          targetUserId: swipedUser.id,
          direction: apiDirection
        }).catch(err => {
          console.error('Swipe failed', err);
          if (err.response?.status === 403) {
            alert(err.response.data.message || 'Upgrade for more Super Likes!');
          }
        });
      }

      setUsers((prev) => prev.slice(0, -1));
      setTimeout(() => setLastDirection(null), 400);
    }
  };

  const formatDistance = (user) => {
    if (user.distance === null || user.distance === undefined) return 'Distance hidden';
    const unit = (user.distanceUnit || 'KM').toLowerCase();
    return `${user.distance} ${unit} away`;
  };

  if (authLoading || loading) {
    return (
      <div className="discovery-page loading-state">
        <PremiumLoader text="Finding matches around you..." />
      </div>
    );
  }

  return (
    <div className="discovery-page">
      <nav className="app-navbar">
        <button className="aura-orb" onClick={() => navigate('/profile')} aria-label="Profile">
          <div className="orb-core" />
          <div className="orb-ring" />
        </button>

        <h1 className="navbar-wordmark" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          aura<span className="wordmark-dot">.</span>
        </h1>

        <div className="navbar-capsule">
          <button className="capsule-btn" onClick={() => setShowFilters(true)} aria-label="Filters">
            <Sliders size={18} strokeWidth={1.8} />
          </button>
          <div className="capsule-divider" />
          <button className="capsule-btn" onClick={() => navigate('/activity')} aria-label="Notifications">
            <Bell size={18} strokeWidth={1.8} />
            <span className="capsule-notif" />
          </button>
          <div className="capsule-divider" />
          <button className="capsule-btn" onClick={() => navigate('/chat')} aria-label="Messages">
            <MessageCircle size={18} strokeWidth={1.8} />
          </button>
        </div>
      </nav>

      {currentUser && <StoriesBar currentUser={currentUser} />}

      <div className="swipe-container">
        <AnimatePresence>
          {users.map((user, index) => (
            <motion.div
              key={user.id}
              className="user-card"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                rotate: index === users.length - 1 ? 0 : (index % 2 === 0 ? 2 : -2)
              }}
              exit={{
                x: lastDirection === 'right' || lastDirection === 'super' ? 1000 : (lastDirection === 'left' ? -1000 : 0),
                y: lastDirection === 'super' ? -500 : 0,
                opacity: 0,
                rotate: lastDirection === 'right' ? 30 : (lastDirection === 'left' ? -30 : 0)
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              drag={index === users.length - 1 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(e, info) => {
                if (info.offset.x > 100) swipe('right');
                else if (info.offset.x < -100) swipe('left');
                else if (info.offset.y < -100) swipe('super');
              }}
              style={{ zIndex: index }}
            >
              {/* Scrollable profile body — pointer events stopped so drag-swipe on outer div still works */}
              <div
                className="card-scroll-body"
                onPointerDown={e => e.stopPropagation()}
              >
                {(() => {
                  const allPhotos = user.photos?.length > 0 ? user.photos : [user.image];
                  const sections = [];

                  // ── 1. LANDING (Photo 1 + Identity + Bio + Top Interests) ──
                  sections.push(
                    <div key="hero" className="card-hero-photo first">
                      <img src={allPhotos[0]} alt={`${user.name} photo 1`} draggable="false" />
                      
                      <div className="card-top-row">
                        {user.compatibilityScore >= 80 && (
                          <div className={`compat-badge ${user.compatibilityScore >= 90 ? 'high' : ''}`}>
                            <Sparkles size={12} className="compat-icon" />
                            <span className="compat-score">{user.compatibilityScore}%</span>
                            <span className="compat-label">High Match</span>
                          </div>
                        )}
                        {user.tier && user.tier !== 'BASIC' && (
                          <div className={`tier-card-badge ${user.tier.toLowerCase()}`}>
                            <Star size={12} fill="currentColor" />
                            <span>{user.tier}</span>
                          </div>
                        )}
                      </div>

                      <div className="card-top-actions">
                        <button className="card-action-btn" onClick={(e) => { e.stopPropagation(); setUserToWishlist(user); setShowWishlistModal(true); }}>
                          <List size={18} />
                        </button>
                        <button className={`card-action-btn ${favorites.has(user.id) ? 'active-fav' : ''}`} onClick={(e) => toggleFavorite(e, user.id)}>
                          <Star size={18} fill={favorites.has(user.id) ? "currentColor" : "none"} />
                        </button>
                      </div>

                      <div className="card-info landing-info">
                        <div className="card-name-row">
                          <h3>{user.name}{user.age ? `, ${user.age}` : ''}</h3>
                          {user.isBoosted && <Zap size={16} fill="#ffcc00" color="#ffcc00" className="boost-icon" />}
                        </div>
                        
                        <div className="landing-badges">
                          <TrustBadges badges={user.badges} aiInsight={user.aiInsight} size="sm" />
                        </div>

                        <div className="card-location">
                          <MapPin size={13} />
                          <span>{user.city} • {formatDistance(user)}</span>
                        </div>

                        {user.bio && <p className="landing-bio">{user.bio}</p>}

                        <div className="landing-interests">
                          {(user.interests?.length > 0 ? user.interests.slice(0, 3) : ['Travel', 'Wine', 'Music']).map((interest, i) => (
                            <span key={i} className="interest-tag">{interest}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );

                  // ── 2. CONTEXT A: THE BASICS (Directly after landing) ──
                  sections.push(
                    <div key="card-basics" className="detail-card">
                      <span className="detail-card-header">The Basics</span>
                      <div className="about-me-grid">
                        <div className="about-me-pill"><Briefcase size={14} />{user.jobTitle || 'Professional'}</div>
                        <div className="about-me-pill"><MapPin size={14} />{user.company || user.city || 'Nearby'}</div>
                        <div className="about-me-pill">📏 {user.height || '170'} cm</div>
                        {user.relationshipGoal && (
                          <div className="about-me-pill">
                            <Heart size={14} />
                            {user.relationshipGoal.replace(/_/g, ' ').toLowerCase()}
                          </div>
                        )}
                        <div className="about-me-pill">🎓 Graduate</div>
                      </div>
                    </div>
                  );

                  // ── 3. PHOTO 2 ──
                  if (allPhotos[1]) {
                    sections.push(
                      <div key="photo-1" className="card-hero-photo subsequent">
                        <img src={allPhotos[1]} alt={`${user.name} photo 2`} draggable="false" />
                      </div>
                    );
                  }

                  // ── 4. CONTEXT B: MY PROMPTS (Always show at least one for professional look) ──
                  const firstPrompt = user.prompts && user.prompts.length > 0 
                    ? user.prompts[0] 
                    : { question: "My secret talent is...", answer: "Making the perfect espresso martini and finding hidden rooftop bars." };

                  sections.push(
                    <div key="prompt" className="detail-card prompt-section">
                      <span className="prompt-question">{firstPrompt.question}</span>
                      <p className="prompt-answer">{firstPrompt.answer}</p>
                    </div>
                  );

                  // ── 5. PHOTO 3 ──
                  if (allPhotos[2]) {
                    sections.push(
                      <div key="photo-2" className="card-hero-photo subsequent">
                        <img src={allPhotos[2]} alt={`${user.name} photo 3`} draggable="false" />
                      </div>
                    );
                  }

                  // ── 6. CONTEXT C: MORE INTERESTS & LIFESTYLE ──
                  const moreInterests = user.interests?.slice(3) || [];
                  const displayInterests = moreInterests.length > 0 ? moreInterests : ['Art', 'Cooking', 'Hiking', 'Tennis'];

                  sections.push(
                    <div key="card-more-interests" className="detail-card">
                      <span className="detail-card-header">More Interests & Lifestyle</span>
                      <div className="interests-grid">
                        {displayInterests.map((interest, i) => (
                          <span key={i} className="interest-item">{interest}</span>
                        ))}
                      </div>
                    </div>
                  );

                  // ── 7. REMAINING PHOTOS 4+ ──
                  allPhotos.slice(3).forEach((photoUrl, pi) => {
                    sections.push(
                      <div key={`photo-${pi + 3}`} className="card-hero-photo subsequent">
                        <img src={photoUrl} alt={`${user.name} photo ${pi + 4}`} draggable="false" />
                      </div>
                    );
                  });

                  // ── 8. FINAL FOOTER: AI MATCH INSIGHT ──
                  sections.push(
                    <div key="ai-footer" className="ai-match-footer">
                      <div className="ai-footer-badge">
                        <Sparkles size={14} fill="#af52de" color="#af52de" />
                        <span>AI Match Insight</span>
                      </div>
                      <p className="ai-footer-text">
                        {user.aiInsight || `You both share a passion for ${displayInterests[0]} and have a high compatibility in lifestyle goals.`}
                      </p>
                    </div>
                  );

                  return sections;

                  return sections;
                })()}
              </div>

              {/* Super Like flare overlay */}
              <AnimatePresence>
                {lastDirection === 'super' && index === users.length - 1 && (
                  <motion.div
                    className="super-like-flare"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1.2 }}
                    exit={{ opacity: 0 }}
                  >
                    <Star size={100} fill="#007AFF" color="#007AFF" />
                    <h3>SUPER LIKE</h3>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="action-buttons">
        <button className="action-btn dislike" onClick={() => swipe('left')}><X size={28} /></button>
        <button className="action-btn super-like" onClick={() => swipe('super')}>
          <Star size={24} fill="#007AFF" color="#007AFF" />
        </button>
        <button className="action-btn boost" onClick={() => setShowBoostModal(true)}>
          <Zap size={20} fill="#ffcc00" color="#ffcc00" />
        </button>
        <button className="action-btn like" onClick={() => swipe('right')}><Heart size={28} fill="currentColor" /></button>
      </div>

      <FilterModal isOpen={showFilters} onClose={() => setShowFilters(false)} onSave={() => setRefreshKey(k => k + 1)} />
      <BoostModal isOpen={showBoostModal} onClose={() => setShowBoostModal(false)} onBoosted={() => setRefreshKey(k => k + 1)} />
    </div>
  );
};

export default Discovery;
