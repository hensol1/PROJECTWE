const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const matchesRoutes = require('./routes/matches');
const adminRoutes = require('./routes/admin');
const accuracyRouter = require('./routes/accuracy');
const contactRoutes = require('./routes/contact');
const standingsRoutes = require('./routes/standings');
const lineupsRoutes = require('./routes/lineups');
const adminRouter = require('./routes/admin');
const blogRoutes = require('./routes/blog');
const monitoringRoutes = require('./routes/monitoring');
const teamStatsRoutes = require('./routes/teamStats');
const fs = require('fs');

dotenv.config();
require('./scheduledTasks');

// Add this line before mongoose.connect
mongoose.set('strictQuery', false);

const app = express();

// CORS configuration
app.use(cors({
  origin: [
    'https://projectwe-tau.vercel.app', 
    'http://localhost:3000',
    'https://weknowbetter.app',
    'https://www.weknowbetter.app'  // Include www subdomain just in case
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-timezone',
    'Cache-Control',
    'Pragma',
    'Expires'
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Middleware
app.use(express.json());

// Serve static files from the public directory
app.use('/stats', express.static(path.join(__dirname, 'public/stats'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  const statsDir = path.join(__dirname, 'public/stats');
  const statsFilesExist = fs.existsSync(statsDir);
  
  res.json({
    status: 'healthy',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    statsFiles: statsFilesExist ? fs.readdirSync(statsDir).map(file => ({
      name: file,
      size: fs.statSync(path.join(statsDir, file)).size,
      modified: fs.statSync(path.join(statsDir, file)).mtime
    })) : []
  });
});

// Verify stats directory exists
const statsDir = path.join(__dirname, 'public/stats');
if (!fs.existsSync(statsDir)) {
  console.log(`Creating missing stats directory: ${statsDir}`);
  fs.mkdirSync(statsDir, { recursive: true });
}

// Improved static file serving with fallback to API
app.use('/stats', (req, res, next) => {
  const filePath = path.join(__dirname, 'public/stats', req.path);
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.warn(`Static file not found: ${filePath}`);
      
      // If file doesn't exist, try to redirect to API endpoint
      const fileName = path.basename(req.path, '.json');
      
      // Map file names to API endpoints
      const apiEndpoints = {
        'ai-history': '/api/stats/ai/history',
        'league-stats': '/api/stats/ai/league-stats',
        'team-stats': '/api/team-stats',
        'all-teams': '/api/team-stats/all',
        'daily-predictions': '/api/stats/daily-predictions'
      };
      
      if (apiEndpoints[fileName]) {
        console.log(`Redirecting to API endpoint: ${apiEndpoints[fileName]}`);
        return res.redirect(apiEndpoints[fileName]);
      }
    }
    
    // If file exists or no matching API endpoint, serve it with proper headers
    if (req.path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    next();
  });
}, express.static(path.join(__dirname, 'public/stats')));


// Connect to MongoDB with persistent connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB Connected with settings:', {
    serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    serverTime: new Date().toISOString()
  });
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1); // Exit with error if initial connection fails
});

// Handle connection events
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
  // You could implement auto-reconnect logic here if needed
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

// Add this to prevent the Node process from terminating on unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Routes
app.use('/api/matches', matchesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/accuracy', accuracyRouter);
app.use('/api/contact', contactRoutes);
app.use('/api/standings', standingsRoutes);
app.use('/api/stats', require('./routes/stats'));
app.use('/api/lineups', lineupsRoutes);
app.use('/api/admin', adminRouter);
app.use('/api/blog', blogRoutes);
app.use('/api/monitor', monitoringRoutes);
app.use('/api/team-stats', teamStatsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error details:', {
    name: err.name,
    message: err.message,
    stack: err.stack
  });

  // Handle mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      errors: Object.keys(err.errors).reduce((acc, key) => {
        acc[key] = err.errors[key].message;
        return acc;
      }, {})
    });
  }

  // Handle other types of errors
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

// Add error handling middleware for JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  next();
});

// Add a catch-all route for 404s
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;