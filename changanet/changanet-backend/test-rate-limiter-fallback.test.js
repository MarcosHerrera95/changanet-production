/**
 * Test script for rate limiting fallback functionality
 * Tests local in-memory storage when Redis is unavailable
 */

const RateLimiterService = require('./src/services/rateLimiterService');

async function testRateLimiterFallback() {
  console.log('Starting rate limiter fallback tests...\n');

  // Test singleton pattern
  console.log('1. Testing singleton pattern...');
  const instance1 = RateLimiterService.getInstance();
  const instance2 = RateLimiterService.getInstance();
  const isSingleton = instance1 === instance2;
  console.log(`   Singleton check: ${isSingleton ? 'PASS' : 'FAIL'} - Same instance returned`);

  // Force fallback by closing Redis connection
  console.log('\n2. Forcing Redis disconnection to test fallback...');
  await instance1.close();
  console.log('   Redis connection closed, using local fallback');

  // Test checkLimit with multiple requests
  console.log('\n3. Testing checkLimit with multiple requests (limit: 5, window: 60s)...');
  const key = 'test:user1';
  const limit = 5;
  const windowSeconds = 60;
  let passedCount = 0;
  let failedCount = 0;

  for (let i = 1; i <= 10; i++) {
    const result = await instance1.checkLimit(key, limit, windowSeconds);
    if (i <= limit) {
      if (result === true) passedCount++;
      else failedCount++;
    } else {
      if (result === false) passedCount++;
      else failedCount++;
    }
    console.log(`   Request ${i}: ${result ? 'ALLOWED' : 'BLOCKED'}`);
  }

  console.log(`   Results: ${passedCount}/10 correct, ${failedCount} incorrect`);

  // Test getLimitInfo
  console.log('\n4. Testing getLimitInfo...');
  const info = await instance1.getLimitInfo(key, limit, windowSeconds);
  console.log(`   Limit info: ${JSON.stringify(info, null, 2)}`);

  const expectedCurrent = 10; // Since we made 10 requests, all within window
  const infoCorrect = info.limit === limit &&
                     info.remaining === 0 &&
                     info.current === expectedCurrent &&
                     typeof info.resetTime === 'number';

  console.log(`   Info correctness: ${infoCorrect ? 'PASS' : 'FAIL'}`);

  // Summary
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Singleton Pattern: ${isSingleton ? 'PASS' : 'FAIL'}`);
  console.log(`Rate Limiting: ${failedCount === 0 ? 'PASS' : 'FAIL'} (${passedCount}/10 correct)`);
  console.log(`Limit Info: ${infoCorrect ? 'PASS' : 'FAIL'}`);
  console.log(`Fallback Mechanism: ${instance1.redisConnected === false ? 'PASS' : 'FAIL'} (Redis disconnected)`);

  const allPassed = isSingleton && failedCount === 0 && infoCorrect && !instance1.redisConnected;
  console.log(`\nOverall Result: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

  return {
    singleton: isSingleton,
    rateLimitingCorrect: failedCount === 0,
    infoCorrect,
    fallbackActive: !instance1.redisConnected,
    allPassed
  };
}

// Run the test
if (require.main === module) {
  testRateLimiterFallback()
    .then(results => {
      console.log('\nTest completed successfully');
      process.exit(results.allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed with error:', error);
      process.exit(1);
    });
}

module.exports = testRateLimiterFallback;
