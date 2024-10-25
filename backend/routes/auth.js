const express = require('express');
const router = express.Router();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const config = require('../config');

// First test the config
console.log('Config test:', {
  emailUser: config.email.user,
  emailPass: config.email.pass ? '******' : 'NOT SET',
  frontendUrl: config.frontend.url
});

const createToken = (userId) => {
  return jwt.sign({ userId }, config.jwt.secret, { expiresIn: '1h' });
};

// CORS options
const corsOptions = {
  origin: ['https://projectwe-tau.vercel.app', 'http://localhost:3000'],
  optionsSuccessStatus: 204
};

router.use(cors());
router.use(cors(corsOptions));
router.options('*', cors(corsOptions));

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.email.user,
    pass: config.email.pass
  },
  debug: true,
  logger: true
});

// Test transporter
transporter.verify((error, success) => {
  if (error) {
    console.error('Transporter verification failed:', error);
  } else {
    console.log('Transporter is ready to send emails');
  }
});

// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('Processing password reset for:', email);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resetToken = jwt.sign({ userId: user._id }, config.jwt.secret, { expiresIn: '1h' });
    
const mailOptions = {
  from: {
    name: 'We Know Better',
    address: config.email.user
  },
  to: email,
  subject: 'Password Reset Request',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        .logo {
          width: 150px;
          margin-bottom: 20px;
          display: block;
          margin-left: auto;
          margin-right: auto;
        }
        .button {
          background-color: #3b82f6;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 5px;
          display: inline-block;
          margin: 20px 0;
        }
        .text-center {
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <img src="https://i.ibb.co/d4t6h9t/11.png" alt="We Know Better Logo" class="logo">
        <h1 style="text-align: center; color: #333;">Password Reset Request</h1>
        <p style="text-align: center; color: #666;">Click the button below to reset your password. This link will expire in 1 hour.</p>
        <div class="text-center">
          <a href="${config.frontend.url}/reset-password?token=${resetToken}" class="button">Reset Password</a>
        </div>
        <p style="text-align: center; color: #666; margin-top: 20px;">
          If you didn't request this password reset, please ignore this email.
        </p>
      </div>
    </body>
    </html>
  `
};

    const info = await transporter.sendMail(mailOptions);
    console.log('Reset email sent:', info.messageId);
    
    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      message: 'Failed to process password reset request',
      error: error.message 
    });
  }
});


// Reset Password Route
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password successfully reset' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

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

    res.json({ token, user: { id: user._id, username: user.username, email: user.email  } });
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

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
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

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;