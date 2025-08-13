const mongoose = require('mongoose');

const aiSuggestionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RedditPost',
    required: true
  },
  suggestionText: {
    type: String,
    required: true
  },
  context: {
    type: String
  },
  prompt: {
    type: String
  },
  aiModel: {
    type: String,
    default: 'gpt-3.5-turbo'
  },
  tokens: {
    prompt: Number,
    completion: Number,
    total: Number
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  category: {
    type: String,
    enum: ['comment', 'reply', 'post', 'engagement'],
    default: 'comment'
  },
  status: {
    type: String,
    enum: ['generated', 'used', 'rejected', 'modified'],
    default: 'generated'
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
aiSuggestionSchema.index({ userId: 1, postId: 1 });
aiSuggestionSchema.index({ createdAt: -1 });
aiSuggestionSchema.index({ status: 1 });
aiSuggestionSchema.index({ category: 1 });

module.exports = mongoose.model('AISuggestion', aiSuggestionSchema);