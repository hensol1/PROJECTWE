const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  subject: {
    type: String,
    required: true,
    enum: ['feedback', 'suggestion', 'issue']
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'new',
    enum: ['new', 'read', 'responded']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Contact', ContactSchema);