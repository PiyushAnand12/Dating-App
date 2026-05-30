import { io } from 'socket.io-client';
import { generateAccessToken } from '../src/modules/auth/auth.tokens.js';
import { logger } from '../src/config/logger.js';

const PORT = process.env.PORT || 5000;
const URL = `http://localhost:${PORT}`;

const testToken = generateAccessToken({ id: 'test-user-123', role: 'USER' });

const testAuth = async () => {
  console.log('--- Starting Socket.IO Auth Tests ---');

  // 1. Test: No Token
  const socket1 = io(URL, { autoConnect: false });
  socket1.on('connect_error', (err) => {
    console.log('✅ Test 1 (No Token): Connection rejected correctly:', err.message);
    socket1.close();
  });
  socket1.connect();

  // 2. Test: Invalid Token
  const socket2 = io(URL, { 
    auth: { token: 'invalid-token' },
    autoConnect: false 
  });
  socket2.on('connect_error', (err) => {
    console.log('✅ Test 2 (Invalid Token): Connection rejected correctly:', err.message);
    socket2.close();
  });
  socket2.connect();

  // 3. Test: Valid Token
  const socket3 = io(URL, { 
    auth: { token: testToken },
    autoConnect: false 
  });
  
  socket3.on('connect', () => {
    console.log('✅ Test 3 (Valid Token): Connection successful!');
    socket3.disconnect();
    process.exit(0);
  });

  socket3.on('connect_error', (err) => {
    console.error('❌ Test 3 (Valid Token): Connection failed:', err.message);
    socket3.close();
    process.exit(1);
  });

  socket3.connect();
};

// Wait a bit for server if it's restarting
setTimeout(testAuth, 2000);
