// monitoring.js (place in routes folder)
const express = require('express');
const router = express.Router();
const { getCacheStats } = require('../middleware/cacheMiddleware');
const mongoose = require('mongoose');

router.get('/performance', async (req, res) => {
  try {
    // Get MongoDB stats
    const dbStats = await mongoose.connection.db.stats();
    
    // Get index usage stats for matches collection
    const indexStats = await mongoose.connection.db
      .collection('matches')
      .aggregate([{ $indexStats: {} }])
      .toArray();

    // Get cache stats
    const cacheStats = getCacheStats();

    res.json({
      cache: cacheStats,
      database: {
        collections: dbStats.collections,
        indexes: dbStats.indexes,
        totalDocuments: dbStats.objects,
        dataSize: `${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`,
        indexSize: `${(dbStats.indexSize / 1024 / 1024).toFixed(2)} MB`
      },
      indexUsage: indexStats.map(stat => ({
        name: stat.name,
        usageCount: stat.accesses.ops,
        lastUsed: stat.accesses.since
      }))
    });
  } catch (error) {
    console.error('Error fetching performance stats:', error);
    res.status(500).json({ error: 'Failed to fetch performance stats' });
  }
});

module.exports = router;