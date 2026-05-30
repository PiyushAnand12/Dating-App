import redis from './src/config/redis.js';

async function flush() {
  try {
    console.log('Attempting to flush Redis...');
    await redis.flushall();
    console.log('Redis flushed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to flush Redis:', err.message);
    process.exit(1);
  }
}

flush();
