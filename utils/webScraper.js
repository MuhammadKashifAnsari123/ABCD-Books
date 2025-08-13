const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');

class WebScraper {
  constructor() {
    this.browser = null;
    this.delay = parseInt(process.env.SCRAPING_DELAY) || 1000;
    this.maxConcurrentRequests = parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 5;
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Basic scraping with Axios and Cheerio (faster for simple sites)
  async scrapeBasic(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      return {
        url,
        title: $('title').text().trim(),
        metaDescription: $('meta[name="description"]').attr('content') || '',
        headings: {
          h1: $('h1').map((i, el) => $(el).text().trim()).get(),
          h2: $('h2').map((i, el) => $(el).text().trim()).get(),
          h3: $('h3').map((i, el) => $(el).text().trim()).get()
        },
        paragraphs: $('p').map((i, el) => $(el).text().trim()).get().filter(text => text.length > 0),
        links: $('a[href]').map((i, el) => ({
          text: $(el).text().trim(),
          href: $(el).attr('href')
        })).get(),
        images: $('img[src]').map((i, el) => ({
          alt: $(el).attr('alt') || '',
          src: $(el).attr('src')
        })).get(),
        content: $('body').text().replace(/\s+/g, ' ').trim(),
        scrapedAt: new Date().toISOString(),
        method: 'basic'
      };
    } catch (error) {
      console.error(`Basic scraping failed for ${url}:`, error.message);
      throw error;
    }
  }

  // Advanced scraping with Puppeteer (for dynamic content)
  async scrapeAdvanced(url) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Set viewport
      await page.setViewport({ width: 1280, height: 720 });

      // Navigate to the page
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for content to load
      await page.waitForTimeout(this.delay);

      // Extract data
      const data = await page.evaluate(() => {
        const getTextContent = (selector) => {
          const elements = document.querySelectorAll(selector);
          return Array.from(elements).map(el => el.textContent.trim()).filter(text => text.length > 0);
        };

        const getAttributes = (selector, attribute) => {
          const elements = document.querySelectorAll(selector);
          return Array.from(elements).map(el => el.getAttribute(attribute)).filter(attr => attr);
        };

        return {
          title: document.title,
          metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
          headings: {
            h1: getTextContent('h1'),
            h2: getTextContent('h2'),
            h3: getTextContent('h3')
          },
          paragraphs: getTextContent('p'),
          links: Array.from(document.querySelectorAll('a[href]')).map(el => ({
            text: el.textContent.trim(),
            href: el.getAttribute('href')
          })),
          images: Array.from(document.querySelectorAll('img[src]')).map(el => ({
            alt: el.getAttribute('alt') || '',
            src: el.getAttribute('src')
          })),
          content: document.body.textContent.replace(/\s+/g, ' ').trim(),
          socialLinks: {
            facebook: getAttributes('a[href*="facebook.com"]', 'href'),
            twitter: getAttributes('a[href*="twitter.com"], a[href*="x.com"]', 'href'),
            linkedin: getAttributes('a[href*="linkedin.com"]', 'href'),
            instagram: getAttributes('a[href*="instagram.com"]', 'href')
          }
        };
      });

      await page.close();

      return {
        url,
        ...data,
        scrapedAt: new Date().toISOString(),
        method: 'advanced'
      };

    } catch (error) {
      await page.close();
      console.error(`Advanced scraping failed for ${url}:`, error.message);
      throw error;
    }
  }

  // Scrape multiple websites (main + competitors)
  async scrapeMultipleWebsites(urls) {
    const results = [];
    const errors = [];

    for (const url of urls) {
      try {
        console.log(`Scraping: ${url}`);
        
        // Try basic scraping first, fallback to advanced if needed
        let result;
        try {
          result = await this.scrapeBasic(url);
        } catch (basicError) {
          console.log(`Basic scraping failed for ${url}, trying advanced...`);
          result = await this.scrapeAdvanced(url);
        }

        results.push(result);
        
        // Delay between requests
        if (urls.indexOf(url) < urls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.delay));
        }

      } catch (error) {
        console.error(`Failed to scrape ${url}:`, error.message);
        errors.push({ url, error: error.message });
      }
    }

    return { results, errors };
  }

  // Get competitor suggestions based on the main website
  async getCompetitorSuggestions(mainUrl) {
    try {
      const mainData = await this.scrapeBasic(mainUrl);
      
      // Simple competitor detection based on similar keywords in title/content
      const keywords = this.extractKeywords(mainData.title + ' ' + mainData.metaDescription);
      
      // This is a simplified approach - in a real application, you might use:
      // - SEO tools APIs (SEMrush, Ahrefs)
      // - Search engine APIs
      // - Industry-specific databases
      
      return {
        keywords,
        suggestedCompetitors: [
          // These would be dynamically generated based on the main site's content
          `https://www.google.com/search?q=${keywords.slice(0, 3).join('+')}`
        ]
      };
    } catch (error) {
      console.error('Error getting competitor suggestions:', error.message);
      return { keywords: [], suggestedCompetitors: [] };
    }
  }

  // Extract keywords from text
  extractKeywords(text) {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'];
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {});
  }

  // Analyze scraped data for insights
  analyzeData(scrapedData) {
    const analysis = {
      totalSites: scrapedData.length,
      avgContentLength: 0,
      commonKeywords: {},
      technologies: new Set(),
      socialPresence: {}
    };

    scrapedData.forEach(site => {
      // Content length analysis
      analysis.avgContentLength += site.content.length;

      // Keyword analysis
      const keywords = this.extractKeywords(site.content);
      Object.keys(keywords).forEach(keyword => {
        analysis.commonKeywords[keyword] = (analysis.commonKeywords[keyword] || 0) + keywords[keyword];
      });

      // Social media analysis
      if (site.socialLinks) {
        Object.keys(site.socialLinks).forEach(platform => {
          if (site.socialLinks[platform].length > 0) {
            analysis.socialPresence[platform] = (analysis.socialPresence[platform] || 0) + 1;
          }
        });
      }
    });

    analysis.avgContentLength = Math.round(analysis.avgContentLength / scrapedData.length);
    
    // Sort keywords by frequency
    analysis.topKeywords = Object.entries(analysis.commonKeywords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([keyword, count]) => ({ keyword, count }));

    return analysis;
  }
}

module.exports = WebScraper;