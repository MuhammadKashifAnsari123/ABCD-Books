const mongoose = require('mongoose');

const redditCommentSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RedditPost',
    required: true
  },
  redditId: {
    type: String,
    required: true,
    unique: true
  },
  body: {
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
  createdUtc: {
    type: Number,
    required: true
  },
  parentId: {
    type: String
  },
  depth: {
    type: Number,
    default: 0
  },
  gilded: {
    type: Number,
    default: 0
  },
  isSubmitter: {
    type: Boolean,
    default: false
  },
  stickied: {
    type: Boolean,
    default: false
  },
  fetchedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
redditCommentSchema.index({ postId: 1 });
redditCommentSchema.index({ redditId: 1 });
redditCommentSchema.index({ createdUtc: -1 });
redditCommentSchema.index({ score: -1 });

module.exports = mongoose.model('RedditComment', redditCommentSchema);