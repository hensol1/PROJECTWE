// cacheMiddleware.js
const NodeCache = require('node-cache');

// Create cache instance
const cache = new NodeCache({ stdTTL: 3600 });

// Performance monitoring
const performanceStats = {
  cacheHits: 0,
  cacheMisses: 0,
  averageResponseTime: 0,
  totalRequests: 0
};

const withCache = (key, ttl = 3600) => async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    // Check cache first
    const cached = cache.get(key);
    if (cached) {
      // Log cache hit
      performanceStats.cacheHits++;
      performanceStats.totalRequests++;
      const responseTime = Date.now() - startTime;
      
      console.log(`Cache HIT for ${key}`, {
        responseTime: `${responseTime}ms`,
        cacheHitRate: `${((performanceStats.cacheHits / performanceStats.totalRequests) * 100).toFixed(2)}%`
      });
      
      return res.json(cached);
    }

    // Cache miss
    performanceStats.cacheMisses++;
    performanceStats.totalRequests++;

    // Store original res.json to intercept
    const originalJson = res.json;
    res.json = function(data) {
      // Store in cache
      cache.set(key, data, ttl);
      
      // Log performance
      const responseTime = Date.now() - startTime;
      console.log(`Cache MISS for ${key}`, {
        responseTime: `${responseTime}ms`,
        cacheHitRate: `${((performanceStats.cacheHits / performanceStats.totalRequests) * 100).toFixed(2)}%`
      });

      return originalJson.call(this, data);
    };

    next();
  } catch (error) {
    console.error('Cache error:', error);
    next();
  }
};

// Function to get performance stats
const getCacheStats = () => ({
  ...performanceStats,
  cacheHitRate: `${((performanceStats.cacheHits / performanceStats.totalRequests) * 100).toFixed(2)}%`,
  itemsInCache: cache.keys().length
});

module.exports = { withCache, getCacheStats };