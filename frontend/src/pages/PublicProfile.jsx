import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Heart, X, Star, MapPin, Briefcase, 
  Sparkles, Zap, MessageCircle, ShieldCheck, List 
} from 'lucide-react';
import api from '../api/axios';
import TrustBadges from '../components/TrustBadges';
import './PublicProfile.css';

const PublicProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/users/public/${id}`);
        setProfile(res.data.data);
      } catch (err) {
        console.error('Failed to fetch public profile', err);
        setError(err.response?.data?.message || 'Profile not found');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProfile();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="public-profile-page loading">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <Heart fill="var(--primary)" size={48} />
        </motion.div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="public-profile-page error">
        <div className="error-content">
          <ShieldCheck size={48} color="var(--primary)" />
          <h2>Profile Unavailable</h2>
          <p>{error || "This profile has been moved or doesn't exist."}</p>
          <button onClick={() => navigate(-1)} className="back-btn-error">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const allPhotos = profile.photos?.length > 0 
    ? profile.photos.map(p => p.url || p) 
    : ['/images/profile1.png'];

  const sections = [];

  // ── 1. HERO (Photo 1 + Identity + Badges) ──
  sections.push(
    <div key="hero" className="profile-hero">
      <img src={allPhotos[0]} alt={profile.firstName} className="hero-img" />
      <div className="hero-overlay">
        <div className="hero-content">
          <div className="name-row">
            <h1>{profile.firstName}{profile.age ? `, ${profile.age}` : ''}</h1>
            {profile.isBoosted && <Zap size={20} fill="#ffcc00" color="#ffcc00" />}
          </div>
          <div className="trust-row">
            <TrustBadges size="sm" />
          </div>
          <div className="location-row">
            <MapPin size={14} />
            <span>{profile.city || 'Nearby'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ── 2. ABOUT ME ──
  sections.push(
    <div key="about" className="profile-section">
      <h3 className="section-title">About Me</h3>
      <p className="bio-text">{profile.bio || `Just joined! Say hi to ${profile.firstName} to learn more about them.`}</p>
      
      <div className="basics-grid">
        {profile.jobTitle && (
          <div className="basic-pill">
            <Briefcase size={14} />
            <span>{profile.jobTitle}</span>
          </div>
        )}
        {profile.company && (
          <div className="basic-pill">
            <MapPin size={14} />
            <span>{profile.company}</span>
          </div>
        )}
        {profile.relationshipGoal && (
          <div className="basic-pill">
            <Heart size={14} />
            <span>{profile.relationshipGoal.replace(/_/g, ' ').toLowerCase()}</span>
          </div>
        )}
        {profile.height && (
          <div className="basic-pill">
            <span>📏 {profile.height} cm</span>
          </div>
        )}
      </div>
    </div>
  );

  // ── 3. PHOTO 2 (If exists) ──
  if (allPhotos[1]) {
    sections.push(
      <div key="photo2" className="profile-photo-mid">
        <img src={allPhotos[1]} alt="" />
      </div>
    );
  }

  // ── 4. INTERESTS ──
  if (profile.interests?.length > 0) {
    sections.push(
      <div key="interests" className="profile-section">
        <h3 className="section-title">Interests</h3>
        <div className="interests-flex">
          {profile.interests.map((interest, i) => (
            <span key={i} className="interest-tag">{interest}</span>
          ))}
        </div>
      </div>
    );
  }

  // ── 5. PHOTO 3 (If exists) ──
  if (allPhotos[2]) {
    sections.push(
      <div key="photo3" className="profile-photo-mid">
        <img src={allPhotos[2]} alt="" />
      </div>
    );
  }

  // ── 6. REMAINING PHOTOS ──
  allPhotos.slice(3).forEach((url, i) => {
    sections.push(
      <div key={`photo-extra-${i}`} className="profile-photo-mid">
        <img src={url} alt="" />
      </div>
    );
  });

  return (
    <div className="public-profile-page">
      <div className="floating-nav">
        <button onClick={() => navigate(-1)} className="float-btn">
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="profile-scroll-container">
        {sections}
        <div className="scroll-footer">
          <Sparkles size={20} color="var(--primary)" />
          <p>End of {profile.firstName}'s profile</p>
        </div>
      </div>

      <div className="profile-actions">
        <button className="action-circle dislike" onClick={() => navigate(-1)}>
          <X size={24} />
        </button>
        <button className="action-circle chat" onClick={() => navigate('/chat')}>
          <MessageCircle size={24} />
        </button>
        <button className="action-circle like" onClick={() => navigate(-1)}>
          <Heart size={24} fill="currentColor" />
        </button>
      </div>
    </div>
  );
};

export default PublicProfile;
