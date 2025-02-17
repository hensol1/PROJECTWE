const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  publishDate: {
    type: Date,
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  slug: {
    type: String,
    unique: true
  }
}, {
  timestamps: true
});

// Generate slug before saving
blogPostSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')  // Remove special characters
      .replace(/\s+/g, '-')            // Replace spaces with hyphens
      .replace(/-+/g, '-')             // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, '');        // Remove hyphens from start and end
      
    // Add a timestamp to make the slug unique if it's not unique
    if (!this.slug) {
      this.slug = Date.now().toString();
    }
  }
  next();
});

module.exports = mongoose.model('BlogPost', blogPostSchema);