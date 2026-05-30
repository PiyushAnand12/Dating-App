import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleTestLogin = async (token = 'test-token') => {
    await login({ type: 'test', token });
    navigate('/');
  };

  const handlePhoneLogin = async () => {
    await login({ type: 'test', token: 'test-token' });
    navigate('/');
  };

  return (
    <div className="editorial-login-page">
      {/* Cinematic light leaks and noise texture */}
      <div className="cinematic-bg">
        <div className="light-leak leak-1" />
        <div className="light-leak leak-2" />
        <div className="film-grain" />
      </div>

      <div className="login-content-layout">
        
        {/* Top: Confident Brand Identity */}
        <div className="brand-header">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" className="brand-spark-svg">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor" />
            </svg>
          </div>
          <h1 className="brand-name">AURA</h1>
        </div>

        {/* Bottom: Grounded Action Dock */}
        <div className="action-dock">
          <h2 className="dock-title">Enter the experience.</h2>
          
          <div className="dock-buttons">
            <button className="dock-btn btn-solid" onClick={() => handleTestLogin('test-token')}>
              Continue as Dev
            </button>
            <button className="dock-btn btn-solid" onClick={() => handleTestLogin('test-token-2')}>
              Continue as Samantha
            </button>
            <div className="dock-row">
              <button className="dock-btn btn-ghost" onClick={() => handleTestLogin('admin-test-token')}>
                Admin
              </button>
              <div className="dock-divider" />
              <button className="dock-btn btn-ghost" onClick={handlePhoneLogin}>
                Phone
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
