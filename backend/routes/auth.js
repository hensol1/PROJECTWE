const express = require('express');
const router = express.Router();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// CORS options
const corsOptions = {
  origin: ['https://projectwe-tau.vercel.app', 'http://localhost:3000'],
  optionsSuccessStatus: 204
};

router.use(cors());

// Apply CORS to all routes in this file
router.use(cors(corsOptions));

// Handle OPTIONS requests
router.options('*', cors(corsOptions));

// Add this function at the top of the file
const createToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

router.post('/google', async (req, res) => {
  console.log('Received Google auth request');
  const { googleId, email, name } = req.body;

  try {
    if (!googleId || !email) {
      return res.status(400).json({ message: 'Google ID and email are required' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      return res.json({ isNewUser: true });
    }

    const token = createToken(user._id);

    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Authentication failed', error: error.message });
  }
});

router.post('/google/complete-profile', async (req, res) => {
  const { googleId, email, name, username, country } = req.body;

  try {
    if (!googleId || !email || !username || !country) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    user = new User({
      username,
      email,
      googleId,
      country,
      name
    });
    await user.save();

    const token = createToken(user._id);

    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    console.error('Complete profile error:', error);
    res.status(500).json({ message: 'Failed to complete profile', error: error.message });
  }
});

// Register
router.post('/register', async (req, res) => {
  console.log('Received register request:', req.body);
  try {
    const { username, email, password, country } = req.body;

    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({
      username,
      email,
      password,
      country
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const token = createToken(user._id);

    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).send('Server error');
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    let user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const token = createToken(user._id);

    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;