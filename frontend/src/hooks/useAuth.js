import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('users/me');
        setUser(res.data.data);
      } catch (err) {
        console.error('Auth check failed', err);
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          localStorage.removeItem('token');
          setToken(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const login = async (credentials) => {
    if (credentials.type === 'test') {
      const testToken = credentials.token || 'test-token';
      localStorage.setItem('token', testToken);
      setToken(testToken);
      // Wait for a tick to ensure token is set before navigation might be triggered by caller
      return { success: true };
    }

    try {
      // Determine correct endpoint based on credentials
      const endpoint = credentials.idToken ? 'auth/google' : 'auth/phone';
      const res = await api.post(endpoint, credentials);
      
      const { accessToken, user: userData } = res.data.data;
      
      localStorage.setItem('token', accessToken);
      setToken(accessToken);
      setUser(userData);
      return res.data;
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  return React.createElement(AuthContext.Provider, { value: { user, token, loading, login, logout } }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
