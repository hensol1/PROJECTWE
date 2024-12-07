const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

router.post('/', async (req, res) => {
  try {
    // Log the incoming request body
    console.log('Received contact form submission:', req.body);

    // Validate required fields
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      console.log('Missing required fields');
      return res.status(400).json({ 
        message: 'All fields are required',
        received: { name, email, subject, message }
      });
    }

    // Create new contact submission
    const contact = new Contact({
      name,
      email,
      subject,
      message
    });

    await contact.save();
    console.log('Contact saved successfully:', contact);

    res.status(201).json({
      success: true,
      message: 'Thank you for your message! We\'ll get back to you soon.'
    });

  } catch (error) {
    console.error('Error in contact submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit contact form. Please try again later.',
      error: error.message
    });
  }
});

// Get all submissions (protected route for admin)
router.get('/submissions', async (req, res) => {
  try {
    const submissions = await Contact.find()
      .sort({ createdAt: -1 });
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;