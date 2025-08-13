const express = require('express');
const router = express.Router();
const AIClient = require('../utils/aiClient');
const AISuggestion = require('../models/AISuggestion');
const RedditPost = require('../models/RedditPost');
const RedditComment = require('../models/RedditComment');
const User = require('../models/User');

const aiClient = new AIClient();

// POST /api/ai/comment-suggestion - Generate comment suggestions for a Reddit post
router.post('/comment-suggestion', async (req, res) => {
  try {
    const { 
      userId, 
      postId, 
      tone = 'helpful', 
      length = 'medium', 
      includeQuestions = true,
      userContext = '',
      count = 1
    } = req.body;

    if (!userId || !postId) {
      return res.status(400).json({ 
        error: 'User ID and post ID are required' 
      });
    }

    // Validate user and post exist
    const [user, post] = await Promise.all([
      User.findById(userId),
      RedditPost.findById(postId)
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (!aiClient.isAvailable()) {
      return res.status(503).json({ 
        error: 'AI client not available. Please check API credentials.' 
      });
    }

    const context = {
      tone,
      length,
      includeQuestions,
      userContext
    };

    let suggestions = [];
    
    if (count === 1) {
      const suggestion = await aiClient.generateCommentSuggestion(post, context);
      suggestions = [suggestion];
    } else {
      suggestions = await aiClient.generateMultipleSuggestions(post, count, context);
    }

    // Save suggestions to database
    const savedSuggestions = [];
    for (const suggestion of suggestions) {
      try {
        const aiSuggestion = new AISuggestion({
          userId,
          postId,
          suggestionText: suggestion.suggestion,
          context: JSON.stringify(context),
          aiModel: suggestion.metadata.model,
          tokens: suggestion.metadata.tokens,
          confidence: suggestion.metadata.confidence,
          category: 'comment'
        });

        const saved = await aiSuggestion.save();
        savedSuggestions.push(saved);
      } catch (saveError) {
        console.error('Error saving AI suggestion:', saveError.message);
      }
    }

    res.json({
      success: true,
      data: {
        suggestions: savedSuggestions,
        post: {
          id: post._id,
          title: post.title,
          subreddit: post.subreddit
        },
        context
      }
    });

  } catch (error) {
    console.error('Comment suggestion error:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate comment suggestion',
      message: error.message 
    });
  }
});

// POST /api/ai/reply-suggestion - Generate reply suggestions for a comment
router.post('/reply-suggestion', async (req, res) => {
  try {
    const { 
      userId, 
      commentId, 
      tone = 'conversational', 
      agree = null,
      addValue = true
    } = req.body;

    if (!userId || !commentId) {
      return res.status(400).json({ 
        error: 'User ID and comment ID are required' 
      });
    }

    // Validate user and comment exist
    const [user, comment] = await Promise.all([
      User.findById(userId),
      RedditComment.findById(commentId).populate('postId')
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (!aiClient.isAvailable()) {
      return res.status(503).json({ 
        error: 'AI client not available. Please check API credentials.' 
      });
    }

    const context = { tone, agree, addValue };
    const suggestion = await aiClient.generateReplySuggestion(comment, comment.postId, context);

    // Save suggestion to database
    const aiSuggestion = new AISuggestion({
      userId,
      postId: comment.postId._id,
      suggestionText: suggestion.suggestion,
      context: JSON.stringify({ ...context, commentId }),
      aiModel: suggestion.metadata.model,
      tokens: suggestion.metadata.tokens,
      confidence: suggestion.metadata.confidence,
      category: 'reply'
    });

    const savedSuggestion = await aiSuggestion.save();

    res.json({
      success: true,
      data: {
        suggestion: savedSuggestion,
        originalComment: {
          id: comment._id,
          body: comment.body,
          author: comment.author
        },
        context
      }
    });

  } catch (error) {
    console.error('Reply suggestion error:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate reply suggestion',
      message: error.message 
    });
  }
});

// POST /api/ai/post-suggestion - Generate post suggestions based on website content
router.post('/post-suggestion', async (req, res) => {
  try {
    const { 
      userId, 
      websiteData, 
      subreddit,
      postType = 'discussion',
      includeLink = true
    } = req.body;

    if (!userId || !websiteData || !subreddit) {
      return res.status(400).json({ 
        error: 'User ID, website data, and subreddit are required' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!aiClient.isAvailable()) {
      return res.status(503).json({ 
        error: 'AI client not available. Please check API credentials.' 
      });
    }

    const context = { postType, includeLink };
    const suggestion = await aiClient.generatePostSuggestion(websiteData, subreddit, context);

    // Create a temporary post record for the suggestion
    const tempPost = new RedditPost({
      userId,
      redditId: `temp_${Date.now()}`,
      title: 'AI Generated Post Suggestion',
      selftext: suggestion.suggestion,
      subreddit: subreddit,
      author: user.username,
      score: 0,
      numComments: 0,
      url: websiteData.url,
      permalink: '',
      createdUtc: Math.floor(Date.now() / 1000)
    });

    const savedPost = await tempPost.save();

    // Save suggestion to database
    const aiSuggestion = new AISuggestion({
      userId,
      postId: savedPost._id,
      suggestionText: suggestion.suggestion,
      context: JSON.stringify({ ...context, websiteUrl: websiteData.url }),
      aiModel: suggestion.metadata.model,
      tokens: suggestion.metadata.tokens,
      confidence: suggestion.metadata.confidence,
      category: 'post'
    });

    const savedSuggestion = await aiSuggestion.save();

    res.json({
      success: true,
      data: {
        suggestion: savedSuggestion,
        post: savedPost,
        websiteData: {
          url: websiteData.url,
          title: websiteData.title
        },
        context
      }
    });

  } catch (error) {
    console.error('Post suggestion error:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate post suggestion',
      message: error.message 
    });
  }
});

// GET /api/ai/suggestions/:userId - Get user's AI suggestions history
router.get('/suggestions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      category, 
      status = 'generated',
      sort = 'createdAt'
    } = req.query;

    const query = { userId };
    if (category) {
      query.category = category;
    }
    if (status) {
      query.status = status;
    }

    const sortOptions = {};
    sortOptions[sort] = -1;

    const suggestions = await AISuggestion.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('postId', 'title subreddit permalink')
      .populate('userId', 'username email');

    const total = await AISuggestion.countDocuments(query);

    res.json({
      success: true,
      data: {
        suggestions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching AI suggestions:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch AI suggestions',
      message: error.message 
    });
  }
});

// PUT /api/ai/suggestions/:id/status - Update suggestion status
router.put('/suggestions/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, status, feedback } = req.body;

    if (!['generated', 'used', 'rejected', 'modified'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be: generated, used, rejected, or modified' 
      });
    }

    const updateData = { status };
    if (feedback) {
      updateData.feedback = feedback;
    }

    const suggestion = await AISuggestion.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true }
    ).populate('postId', 'title subreddit');

    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    res.json({
      success: true,
      data: suggestion,
      message: `Suggestion status updated to ${status}`
    });

  } catch (error) {
    console.error('Error updating suggestion status:', error.message);
    res.status(500).json({ 
      error: 'Failed to update suggestion status',
      message: error.message 
    });
  }
});

