import React from 'react';
import { ShieldCheck, Zap, ShieldAlert, Award, CheckCircle, Phone, BadgeCheck, Fingerprint, Banknote, Sparkles } from 'lucide-react';
import './TrustBadges.css';

const BADGE_MAP = {
  VERIFIED: {
    icon: <ShieldCheck size={14} />,
    label: 'Verified',
    class: 'badge-verified',
    desc: 'Identity confirmed via video/ID'
  },
  PREMIUM: {
    icon: <Zap size={14} fill="currentColor" />,
    label: 'Premium',
    class: 'badge-premium',
    desc: 'Active Gold/Platinum member'
  },
  SAFETY_FIRST: {
    icon: <ShieldAlert size={14} />,
    label: 'Safe User',
    class: 'badge-safety',
    desc: 'Emergency contacts configured'
  },
  TOP_PICK: {
    icon: <Award size={14} />,
    label: 'Top Member',
    class: 'badge-top',
    desc: 'Highly recommended community member'
  },
  PHONE_VERIFIED: {
    icon: <Phone size={14} />,
    label: 'Phone Verified',
    class: 'badge-phone',
    desc: 'Phone number verified via OTP'
  },
  KYC_VERIFIED: {
    icon: <BadgeCheck size={14} />,
    label: 'KYC Verified',
    class: 'badge-kyc',
    desc: 'Official KYC document verified'
  },
  ID_VERIFIED: {
    icon: <Fingerprint size={14} />,
    label: 'ID Verified',
    class: 'badge-id',
    desc: 'Government ID uploaded and verified'
  },
  INCOME_VERIFIED: {
    icon: <Banknote size={14} />,
    label: 'Income Verified',
    class: 'badge-income',
    desc: 'Annual income verified via official tax/salary documents'
  }
};

const TrustBadges = ({ badges = [], aiInsight = null, size = 'md' }) => {
  if ((!badges || badges.length === 0) && !aiInsight) return null;

  return (
    <div className={`trust-badges-container ${size}`}>
      {badges.map((badge, idx) => {
        const type = typeof badge === 'string' ? badge : badge.type;
        const config = BADGE_MAP[type];
        if (!config) return null;

        return (
          <div key={idx} className={`trust-badge ${config.class}`} title={`${config.label}: ${config.desc}`}>
            {React.cloneElement(config.icon, { size: size === 'sm' ? 12 : 14 })}
            {size !== 'sm' && <span>{config.label}</span>}
          </div>
        );
      })}

      {/* ─── AI Insight Badge (Extreme Right) ─── */}
      {aiInsight && (typeof aiInsight === 'string' ? aiInsight.trim().length > 0 : aiInsight.analysis) && (
        <div className="trust-badge badge-ai-insight interactive">
          <div className="ai-insight-balloon">
            <div className="ai-insight-balloon-inner">
              <Sparkles size={14} color="#ff2d55" style={{ marginRight: '10px', flexShrink: 0 }} />
              <span className="ai-insight-text" style={{ color: '#ffffff', display: 'block' }}>
                <strong>AI Insight:</strong> {(typeof aiInsight === 'string' && aiInsight.length > 0)
                  ? aiInsight.replace(/AI Insight:\s*/i, '')
                  : "Your shared lifestyle patterns and values suggest a deep, multi-layered compatibility!"
                }
              </span>
            </div>
            <div className="ai-insight-balloon-arrow" />
          </div>
          <div className="ai-sparkle-trigger">
            <Sparkles size={size === 'sm' ? 12 : 14} className="ai-sparkle-icon" />
          </div>
        </div>
      )}
    </div>
  );
};

export default TrustBadges;
