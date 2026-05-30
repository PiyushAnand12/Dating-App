import React from 'react';
import { motion } from 'framer-motion';
import './PremiumLoader.css';

const PremiumLoader = ({ text = "Connecting..." }) => {
  return (
    <div className="premium-loader-container">
      
      <div className="jewel-heart-wrapper">
        {/* Floating, breathing 3D ruby heart */}
        <motion.div
          animate={{ y: [-8, 4, -8] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="jewel-heart-inner"
        >
          <svg viewBox="0 0 40 40" className="jewel-heart-svg">
            <defs>
              {/* Rich 3D Base Gradient (Pure Pinks/Reds, NO Orange) */}
              <linearGradient id="jewelBase" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff4d79" />
                <stop offset="40%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="#80001e" />
              </linearGradient>
              
              {/* Top-Left Specular Highlight for Glass Bevel effect */}
              <linearGradient id="jewelHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
                <stop offset="40%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>

              {/* Bottom-Right Deep Shadow for Volume and Depth */}
              <linearGradient id="jewelInnerShadow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="40%" stopColor="rgba(0,0,0,0)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.85)" />
              </linearGradient>
              
              {/* Rich Ambient Glow */}
              <filter id="neonDropShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="var(--primary)" floodOpacity="0.6" />
              </filter>
            </defs>

            {/* Layer 1: Base Heart with Outer Glow */}
            <path 
              d="M20 35l-2.6-2.4C10 25.6 5 21 5 14.5 5 9.8 8.8 6 13.5 6c2.6 0 5.1 1.2 6.5 3.3C21.4 7.2 23.9 6 26.5 6 31.2 6 35 9.8 35 14.5c0 6.5-5 11.1-12.4 18.1L20 35z" 
              fill="url(#jewelBase)"
              filter="url(#neonDropShadow)"
            />
            
            {/* Layer 2: Inner Core Shadow for 3D Volume */}
            <path 
              d="M20 35l-2.6-2.4C10 25.6 5 21 5 14.5 5 9.8 8.8 6 13.5 6c2.6 0 5.1 1.2 6.5 3.3C21.4 7.2 23.9 6 26.5 6 31.2 6 35 9.8 35 14.5c0 6.5-5 11.1-12.4 18.1L20 35z" 
              fill="url(#jewelInnerShadow)"
            />

            {/* Layer 3: Crisp Glass Bevel/Highlight on the upper edge */}
            <path 
              d="M20 35l-2.6-2.4C10 25.6 5 21 5 14.5 5 9.8 8.8 6 13.5 6c2.6 0 5.1 1.2 6.5 3.3C21.4 7.2 23.9 6 26.5 6 31.2 6 35 9.8 35 14.5c0 6.5-5 11.1-12.4 18.1L20 34.5z" 
              fill="none"
              stroke="url(#jewelHighlight)"
              strokeWidth="1.2"
            />
          </svg>
        </motion.div>
        
        {/* Ambient colored shadow projected on the "floor" beneath the floating heart */}
        <motion.div 
          className="jewel-floor-shadow"
          animate={{ scale: [1, 0.65, 1], opacity: [0.6, 0.15, 0.6] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        />
      </div>

      {/* Extreme minimalist typography */}
      <motion.div 
        className="premium-loader-text-wrapper"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      >
        <p className="premium-loader-text">{text}</p>
      </motion.div>
    </div>
  );
};

export default PremiumLoader;
