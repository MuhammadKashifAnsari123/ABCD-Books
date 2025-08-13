const snoowrap = require('snoowrap');

class RedditClient {
  constructor() {
    this.reddit = null;
    this.initializeClient();
  }

  initializeClient() {
    if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
      console.warn('Reddit API credentials not found. Reddit functionality will be limited.');
      return;
    }

    try {
      this.reddit = new snoowrap({
        userAgent: process.env.REDDIT_USER_AGENT || 'WebScraperBot/1.0.0',
        clientId: process.env.REDDIT_CLIENT_ID,
        clientSecret: process.env.REDDIT_CLIENT_SECRET,
        username: process.env.REDDIT_USERNAME,
        password: process.env.REDDIT_PASSWORD
      });

      // Configure request delay to avoid rate limiting
      this.reddit.config({ requestDelay: 1000 });
      
      console.log('Reddit client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Reddit client:', error.message);
    }
  }

  // Search for posts related to a specific topic/website
  async searchPosts(query, options = {}) {
    if (!this.reddit) {
      throw new Error('Reddit client not initialized');
    }

    const {
      subreddit = 'all',
      sort = 'relevance',
      time = 'all',
      limit = 25
    } = options;

    try {
      let searchResults;
      
      if (subreddit === 'all') {
        searchResults = await this.reddit.search({
          query,
          sort,
          time,
          limit
        });
      } else {
        const sub = await this.reddit.getSubreddit(subreddit);
        searchResults = await sub.search({
          query,
          sort,
          time,
          limit
        });
      }

      return searchResults.map(post => this.formatPost(post));
    } catch (error) {
      console.error('Error searching Reddit posts:', error.message);
      throw error;
    }
  }

  // Get posts from specific subreddit
  async getSubredditPosts(subredditName, options = {}) {
    if (!this.reddit) {
      throw new Error('Reddit client not initialized');
    }

    const {
      sort = 'hot', // hot, new, top, rising
      time = 'day', // hour, day, week, month, year, all
      limit = 25
    } = options;

    try {
      const subreddit = await this.reddit.getSubreddit(subredditName);
      let posts;

      switch (sort) {
        case 'hot':
          posts = await subreddit.getHot({ limit });
          break;
        case 'new':
          posts = await subreddit.getNew({ limit });
          break;
        case 'top':
          posts = await subreddit.getTop({ time, limit });
          break;
        case 'rising':
          posts = await subreddit.getRising({ limit });
          break;
        default:
          posts = await subreddit.getHot({ limit });
      }

      return posts.map(post => this.formatPost(post));
    } catch (error) {
      console.error(`Error fetching posts from r/${subredditName}:`, error.message);
      throw error;
    }
  }

  // Get comments for a specific post
  async getPostComments(postId, options = {}) {
    if (!this.reddit) {
      throw new Error('Reddit client not initialized');
    }

    const {
      sort = 'best', // confidence, top, new, controversial, old, random, qa, live
      limit = 50
    } = options;

    try {
      const submission = await this.reddit.getSubmission(postId);
      await submission.expandReplies({ limit, depth: 3 });
      
      const comments = submission.comments;
      return this.extractComments(comments);
    } catch (error) {
      console.error(`Error fetching comments for post ${postId}:`, error.message);
      throw error;
    }
  }

  // Format post data
  formatPost(post) {
    return {
      id: post.id,
      title: post.title,
      selftext: post.selftext || '',
      subreddit: post.subreddit.display_name,
      author: post.author ? post.author.name : '[deleted]',
      score: post.score,
      upvoteRatio: post.upvote_ratio,
      numComments: post.num_comments,
      url: post.url,
      permalink: `https://reddit.com${post.permalink}`,
      createdUtc: post.created_utc,
      isVideo: post.is_video,
      isNsfw: post.over_18,
      thumbnail: post.thumbnail !== 'self' ? post.thumbnail : null,
      domain: post.domain,
      gilded: post.gilded,
      stickied: post.stickied,
      locked: post.locked
    };
  }

  // Extract comments recursively
  extractComments(comments, depth = 0) {
    const extractedComments = [];

    comments.forEach(comment => {
      if (comment.body && comment.body !== '[deleted]' && comment.body !== '[removed]') {
        const formattedComment = {
          id: comment.id,
          body: comment.body,
          author: comment.author ? comment.author.name : '[deleted]',
          score: comment.score,
          createdUtc: comment.created_utc,
          parentId: comment.parent_id,
          depth: depth,
          gilded: comment.gilded,
          isSubmitter: comment.is_submitter,
          stickied: comment.stickied
        };

        extractedComments.push(formattedComment);

        // Recursively extract replies
        if (comment.replies && comment.replies.length > 0) {
          const replies = this.extractComments(comment.replies, depth + 1);
          extractedComments.push(...replies);
        }
      }
    });

    return extractedComments;
  }

  // Search for posts mentioning a specific domain/website
  async searchByDomain(domain, options = {}) {
    const query = `site:${domain}`;
    return this.searchPosts(query, options);
  }

  // Get trending topics in specific subreddits
  async getTrendingTopics(subreddits = ['technology', 'business', 'marketing'], limit = 10) {
    if (!this.reddit) {
      throw new Error('Reddit client not initialized');
    }

    const trendingTopics = [];

    for (const subredditName of subreddits) {
      try {
        const posts = await this.getSubredditPosts(subredditName, { 
          sort: 'hot', 
          limit: limit 
        });
        
        trendingTopics.push({
          subreddit: subredditName,
          posts: posts.slice(0, 5) // Top 5 posts from each subreddit
        });
      } catch (error) {
        console.error(`Error fetching trending topics from r/${subredditName}:`, error.message);
      }
    }

    return trendingTopics;
  }

  // Analyze post sentiment and extract keywords
  analyzePost(post) {
    const text = `${post.title} ${post.selftext}`;
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    const topKeywords = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    return {
      ...post,
      analysis: {
        wordCount: words.length,
        topKeywords,
        engagementRate: post.numComments > 0 ? post.score / post.numComments : 0
      }
    };
  }

  // Get user's post history (if accessible)
  async getUserPosts(username, limit = 25) {
    if (!this.reddit) {
      throw new Error('Reddit client not initialized');
    }

    try {
      const user = await this.reddit.getUser(username);
      const posts = await user.getSubmissions({ limit });
      
      return posts.map(post => this.formatPost(post));
    } catch (error) {
      console.error(`Error fetching posts for user ${username}:`, error.message);
      throw error;
    }
  }

  // Check if Reddit client is available
  isAvailable() {
    return this.reddit !== null;
  }
}

module.exports = RedditClient;