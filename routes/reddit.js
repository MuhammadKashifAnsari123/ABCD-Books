const express = require('express');
const router = express.Router();
const RedditClient = require('../utils/redditClient');
const RedditPost = require('../models/RedditPost');
const RedditComment = require('../models/RedditComment');
const User = require('../models/User');

const redditClient = new RedditClient();

// POST /api/reddit/search - Search for Reddit posts
router.post('/search', async (req, res) => {
  try {
    const { userId, query, subreddit = 'all', sort = 'relevance', time = 'all', limit = 25 } = req.body;

    if (!userId || !query) {
      return res.status(400).json({ 
        error: 'User ID and search query are required' 
      });
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!redditClient.isAvailable()) {
      return res.status(503).json({ 
        error: 'Reddit client not available. Please check API credentials.' 
      });
    }

    const posts = await redditClient.searchPosts(query, {
      subreddit,
      sort,
      time,
      limit
    });

    // Save posts to database
    const savedPosts = [];
    for (const post of posts) {
      try {
        const existingPost = await RedditPost.findOne({ redditId: post.id });
        if (!existingPost) {
          const newPost = new RedditPost({
            userId,
            redditId: post.id,
            title: post.title,
            selftext: post.selftext,
            subreddit: post.subreddit,
            author: post.author,
            score: post.score,
            upvoteRatio: post.upvoteRatio,
            numComments: post.numComments,
            url: post.url,
            permalink: post.permalink,
            createdUtc: post.createdUtc,
            isVideo: post.isVideo,
            isNsfw: post.isNsfw,
            thumbnail: post.thumbnail,
            domain: post.domain,
            gilded: post.gilded,
            stickied: post.stickied,
            locked: post.locked
          });

          const saved = await newPost.save();
          savedPosts.push(saved);
        } else {
          savedPosts.push(existingPost);
        }
      } catch (saveError) {
        console.error('Error saving Reddit post:', saveError.message);
      }
    }

    res.json({
      success: true,
      data: {
        posts: savedPosts,
        searchParams: { query, subreddit, sort, time, limit }
      }
    });

  } catch (error) {
    console.error('Reddit search error:', error.message);
    res.status(500).json({ 
      error: 'Failed to search Reddit posts',
      message: error.message 
    });
  }
});

// POST /api/reddit/posts/subreddit - Get posts from specific subreddit
router.post('/posts/subreddit', async (req, res) => {
  try {
    const { userId, subreddit, sort = 'hot', time = 'day', limit = 25 } = req.body;

    if (!userId || !subreddit) {
      return res.status(400).json({ 
        error: 'User ID and subreddit are required' 
      });
    }

    if (!redditClient.isAvailable()) {
      return res.status(503).json({ 
        error: 'Reddit client not available. Please check API credentials.' 
      });
    }

    const posts = await redditClient.getSubredditPosts(subreddit, {
      sort,
      time,
      limit
    });

    // Save posts to database
    const savedPosts = [];
    for (const post of posts) {
      try {
        const existingPost = await RedditPost.findOne({ redditId: post.id });
        if (!existingPost) {
          const newPost = new RedditPost({
            userId,
            redditId: post.id,
            title: post.title,
            selftext: post.selftext,
            subreddit: post.subreddit,
            author: post.author,
            score: post.score,
            upvoteRatio: post.upvoteRatio,
            numComments: post.numComments,
            url: post.url,
            permalink: post.permalink,
            createdUtc: post.createdUtc,
            isVideo: post.isVideo,
            isNsfw: post.isNsfw,
            thumbnail: post.thumbnail,
            domain: post.domain,
            gilded: post.gilded,
            stickied: post.stickied,
            locked: post.locked
          });

          const saved = await newPost.save();
          savedPosts.push(saved);
        } else {
          savedPosts.push(existingPost);
        }
      } catch (saveError) {
        console.error('Error saving Reddit post:', saveError.message);
      }
    }

    res.json({
      success: true,
      data: {
        posts: savedPosts,
        subreddit,
        sort,
        time
      }
    });

  } catch (error) {
    console.error('Subreddit posts error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch subreddit posts',
      message: error.message 
    });
  }
});

