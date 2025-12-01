const Redis = require('ioredis');

async function testRedisConnection() {
  console.log('Testing Redis connection...');

  const redis = new Redis('redis://localhost:6379');

  redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  redis.on('error', (err) => {
    console.log('❌ Redis connection failed:', err.message);
    console.log('Error code:', err.code);
  });

  redis.on('ready', () => {
    console.log('✅ Redis is ready');
  });

  // Wait a bit and try a ping
  setTimeout(async () => {
    try {
      const pong = await redis.ping();
      console.log('✅ PING response:', pong);
    } catch (error) {
      console.log('❌ PING failed:', error.message);
    }
    redis.quit();
  }, 2000);
}

testRedisConnection();
