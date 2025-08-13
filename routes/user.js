const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ScrapedWebsite = require('../models/ScrapedWebsite');
const RedditPost = require('../models/RedditPost');
const AISuggestion = require('../models/AISuggestion');

// POST /api/user/create - Create a new user
router.post('/create', async (req, res) => {
  try {
    const { username, email, websiteUrl, competitorUrls = [], preferences = {} } = req.body;

    if (!username || !email) {
      return res.status(400).json({ 
        error: 'Username and email are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: 'User with this email or username already exists' 
      });
    }

    const user = new User({
      username,
      email,
      websiteUrl,
      competitorUrls,
      preferences
    });

    const savedUser = await user.save();

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: savedUser._id,
          username: savedUser.username,
          email: savedUser.email,
          websiteUrl: savedUser.websiteUrl,
          competitorUrls: savedUser.competitorUrls,
          preferences: savedUser.preferences,
          createdAt: savedUser.createdAt
        }
      },
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('User creation error:', error.message);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: Object.values(error.errors).map(e => e.message)
      });
    }

    res.status(500).json({ 
      error: 'Failed to create user',
      message: error.message 
    });
  }
});

// GET /api/user/:id - Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          websiteUrl: user.websiteUrl,
          competitorUrls: user.competitorUrls,
          preferences: user.preferences,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch user',
      message: error.message 
    });
  }
});

// PUT /api/user/:id - Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated directly
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;

    const user = await User.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          websiteUrl: user.websiteUrl,
          competitorUrls: user.competitorUrls,
          preferences: user.preferences,
          isActive: user.isActive,
          updatedAt: user.updatedAt
        }
      },
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('User update error:', error.message);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: Object.values(error.errors).map(e => e.message)
      });
    }

    res.status(500).json({ 
      error: 'Failed to update user',
      message: error.message 
    });
  }
});

// DELETE /api/user/:id - Delete user and all associated data
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete all associated data
    await Promise.all([
      ScrapedWebsite.deleteMany({ userId: id }),
      RedditPost.deleteMany({ userId: id }),
      AISuggestion.deleteMany({ userId: id })
    ]);

    // Delete the user
    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'User and all associated data deleted successfully'
    });

  } catch (error) {
    console.error('User deletion error:', error.message);
    res.status(500).json({ 
      error: 'Failed to delete user',
      message: error.message 
    });
  }
});

// GET /api/user/email/:email - Get user by email
router.get('/email/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          websiteUrl: user.websiteUrl,
          competitorUrls: user.competitorUrls,
          preferences: user.preferences,
          isActive: user.isActive,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user by email:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch user',
      message: error.message 
    });
  }
});

// GET /api/user/:id/dashboard - Get user dashboard data
router.get('/:id/dashboard', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get counts and recent data
    const [
      scrapedWebsitesCount,
      redditPostsCount,
      aiSuggestionsCount,
      recentScrapedSites,
      recentRedditPosts,
      recentAISuggestions
    ] = await Promise.all([
      ScrapedWebsite.countDocuments({ userId: id }),
      RedditPost.countDocuments({ userId: id }),
      AISuggestion.countDocuments({ userId: id }),
      ScrapedWebsite.find({ userId: id }).sort({ lastScrapedAt: -1 }).limit(5),
      RedditPost.find({ userId: id }).sort({ fetchedAt: -1 }).limit(5),
      AISuggestion.find({ userId: id }).sort({ createdAt: -1 }).limit(5).populate('postId', 'title subreddit')
    ]);

    // Get AI usage stats
    const aiStats = await AISuggestion.aggregate([
      { $match: { userId: new require('mongoose').Types.ObjectId(id) } },
      {
        $group: {
          _id: null,
          totalTokens: { $sum: '$tokens.total' },
          avgConfidence: { $avg: '$confidence' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          websiteUrl: user.websiteUrl
        },
        stats: {
          scrapedWebsites: scrapedWebsitesCount,
          redditPosts: redditPostsCount,
          aiSuggestions: aiSuggestionsCount,
          totalAITokens: aiStats[0]?.totalTokens || 0,
          avgAIConfidence: aiStats[0]?.avgConfidence || 0
        },
        recent: {
          scrapedSites: recentScrapedSites,
          redditPosts: recentRedditPosts,
          aiSuggestions: recentAISuggestions
        }
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard data',
      message: error.message 
    });
  }
});

// PUT /api/user/:id/preferences - Update user preferences
router.put('/:id/preferences', async (req, res) => {
  try {
    const { id } = req.params;
    const { preferences } = req.body;

    if (!preferences) {
      return res.status(400).json({ 
        error: 'Preferences object is required' 
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { preferences, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        preferences: user.preferences
      },
      message: 'Preferences updated successfully'
    });

  } catch (error) {
    console.error('Preferences update error:', error.message);
    res.status(500).json({ 
      error: 'Failed to update preferences',
      message: error.message 
    });
  }
});

// POST /api/user/:id/competitor-urls - Add competitor URLs
router.post('/:id/competitor-urls', async (req, res) => {
  try {
    const { id } = req.params;
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ 
        error: 'URLs array is required' 
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { 
        $addToSet: { competitorUrls: { $each: urls } },
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        competitorUrls: user.competitorUrls
      },
      message: 'Competitor URLs added successfully'
    });

  } catch (error) {
    console.error('Error adding competitor URLs:', error.message);
    res.status(500).json({ 
      error: 'Failed to add competitor URLs',
      message: error.message 
    });
  }
});

// DELETE /api/user/:id/competitor-urls - Remove competitor URLs
router.delete('/:id/competitor-urls', async (req, res) => {
  try {
    const { id } = req.params;
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ 
        error: 'URLs array is required' 
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { 
        $pullAll: { competitorUrls: urls },
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        competitorUrls: user.competitorUrls
      },
      message: 'Competitor URLs removed successfully'
    });

  } catch (error) {
    console.error('Error removing competitor URLs:', error.message);
    res.status(500).json({ 
      error: 'Failed to remove competitor URLs',
      message: error.message 
    });
  }
});

// GET /api/user - List all users (admin function)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isActive } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const users = await User.find(query)
      .select('username email websiteUrl isActive createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch users',
      message: error.message 
    });
  }
});

// PUT /api/user/:id/status - Toggle user active status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ 
        error: 'isActive must be a boolean value' 
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isActive, updatedAt: new Date() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          isActive: user.isActive
        }
      },
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('Error updating user status:', error.message);
    res.status(500).json({ 
      error: 'Failed to update user status',
      message: error.message 
    });
  }
});

module.exports = router;