// GET /api/reddit/posts/:postId/comments - Get comments for a specific post
router.get('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 50, sort = 'best' } = req.query;

    const post = await RedditPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if comments already exist in database
    let comments = await RedditComment.find({ postId }).sort({ score: -1 });

    // If no comments in database, fetch from Reddit
    if (comments.length === 0 && redditClient.isAvailable()) {
      try {
        const redditComments = await redditClient.getPostComments(post.redditId, {
          limit,
          sort
        });

        // Save comments to database
        for (const comment of redditComments) {
          try {
            const newComment = new RedditComment({
              postId,
              redditId: comment.id,
              body: comment.body,
              author: comment.author,
              score: comment.score,
              createdUtc: comment.createdUtc,
              parentId: comment.parentId,
              depth: comment.depth,
              gilded: comment.gilded,
              isSubmitter: comment.isSubmitter,
              stickied: comment.stickied
            });

            const saved = await newComment.save();
            comments.push(saved);
          } catch (saveError) {
            console.error('Error saving comment:', saveError.message);
          }
        }
      } catch (fetchError) {
        console.error('Error fetching comments from Reddit:', fetchError.message);
      }
    }

    res.json({
      success: true,
      data: {
        post,
        comments,
        totalComments: comments.length
      }
    });

  } catch (error) {
    console.error('Comments fetch error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch comments',
      message: error.message 
    });
  }
});

// POST /api/reddit/domain-search - Search for posts mentioning a specific domain
router.post('/domain-search', async (req, res) => {
  try {
    const { userId, domain, limit = 25 } = req.body;

    if (!userId || !domain) {
      return res.status(400).json({ 
        error: 'User ID and domain are required' 
      });
    }

    if (!redditClient.isAvailable()) {
      return res.status(503).json({ 
        error: 'Reddit client not available. Please check API credentials.' 
      });
    }

    const posts = await redditClient.searchByDomain(domain, { limit });

    // Save posts to database
    const savedPosts = [];
    for (const post of posts) {
      try {
        const existingPost = await RedditPost.findOne({ redditId: post.id });
        if (!existingPost) {
          const newPost = new RedditPost({
            userId,
            redditId: post.id,
            title: post.title,
            selftext: post.selftext,
            subreddit: post.subreddit,
            author: post.author,
            score: post.score,
            upvoteRatio: post.upvoteRatio,
            numComments: post.numComments,
            url: post.url,
            permalink: post.permalink,
            createdUtc: post.createdUtc,
            isVideo: post.isVideo,
            isNsfw: post.isNsfw,
            thumbnail: post.thumbnail,
            domain: post.domain,
            gilded: post.gilded,
            stickied: post.stickied,
            locked: post.locked
          });

          const saved = await newPost.save();
          savedPosts.push(saved);
        } else {
          savedPosts.push(existingPost);
        }
      } catch (saveError) {
        console.error('Error saving Reddit post:', saveError.message);
      }
    }

    res.json({
      success: true,
      data: {
        posts: savedPosts,
        domain,
        totalFound: posts.length
      }
    });

  } catch (error) {
    console.error('Domain search error:', error.message);
    res.status(500).json({ 
      error: 'Failed to search posts by domain',
      message: error.message 
    });
  }
});

// GET /api/reddit/posts/:userId - Get user's saved Reddit posts
router.get('/posts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, subreddit, sort = 'fetchedAt' } = req.query;

    const query = { userId };
    if (subreddit) {
      query.subreddit = { $regex: subreddit, $options: 'i' };
    }

    const sortOptions = {};
    sortOptions[sort] = -1;

    const posts = await RedditPost.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await RedditPost.countDocuments(query);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user posts:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch user posts',
      message: error.message 
    });
  }
});

// GET /api/reddit/trending - Get trending topics
router.get('/trending', async (req, res) => {
  try {
    const { subreddits, limit = 10 } = req.query;
    
    if (!redditClient.isAvailable()) {
      return res.status(503).json({ 
        error: 'Reddit client not available. Please check API credentials.' 
      });
    }

    const subredditList = subreddits ? subreddits.split(',') : ['technology', 'business', 'marketing'];
    const trending = await redditClient.getTrendingTopics(subredditList, limit);

    res.json({
      success: true,
      data: {
        trending,
        subreddits: subredditList
      }
    });

  } catch (error) {
    console.error('Trending topics error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch trending topics',
      message: error.message 
    });
  }
});

// DELETE /api/reddit/posts/:id - Delete a saved Reddit post
router.delete('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const post = await RedditPost.findOneAndDelete({
      _id: id,
      userId
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Also delete associated comments
    await RedditComment.deleteMany({ postId: id });

    res.json({
      success: true,
      message: 'Post and associated comments deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting post:', error.message);
    res.status(500).json({ 
      error: 'Failed to delete post',
      message: error.message 
    });
  }
});

// GET /api/reddit/status - Check Reddit API status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      available: redditClient.isAvailable(),
      message: redditClient.isAvailable() ? 'Reddit client is ready' : 'Reddit client not configured'
    }
  });
});

module.exports = router;