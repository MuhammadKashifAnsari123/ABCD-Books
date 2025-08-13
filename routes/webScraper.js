const express = require('express');
const router = express.Router();
const WebScraper = require('../utils/webScraper');
const ScrapedWebsite = require('../models/ScrapedWebsite');
const User = require('../models/User');

const scraper = new WebScraper();

// POST /api/scraper/scrape - Scrape a website and competitors
router.post('/scrape', async (req, res) => {
  try {
    const { userId, websiteUrl, competitorUrls = [], forceRescrape = false } = req.body;

    if (!userId || !websiteUrl) {
      return res.status(400).json({ 
        error: 'User ID and website URL are required' 
      });
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already scraped recently (unless force rescrape)
    if (!forceRescrape) {
      const recentScrape = await ScrapedWebsite.findOne({
        userId,
        url: websiteUrl,
        lastScrapedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24 hours
      });

      if (recentScrape) {
        return res.json({
          message: 'Website was scraped recently',
          data: recentScrape,
          fromCache: true
        });
      }
    }

    // Prepare URLs to scrape
    const urlsToScrape = [websiteUrl, ...competitorUrls.slice(0, 5)]; // Limit to 5 competitors

    // Start scraping
    const { results, errors } = await scraper.scrapeMultipleWebsites(urlsToScrape);

    // Save results to database
    const savedResults = [];
    for (const result of results) {
      try {
        const scrapedData = new ScrapedWebsite({
          userId,
          url: result.url,
          title: result.title,
          metaDescription: result.metaDescription,
          content: result.content,
          headings: result.headings,
          paragraphs: result.paragraphs,
          links: result.links,
          images: result.images,
          socialLinks: result.socialLinks,
          scrapingMethod: result.method,
          scrapingStatus: 'completed',
          lastScrapedAt: new Date()
        });

        const saved = await scrapedData.save();
        savedResults.push(saved);
      } catch (saveError) {
        console.error('Error saving scraped data:', saveError.message);
      }
    }

    // Update user's competitor URLs
    await User.findByIdAndUpdate(userId, {
      $addToSet: { competitorUrls: { $each: competitorUrls } }
    });

    // Analyze scraped data
    const analysis = scraper.analyzeData(results);

    res.json({
      success: true,
      message: `Successfully scraped ${results.length} websites`,
      data: {
        results: savedResults,
        errors,
        analysis
      }
    });

  } catch (error) {
    console.error('Scraping error:', error.message);
    res.status(500).json({ 
      error: 'Failed to scrape websites',
      message: error.message 
    });
  }
});

// GET /api/scraper/history/:userId - Get user's scraping history
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, url } = req.query;

    const query = { userId };
    if (url) {
      query.url = { $regex: url, $options: 'i' };
    }

    const scrapedSites = await ScrapedWebsite.find(query)
      .sort({ lastScrapedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'username email');

    const total = await ScrapedWebsite.countDocuments(query);

    res.json({
      success: true,
      data: {
        scrapedSites,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching scraping history:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch scraping history',
      message: error.message 
    });
  }
});

// GET /api/scraper/website/:id - Get specific scraped website
router.get('/website/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const scrapedSite = await ScrapedWebsite.findById(id)
      .populate('userId', 'username email');

    if (!scrapedSite) {
      return res.status(404).json({ error: 'Scraped website not found' });
    }

    res.json({
      success: true,
      data: scrapedSite
    });

  } catch (error) {
    console.error('Error fetching scraped website:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch scraped website',
      message: error.message 
    });
  }
});

// POST /api/scraper/analyze - Analyze scraped websites
router.post('/analyze', async (req, res) => {
  try {
    const { userId, websiteIds } = req.body;

    if (!userId || !websiteIds || !Array.isArray(websiteIds)) {
      return res.status(400).json({ 
        error: 'User ID and website IDs array are required' 
      });
    }

    const scrapedSites = await ScrapedWebsite.find({
      _id: { $in: websiteIds },
      userId
    });

    if (scrapedSites.length === 0) {
      return res.status(404).json({ error: 'No scraped websites found' });
    }

    // Convert to format expected by analyzer
    const analysisData = scrapedSites.map(site => ({
      url: site.url,
      title: site.title,
      content: site.content,
      headings: site.headings,
      socialLinks: site.socialLinks,
      method: site.scrapingMethod
    }));

    const analysis = scraper.analyzeData(analysisData);

    res.json({
      success: true,
      data: {
        analysis,
        websitesAnalyzed: scrapedSites.length
      }
    });

  } catch (error) {
    console.error('Analysis error:', error.message);
    res.status(500).json({ 
      error: 'Failed to analyze websites',
      message: error.message 
    });
  }
});

// DELETE /api/scraper/website/:id - Delete scraped website
router.delete('/website/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const scrapedSite = await ScrapedWebsite.findOneAndDelete({
      _id: id,
      userId
    });

    if (!scrapedSite) {
      return res.status(404).json({ error: 'Scraped website not found' });
    }

    res.json({
      success: true,
      message: 'Scraped website deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting scraped website:', error.message);
    res.status(500).json({ 
      error: 'Failed to delete scraped website',
      message: error.message 
    });
  }
});

// GET /api/scraper/competitors/:userId - Get competitor suggestions
router.get('/competitors/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { websiteUrl } = req.query;

    if (!websiteUrl) {
      return res.status(400).json({ 
        error: 'Website URL is required' 
      });
    }

    const suggestions = await scraper.getCompetitorSuggestions(websiteUrl);

    res.json({
      success: true,
      data: suggestions
    });

  } catch (error) {
    console.error('Error getting competitor suggestions:', error.message);
    res.status(500).json({ 
      error: 'Failed to get competitor suggestions',
      message: error.message 
    });
  }
});

module.exports = router;