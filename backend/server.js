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

// Connect to MongoDB
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
.catch(err => console.error('MongoDB connection error:', err));

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