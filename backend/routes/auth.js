const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

   const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

       // Generate JWT token here
       const jwtToken = generateToken(user);

       res.json({ token: jwtToken, user: { id: user._id, username: user.username, email: user.email } });
     } catch (error) {
       console.error('Google auth error:', error);
       res.status(500).json({ message: 'Authentication failed' });
     }
   });


// Register
router.post('/register', async (req, res) => {
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

    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: 3600 },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
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

    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: 3600 },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;