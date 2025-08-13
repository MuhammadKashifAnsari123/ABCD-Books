const mongoose = require('mongoose');

const scrapedWebsiteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    trim: true
  },
  metaDescription: {
    type: String,
    trim: true
  },
  content: {
    type: String
  },
  headings: {
    h1: [String],
    h2: [String],
    h3: [String]
  },
  paragraphs: [String],
  links: [{
    text: String,
    href: String
  }],
  images: [{
    alt: String,
    src: String
  }],
  socialLinks: {
    facebook: [String],
    twitter: [String],
    linkedin: [String],
    instagram: [String]
  },
  keywords: [{
    word: String,
    count: Number
  }],
  scrapingMethod: {
    type: String,
    enum: ['basic', 'advanced'],
    default: 'basic'
  },
  scrapingStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending'
  },
  errorMessage: String,
  lastScrapedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
scrapedWebsiteSchema.index({ userId: 1, url: 1 });
scrapedWebsiteSchema.index({ lastScrapedAt: -1 });
scrapedWebsiteSchema.index({ scrapingStatus: 1 });

module.exports = mongoose.model('ScrapedWebsite', scrapedWebsiteSchema);