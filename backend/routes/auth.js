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
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: config.email.user,
    pass: config.email.pass
  }
});

// Test transporter
transporter.verify((error, success) => {
  if (error) {
    console.error('Transporter verification failed:', error);
  } else {
    console.log('Transporter is ready to send emails');
  }
});

// Register
router.post('/register', async (req, res) => {
  console.log('Received register request:', req.body);
  try {
    const { username, email, password, country, city } = req.body;

    // Validate required fields
    if (!username || !email || !password || !country || !city) {
      return res.status(400).json({ msg: 'All fields are required' });
    }

    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({
      username,
      email,
      password,
      country,
      city
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
        isAdmin: user.isAdmin,
        country: user.country,
        city: user.city
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
        isAdmin: user.isAdmin,
        country: user.country,
        city: user.city
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).send('Server error');
  }
});

// Google Auth
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

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email,
        country: user.country,
        city: user.city
      } 
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Authentication failed', error: error.message });
  }
});

router.post('/google/complete-profile', async (req, res) => {
  const { googleId, email, name, username, country, city } = req.body;

  try {
    if (!googleId || !email || !username || !country || !city) {
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
      city,
      name
    });
    await user.save();

    const token = createToken(user._id);

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email,
        country: user.country,
        city: user.city
      } 
    });
  } catch (error) {
    console.error('Complete profile error:', error);
    res.status(500).json({ message: 'Failed to complete profile', error: error.message });
  }
});

// Forgot Password Route (remains the same)
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
      from: `"We Know Better" <${config.email.user}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff;">
              <tr>
                <td style="text-align: center; padding: 20px;">
                  <img src="https://i.ibb.co/d4t6h9t/11.png" alt="We Know Better Logo" style="width: 150px; margin-bottom: 20px;">
                  
                  <h1 style="color: #333333; margin-bottom: 20px;">Password Reset Request</h1>
                  
                  <p style="color: #666666; margin-bottom: 30px;">
                    You requested to reset your password. Click the button below to reset it. 
                    This link will expire in 1 hour.
                  </p>
                  
                  <a href="${config.frontend.url}/reset-password?token=${resetToken}" 
                     style="background-color: #3b82f6; color: white; padding: 12px 24px; 
                            text-decoration: none; border-radius: 5px; display: inline-block; 
                            margin: 20px 0;">
                    Reset Password
                  </a>
                  
                  <p style="color: #666666; margin-top: 30px; font-size: 14px;">
                    If you didn't request this password reset, please ignore this email 
                    or contact support if you have concerns.
                  </p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      // Add a text version as fallback
      text: `
        Reset Your Password
        
        You requested to reset your password. Click the link below to reset it:
        ${config.frontend.url}/reset-password?token=${resetToken}
        
        This link will expire in 1 hour.
        
        If you didn't request this password reset, please ignore this email.
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

// Reset Password Route (remains the same)
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Find user without validation
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password directly using updateOne to bypass validation
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } },
      { runValidators: false }
    );

    res.json({ message: 'Password successfully reset' });
  } catch (error) {
    console.error('Reset password error:', error);
    
    // Better error handling
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    
    res.status(500).json({ 
      message: 'Error resetting password',
      error: error.message 
    });
  }
});

module.exports = router;