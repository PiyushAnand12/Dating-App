import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowLeft, TrendingUp, Users, UserMinus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import './AdminAnalytics.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="value" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AdminAnalytics = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login');
      } else if (user.role !== 'ADMIN') {
        navigate('/');
      }
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/admin/analytics/revenue?days=30');
        setData(res.data.data);
      } catch (err) {
        console.error('Failed to fetch analytics', err);
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === 'ADMIN') {
      fetchAnalytics();
    }
  }, [user]);

  if (authLoading || loading) {
    return <div className="admin-analytics loading-state" style={{justifyContent: 'center', alignItems: 'center'}}><p>Loading Analytics...</p></div>;
  }

  if (!data) {
    return <div className="admin-analytics"><p>Failed to load data.</p></div>;
  }

  const { summary, trends } = data;

  return (
    <div className="admin-analytics">
      <nav className="admin-nav">
        <ArrowLeft className="logout-icon" size={28} onClick={() => navigate('/admin')} />
        <h2 className="gradient-text" style={{ background: 'linear-gradient(135deg, #30b0c7, #9b51e0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Analytics
        </h2>
        <div style={{ width: 28 }} /> {/* Spacer to balance flex-between */}
      </nav>

      <div className="analytics-content">
        <div className="kpi-grid">
          <div className="kpi-card mrr">
            <TrendingUp size={24} color="#34c759" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', opacity: 0.2 }} />
            <span className="kpi-title">Total MRR</span>
            <span className="kpi-value">${summary.mrr}</span>
            <span className="kpi-sub">Monthly Recurring Revenue</span>
          </div>

          <div className="kpi-card active">
            <Users size={24} color="#30b0c7" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', opacity: 0.2 }} />
            <span className="kpi-title">Active Subscribers</span>
            <span className="kpi-value">{summary.activeSubscribers}</span>
            <span className="kpi-sub">
              {Object.entries(summary.tierBreakdown).map(([tier, count]) => (
                <span key={tier} style={{ marginRight: '10px' }}>{tier}: {count}</span>
              ))}
            </span>
          </div>

          <div className="kpi-card churn">
            <UserMinus size={24} color="#ff3b30" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', opacity: 0.2 }} />
            <span className="kpi-title">Churn Rate (30d)</span>
            <span className="kpi-value">{summary.churn.ratePercentage}%</span>
            <span className="kpi-sub">{summary.churn.last30Days} cancellations in last 30 days</span>
          </div>
        </div>

        <div className="chart-container">
          <h3>Subscription Trends (Last 30 Days)</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickMargin={10} minTickGap={20} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="new" name="New Subs" stroke="#34c759" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="canceled" name="Cancellations" stroke="#ff3b30" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
