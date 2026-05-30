import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Discovery from './pages/Discovery';
import Login from './pages/Login';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import ActivityFeed from './pages/ActivityFeed';
import Favorites from './pages/Favorites';
import Wishlists from './pages/Wishlists';
import WishlistDetails from './pages/WishlistDetails';
import AdminDashboard from './pages/AdminDashboard';
import AdminAnalytics from './pages/AdminAnalytics';
import Stories from './pages/Stories';
import SafetyCenter from './components/SafetyCenter';
import PublicProfile from './pages/PublicProfile';
import BlockedUsers from './pages/BlockedUsers';
import './App.css';

import NotificationLayout from './components/NotificationLayout';
import CallManager from './components/CallManager';

function App() {
  return (
    <Router>
      <NotificationLayout /> 
      <CallManager />
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Discovery />} />
          <Route path="/login" element={<Login />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:id" element={<PublicProfile />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/wishlists" element={<Wishlists />} />
          <Route path="/wishlists/:id" element={<WishlistDetails />} />
          <Route path="/activity" element={<ActivityFeed />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/stories" element={<Stories />} />
          <Route path="/safety" element={<SafetyCenter />} />
          <Route path="/profile/blocked" element={<BlockedUsers />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; // Trigger HMR
