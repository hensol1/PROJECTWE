const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const matchesRoutes = require('./routes/matches');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const accuracyRoutes = require('./routes/accuracy');

dotenv.config();
require('./scheduledTasks');

// Add this line before mongoose.connect
mongoose.set('strictQuery', false);

const app = express();

// CORS configuration
app.use(cors({
  origin: ['https://projectwe-tau.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-timezone'],  // Added x-timezone
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
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/accuracy', accuracyRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// 404 Not Found middleware
app.use((req, res, next) => {
  res.status(404).send("Sorry, that route doesn't exist.");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;