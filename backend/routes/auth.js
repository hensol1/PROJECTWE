const express = require('express');
const router = express.Router();
const cors = require('cors');  // Add this line
const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Handle preflight requests
router.use(cors());  // Use this instead of router.options('*', cors());

// Google authentication
router.post('/google', async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const { name, email, sub } = ticket.getPayload();
    
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        username: name,
        email,
        googleId: sub
      });
      await user.save();
    }

    const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token: jwtToken, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
});

// Rest of your routes (register, login) remain the same

module.exports = router;