import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children, userId, token }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId || !token) return;

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    
    const newSocket = io(API_URL, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('🔌 Socket connected!');
      setIsConnected(true);
      newSocket.emit('join', userId);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket disconnected!');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [userId, token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