// POST /api/ai/analyze-sentiment - Analyze sentiment of text
router.post('/analyze-sentiment', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ 
        error: 'Text is required for sentiment analysis' 
      });
    }

    if (!aiClient.isAvailable()) {
      return res.status(503).json({ 
        error: 'AI client not available. Please check API credentials.' 
      });
    }

    const sentiment = await aiClient.analyzeSentiment(text);

    res.json({
      success: true,
      data: {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        sentiment,
        analyzedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Sentiment analysis error:', error.message);
    res.status(500).json({ 
      error: 'Failed to analyze sentiment',
      message: error.message 
    });
  }
});

// DELETE /api/ai/suggestions/:id - Delete AI suggestion
router.delete('/suggestions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const suggestion = await AISuggestion.findOneAndDelete({
      _id: id,
      userId
    });

    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    res.json({
      success: true,
      message: 'AI suggestion deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting AI suggestion:', error.message);
    res.status(500).json({ 
      error: 'Failed to delete AI suggestion',
      message: error.message 
    });
  }
});

// GET /api/ai/status - Check AI service status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      available: aiClient.isAvailable(),
      message: aiClient.isAvailable() ? 'AI client is ready' : 'AI client not configured'
    }
  });
});

// GET /api/ai/stats/:userId - Get AI usage statistics for user
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await AISuggestion.aggregate([
      { $match: { userId: new require('mongoose').Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalSuggestions: { $sum: 1 },
          totalTokens: { $sum: '$tokens.total' },
          avgConfidence: { $avg: '$confidence' },
          categoryCounts: {
            $push: '$category'
          },
          statusCounts: {
            $push: '$status'
          }
        }
      }
    ]);

    const categoryStats = {};
    const statusStats = {};

    if (stats.length > 0) {
      stats[0].categoryCounts.forEach(cat => {
        categoryStats[cat] = (categoryStats[cat] || 0) + 1;
      });

      stats[0].statusCounts.forEach(status => {
        statusStats[status] = (statusStats[status] || 0) + 1;
      });
    }

    res.json({
      success: true,
      data: {
        totalSuggestions: stats[0]?.totalSuggestions || 0,
        totalTokens: stats[0]?.totalTokens || 0,
        avgConfidence: stats[0]?.avgConfidence || 0,
        categoryBreakdown: categoryStats,
        statusBreakdown: statusStats
      }
    });

  } catch (error) {
    console.error('Error fetching AI stats:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch AI statistics',
      message: error.message 
    });
  }
});

module.exports = router;