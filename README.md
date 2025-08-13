# Web Scraper & Reddit AI Assistant

A comprehensive Node.js application that scrapes websites, analyzes competitor data, integrates with Reddit API, and provides AI-powered content suggestions for social media engagement.

## Features

### 🕷️ Web Scraping
- Scrape your website and up to 5 competitor websites
- Extract titles, content, meta descriptions, headings, links, and images
- Support for both basic (Cheerio) and advanced (Puppeteer) scraping methods
- Automatic fallback between scraping methods
- Content analysis and keyword extraction

### 🤖 Reddit Integration
- Search Reddit posts by subreddit or domain
- Fetch post details and comments
- Store Reddit data in MongoDB for offline access
- Click to open original Reddit posts in new tabs

### 🧠 AI-Powered Content Suggestions
- Generate intelligent comment suggestions for Reddit posts
- Customizable tone (helpful, conversational, professional, casual)
- Adjustable response length (short, medium, long)
- Context-aware suggestions based on post content
- Copy suggestions to clipboard
- Track suggestion usage and effectiveness

### 👤 User Management
- User profiles with website and competitor URLs
- Preferences and settings management
- Dashboard with usage statistics
- Data persistence across sessions

### 🎨 Modern UI
- Responsive design with glassmorphism effects
- Real-time notifications
- Service status indicators
- Tabbed interface for different functionalities
- Mobile-friendly layout

## Tech Stack

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **Puppeteer** for advanced web scraping
- **Cheerio** for basic HTML parsing
- **Axios** for HTTP requests
- **snoowrap** for Reddit API integration
- **OpenAI API** for AI content generation

### Frontend
- **Vanilla JavaScript** (no frameworks)
- **Modern CSS** with glassmorphism design
- **Font Awesome** icons
- **Inter** font family

### Security & Performance
- **Helmet** for security headers
- **CORS** configuration
- **Rate limiting**
- **Request/response compression**
- **Error handling and logging**

## Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Reddit API credentials
- OpenAI API key

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd web-scraper-reddit-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your credentials:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   CLIENT_URL=http://localhost:3000

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/webscraper
   DB_NAME=webscraper

   # Reddit API Configuration
   REDDIT_CLIENT_ID=your_reddit_client_id
   REDDIT_CLIENT_SECRET=your_reddit_client_secret
   REDDIT_USER_AGENT=WebScraperBot/1.0.0
   REDDIT_USERNAME=your_reddit_username
   REDDIT_PASSWORD=your_reddit_password

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key

   # Scraping Configuration
   SCRAPING_DELAY=1000
   MAX_CONCURRENT_REQUESTS=5

   # Security
   SESSION_SECRET=your_session_secret_here
   ```

4. **Set up Reddit API**
   - Go to [Reddit Apps](https://www.reddit.com/prefs/apps)
   - Create a new application (script type)
   - Note down the client ID and secret

5. **Set up OpenAI API**
   - Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

6. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   
   # Or use MongoDB Atlas for cloud database
   ```

7. **Run the application**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

8. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## Usage Guide

### 1. User Setup
- Enter your username and email
- Add your website URL
- Add up to 5 competitor URLs
- Click "Save User" to create your profile

### 2. Web Scraping
- Click "Start Scraping" to scrape your website and competitors
- View results in the "Scraped Data" tab
- Analysis includes content length, keywords, and structural data

### 3. Reddit Integration
- Enter a subreddit name (e.g., "technology", "business")
- Click "Search Reddit" to fetch posts
- Or search by domain to find posts mentioning specific websites

### 4. AI Content Suggestions
- Click on any Reddit post to select it
- Choose your preferred tone and length
- Add optional context for more targeted suggestions
- Click "Generate Suggestion" to get AI-powered comments
- Copy suggestions to clipboard or mark as used

## API Endpoints

### User Management
- `POST /api/user/create` - Create new user
- `GET /api/user/:id` - Get user by ID
- `PUT /api/user/:id` - Update user
- `DELETE /api/user/:id` - Delete user

### Web Scraping
- `POST /api/scraper/scrape` - Scrape websites
- `GET /api/scraper/history/:userId` - Get scraping history
- `GET /api/scraper/website/:id` - Get specific scraped website

### Reddit Integration
- `POST /api/reddit/search` - Search Reddit posts
- `POST /api/reddit/posts/subreddit` - Get subreddit posts
- `GET /api/reddit/posts/:postId/comments` - Get post comments
- `POST /api/reddit/domain-search` - Search by domain

### AI Suggestions
- `POST /api/ai/comment-suggestion` - Generate comment suggestions
- `POST /api/ai/reply-suggestion` - Generate reply suggestions
- `GET /api/ai/suggestions/:userId` - Get user's AI suggestions
- `PUT /api/ai/suggestions/:id/status` - Update suggestion status

## Database Schema

### Users
- Username, email, website URL
- Competitor URLs array
- Preferences (subreddits, keywords, AI model)
- Timestamps and status

### Scraped Websites
- URL, title, content, meta description
- Headings, paragraphs, links, images
- Social media links and keywords
- Scraping method and status

### Reddit Posts
- Reddit ID, title, content, subreddit
- Author, score, comments count
- URL, permalink, creation time
- Analysis data (keywords, sentiment)

### Reddit Comments
- Post reference, Reddit ID, body
- Author, score, creation time
- Parent comment and depth level

### AI Suggestions
- User and post references
- Suggestion text and context
- AI model, tokens used, confidence
- Category and status tracking

## Development

### Project Structure
```
├── server.js              # Main application entry point
├── config/
│   └── database.js        # MongoDB connection setup
├── models/               # Mongoose schemas
│   ├── User.js
│   ├── ScrapedWebsite.js
│   ├── RedditPost.js
│   ├── RedditComment.js
│   └── AISuggestion.js
├── routes/               # API route handlers
│   ├── user.js
│   ├── webScraper.js
│   ├── reddit.js
│   └── ai.js
├── utils/                # Utility classes
│   ├── webScraper.js
│   ├── redditClient.js
│   └── aiClient.js
├── public/               # Frontend files
│   ├── app.html
│   └── app.js
└── package.json
```

### Adding New Features
1. Create new models in `/models` if needed
2. Add routes in `/routes` directory
3. Update frontend in `/public` directory
4. Test endpoints with proper error handling

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify network access for cloud databases

2. **Reddit API Not Working**
   - Verify Reddit API credentials
   - Check rate limits
   - Ensure user agent is properly set

3. **OpenAI API Errors**
   - Verify API key is valid
   - Check account billing and limits
   - Monitor token usage

4. **Scraping Issues**
   - Some websites block scraping
   - Adjust delays between requests
   - Check for CAPTCHA or anti-bot measures

### Performance Optimization
- Implement caching for frequently accessed data
- Use database indexes for better query performance
- Consider implementing job queues for heavy operations
- Monitor and optimize API rate limits

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Disclaimer

This tool is for educational and research purposes. Always respect website terms of service and robots.txt files when scraping. Be mindful of API rate limits and usage policies for Reddit and OpenAI services.