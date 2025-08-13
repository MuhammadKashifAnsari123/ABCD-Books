const mongoose = require('mongoose');

const redditPostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  redditId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  selftext: {
    type: String,
    default: ''
  },
  subreddit: {
    type: String,
    required: true
  },
  author: {
    type: String,
    default: '[deleted]'
  },
  score: {
    type: Number,
    default: 0
  },
  upvoteRatio: {
    type: Number,
    default: 0
  },
  numComments: {
    type: Number,
    default: 0
  },
  url: {
    type: String
  },
  permalink: {
    type: String,
    required: true
  },
  createdUtc: {
    type: Number,
    required: true
  },
  isVideo: {
    type: Boolean,
    default: false
  },
  isNsfw: {
    type: Boolean,
    default: false
  },
  thumbnail: {
    type: String
  },
  domain: {
    type: String
  },
  gilded: {
    type: Number,
    default: 0
  },
  stickied: {
    type: Boolean,
    default: false
  },
  locked: {
    type: Boolean,
    default: false
  },
  analysis: {
    wordCount: Number,
    topKeywords: [{
      word: String,
      count: Number
    }],
    engagementRate: Number,
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral']
    }
  },
  fetchedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
redditPostSchema.index({ userId: 1, subreddit: 1 });
redditPostSchema.index({ redditId: 1 });
redditPostSchema.index({ createdUtc: -1 });
redditPostSchema.index({ score: -1 });
redditPostSchema.index({ fetchedAt: -1 });

module.exports = mongoose.model('RedditPost', redditPostSchema);