const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
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

// 404 Not Found middleware
app.use((req, res, next) => {
  res.status(404).send("Sorry, that route doesn't exist.");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;