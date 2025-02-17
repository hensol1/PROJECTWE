const express = require('express');
const router = express.Router();
const BlogPost = require('../models/BlogPost');
const adminMiddleware = require('../middleware/admin');

// Get latest blog post
router.get('/latest', async (req, res) => {
  try {
    const latestPost = await BlogPost.findOne({ isPublished: true })
      .sort({ publishDate: -1 })
      .select('title content publishDate slug')
      .limit(1);
    res.json(latestPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all blog posts (paginated)
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const posts = await BlogPost.find({ isPublished: true })
      .sort({ publishDate: -1 })
      .skip(skip)
      .limit(limit)
      .select('title content publishDate slug');
    
    const total = await BlogPost.countDocuments({ isPublished: true });
    
    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single blog post by slug
router.get('/:slug', async (req, res) => {
  try {
    const post = await BlogPost.findOne({ 
      slug: req.params.slug,
      isPublished: true 
    });
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new blog post (admin only)
router.post('/', adminMiddleware, async (req, res) => {
    try {
      const blogPost = new BlogPost({
        title: req.body.title,
        content: req.body.content,
        publishDate: req.body.publishDate || new Date(),
        isPublished: req.body.isPublished || false
        // Remove the slug from here as it will be auto-generated
      });
  
      const newPost = await blogPost.save();
      res.status(201).json(newPost);
    } catch (error) {
      console.error('Error creating blog post:', error);
      res.status(400).json({ 
        message: error.message,
        details: error.errors // This will include validation errors
      });
    }
  });
    
// Update blog post (admin only)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    Object.assign(post, req.body);
    const updatedPost = await post.save();
    res.json(updatedPost);
  } catch (error) {
    console.error('Error updating blog post:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete blog post (admin only)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    await post.remove();
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/admin/:id', adminMiddleware, async (req, res) => {
    try {
      const post = await BlogPost.findById(req.params.id);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
      res.json(post);
    } catch (error) {
      console.error('Error fetching blog post:', error);
      res.status(500).json({ message: error.message });
    }
  });  

  router.get('/post/:slug', async (req, res) => {
    try {
      const post = await BlogPost.findOne({ 
        slug: req.params.slug,
        isPublished: true 
      });
      
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
      
      res.json(post);
    } catch (error) {
      console.error('Error fetching blog post:', error);
      res.status(500).json({ message: error.message });
    }
  });
    

module.exports = router;