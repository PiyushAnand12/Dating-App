import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './useAuth';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const socketUrl = window.location.hostname === 'localhost' 
      ? 'http://127.0.0.1:5000' 
      : `http://${window.location.hostname}:5000`;

    const newSocket = io(socketUrl, {
      auth: { token: `Bearer ${token}` },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    window.__socket = newSocket;

    newSocket.on('connect', () => {
      console.log('%c[SOCKET] Connected', 'color: #4ade80; font-weight: bold', newSocket.id);
      setConnected(true);
    });

    newSocket.on('connect_error', (err) => {
      console.error('[SOCKET] Connection Error:', err.message);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('%c[SOCKET] Disconnected:', 'color: #ef4444; font-weight: bold', reason);
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  return React.createElement(SocketContext.Provider, { value: { socket, connected } }, children);
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
