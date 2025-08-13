// Global variables
let currentUser = null;
let currentSelectedPost = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    checkServiceStatus();
    loadUserFromStorage();
});

// User Management
function createUser() {
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const websiteUrl = document.getElementById('websiteUrl').value.trim();
    const competitorInputs = document.querySelectorAll('#competitorUrls input[type="url"]');
    const competitorUrls = Array.from(competitorInputs)
        .map(input => input.value.trim())
        .filter(url => url);

    if (!username || !email) {
        alert('Please enter both username and email');
        return;
    }

    const userData = {
        username,
        email,
        websiteUrl,
        competitorUrls,
        preferences: {
            subreddits: ['technology', 'business', 'marketing'],
            keywords: [],
            aiModel: 'gpt-3.5-turbo'
        }
    };

    fetch('/api/user/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentUser = data.data.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            document.getElementById('userSetup').style.display = 'none';
            showNotification('User created successfully!', 'success');
        } else {
            showNotification(data.error || 'Failed to create user', 'error');
        }
    })
    .catch(error => {
        console.error('Error creating user:', error);
        showNotification('Error creating user', 'error');
    });
}

function loadUserFromStorage() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        document.getElementById('userSetup').style.display = 'none';
        
        // Populate user fields
        document.getElementById('username').value = currentUser.username;
        document.getElementById('email').value = currentUser.email;
        document.getElementById('websiteUrl').value = currentUser.websiteUrl || '';
        
        // Populate competitor URLs
        populateCompetitorUrls(currentUser.competitorUrls || []);
    }
}

function populateCompetitorUrls(urls) {
    const container = document.getElementById('competitorUrls');
    container.innerHTML = '';
    
    urls.forEach(url => {
        addCompetitorUrl(url);
    });
    
    if (urls.length === 0) {
        addCompetitorUrl();
    }
}

function addCompetitorUrl(value = '') {
    const container = document.getElementById('competitorUrls');
    const competitorCount = container.children.length;
    
    if (competitorCount >= 5) {
        showNotification('Maximum 5 competitor URLs allowed', 'warning');
        return;
    }

    const div = document.createElement('div');
    div.className = 'competitor-url';
    div.innerHTML = `
        <input type="url" placeholder="https://competitor${competitorCount + 1}.com" value="${value}">
        <button type="button" class="remove-url" onclick="removeCompetitorUrl(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(div);
}

function removeCompetitorUrl(button) {
    const container = document.getElementById('competitorUrls');
    if (container.children.length > 1) {
        button.parentElement.remove();
    }
}

// Service Status
function checkServiceStatus() {
    // Check Reddit API status
    fetch('/api/reddit/status')
        .then(response => response.json())
        .then(data => {
            const statusElement = document.getElementById('redditStatus');
            if (data.data.available) {
                statusElement.className = 'status-indicator status-success';
                statusElement.innerHTML = '<i class="fas fa-check"></i> Reddit: Connected';
            } else {
                statusElement.className = 'status-indicator status-error';
                statusElement.innerHTML = '<i class="fas fa-times"></i> Reddit: Not configured';
            }
        })
        .catch(() => {
            const statusElement = document.getElementById('redditStatus');
            statusElement.className = 'status-indicator status-error';
            statusElement.innerHTML = '<i class="fas fa-times"></i> Reddit: Error';
        });

    // Check AI API status
    fetch('/api/ai/status')
        .then(response => response.json())
        .then(data => {
            const statusElement = document.getElementById('aiStatus');
            if (data.data.available) {
                statusElement.className = 'status-indicator status-success';
                statusElement.innerHTML = '<i class="fas fa-check"></i> AI: Connected';
            } else {
                statusElement.className = 'status-indicator status-error';
                statusElement.innerHTML = '<i class="fas fa-times"></i> AI: Not configured';
            }
        })
        .catch(() => {
            const statusElement = document.getElementById('aiStatus');
            statusElement.className = 'status-indicator status-error';
            statusElement.innerHTML = '<i class="fas fa-times"></i> AI: Error';
        });
}

// Web Scraping
function startScraping() {
    if (!currentUser) {
        showNotification('Please create a user account first', 'warning');
        return;
    }

    const websiteUrl = currentUser.websiteUrl;
    const competitorUrls = currentUser.competitorUrls || [];

    if (!websiteUrl) {
        showNotification('Please set your website URL first', 'warning');
        return;
    }

    showLoading('scrapedDataContainer', 'Scraping websites...');
    showTab('scraped-data');

    const requestData = {
        userId: currentUser.id,
        websiteUrl,
        competitorUrls,
        forceRescrape: false
    };

    fetch('/api/scraper/scrape', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayScrapedData(data.data);
            showNotification('Websites scraped successfully!', 'success');
        } else {
            showNotification(data.error || 'Failed to scrape websites', 'error');
            document.getElementById('scrapedDataContainer').innerHTML = `
                <div class="loading">
                    <p>Error: ${data.error}</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Scraping error:', error);
        showNotification('Error during scraping', 'error');
        document.getElementById('scrapedDataContainer').innerHTML = `
            <div class="loading">
                <p>Error during scraping</p>
            </div>
        `;
    });
}

function displayScrapedData(data) {
    const container = document.getElementById('scrapedDataContainer');
    let html = '';

    if (data.results && data.results.length > 0) {
        html += '<h3>Scraped Websites</h3>';
        data.results.forEach(site => {
            html += `
                <div class="reddit-post">
                    <div class="post-header">
                        <span class="post-subreddit">${site.scrapingMethod}</span>
                        <div class="post-score">
                            <i class="fas fa-clock"></i>
                            ${new Date(site.lastScrapedAt).toLocaleDateString()}
                        </div>
                    </div>
                    <div class="post-title">${site.title || 'No title'}</div>
                    <div class="post-content">
                        <strong>URL:</strong> ${site.url}<br>
                        <strong>Description:</strong> ${site.metaDescription || 'No description'}<br>
                        <strong>Content Length:</strong> ${site.content ? site.content.length : 0} characters
                    </div>
                    <div class="post-meta">
                        <span><i class="fas fa-link"></i> ${site.links ? site.links.length : 0} links</span>
                        <span><i class="fas fa-image"></i> ${site.images ? site.images.length : 0} images</span>
                        <span><i class="fas fa-heading"></i> ${site.headings ? Object.values(site.headings).flat().length : 0} headings</span>
                    </div>
                </div>
            `;
        });

        if (data.analysis) {
            html += `
                <div class="ai-suggestion-box">
                    <h3><i class="fas fa-chart-bar"></i> Analysis Results</h3>
                    <p><strong>Total Sites:</strong> ${data.analysis.totalSites}</p>
                    <p><strong>Average Content Length:</strong> ${data.analysis.avgContentLength} characters</p>
                    <p><strong>Top Keywords:</strong></p>
                    <ul>
                        ${data.analysis.topKeywords.slice(0, 10).map(kw => `<li>${kw.keyword} (${kw.count})</li>`).join('')}
                    </ul>
                </div>
            `;
        }
    } else {
        html = '<div class="loading"><p>No websites were scraped</p></div>';
    }

    if (data.errors && data.errors.length > 0) {
        html += '<h4>Errors:</h4>';
        data.errors.forEach(error => {
            html += `<p style="color: red;">${error.url}: ${error.error}</p>`;
        });
    }

    container.innerHTML = html;
}

// Reddit Integration
function searchReddit() {
    if (!currentUser) {
        showNotification('Please create a user account first', 'warning');
        return;
    }

    const subreddit = document.getElementById('subredditInput').value.trim() || 'technology';
    
    showLoading('redditPostsContainer', 'Searching Reddit...');
    showTab('reddit-posts');

    const requestData = {
        userId: currentUser.id,
        subreddit,
        sort: 'hot',
        time: 'day',
        limit: 25
    };

    fetch('/api/reddit/posts/subreddit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayRedditPosts(data.data.posts);
            showNotification('Reddit posts loaded successfully!', 'success');
        } else {
            showNotification(data.error || 'Failed to load Reddit posts', 'error');
            document.getElementById('redditPostsContainer').innerHTML = `
                <div class="loading">
                    <p>Error: ${data.error}</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Reddit search error:', error);
        showNotification('Error searching Reddit', 'error');
        document.getElementById('redditPostsContainer').innerHTML = `
            <div class="loading">
                <p>Error searching Reddit</p>
            </div>
        `;
    });
}

function searchByDomain() {
    if (!currentUser) {
        showNotification('Please create a user account first', 'warning');
        return;
    }

    const domain = document.getElementById('domainSearch').value.trim();
    
    if (!domain) {
        showNotification('Please enter a domain to search', 'warning');
        return;
    }

    showLoading('redditPostsContainer', 'Searching Reddit by domain...');
    showTab('reddit-posts');

    const requestData = {
        userId: currentUser.id,
        domain,
        limit: 25
    };

    fetch('/api/reddit/domain-search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayRedditPosts(data.data.posts);
            showNotification(`Found ${data.data.posts.length} posts mentioning ${domain}`, 'success');
        } else {
            showNotification(data.error || 'Failed to search by domain', 'error');
            document.getElementById('redditPostsContainer').innerHTML = `
                <div class="loading">
                    <p>Error: ${data.error}</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Domain search error:', error);
        showNotification('Error searching by domain', 'error');
        document.getElementById('redditPostsContainer').innerHTML = `
            <div class="loading">
                <p>Error searching by domain</p>
            </div>
        `;
    });
}

function displayRedditPosts(posts) {
    const container = document.getElementById('redditPostsContainer');
    
    if (!posts || posts.length === 0) {
        container.innerHTML = '<div class="loading"><p>No posts found</p></div>';
        return;
    }

    let html = '';
    posts.forEach(post => {
        html += `
            <div class="reddit-post" onclick="selectPost('${post._id}')" data-permalink="${post.permalink}">
                <div class="post-header">
                    <span class="post-subreddit">r/${post.subreddit}</span>
                    <div class="post-score">
                        <i class="fas fa-arrow-up"></i>
                        ${post.score}
                    </div>
                </div>
                <div class="post-title">${post.title}</div>
                ${post.selftext ? `<div class="post-content">${post.selftext.substring(0, 300)}${post.selftext.length > 300 ? '...' : ''}</div>` : ''}
                <div class="post-meta">
                    <span><i class="fas fa-user"></i> u/${post.author}</span>
                    <span><i class="fas fa-comments"></i> ${post.numComments} comments</span>
                    <span><i class="fas fa-clock"></i> ${timeAgo(post.createdUtc * 1000)}</span>
                    <span onclick="openRedditPost(event, '${post.permalink}')" style="color: #667eea; cursor: pointer;">
                        <i class="fas fa-external-link-alt"></i> View on Reddit
                    </span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function selectPost(postId) {
    // Find the post data
    currentSelectedPost = postId;
    
    // Show AI suggestion box
    const aiBox = document.getElementById('aiSuggestionBox');
    aiBox.style.display = 'block';
    aiBox.scrollIntoView({ behavior: 'smooth' });
    
    // Clear previous suggestions
    document.getElementById('suggestionsList').innerHTML = '';
}

function openRedditPost(event, permalink) {
    event.stopPropagation();
    const fullUrl = `https://reddit.com${permalink}`;
    window.open(fullUrl, '_blank');
}

// AI Suggestions
function generateAISuggestion() {
    if (!currentUser) {
        showNotification('Please create a user account first', 'warning');
        return;
    }

    if (!currentSelectedPost) {
        showNotification('Please select a Reddit post first', 'warning');
        return;
    }

    const tone = document.getElementById('aiTone').value;
    const length = document.getElementById('aiLength').value;
    const userContext = document.getElementById('userContext').value.trim();

    const requestData = {
        userId: currentUser.id,
        postId: currentSelectedPost,
        tone,
        length,
        includeQuestions: true,
        userContext,
        count: 3
    };

    // Show loading in suggestions area
    document.getElementById('suggestionsList').innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner"></i>
            <p>Generating AI suggestions...</p>
        </div>
    `;

    fetch('/api/ai/comment-suggestion', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayAISuggestions(data.data.suggestions);
            showNotification('AI suggestions generated!', 'success');
        } else {
            showNotification(data.error || 'Failed to generate AI suggestions', 'error');
            document.getElementById('suggestionsList').innerHTML = `
                <div class="loading">
                    <p>Error: ${data.error}</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('AI suggestion error:', error);
        showNotification('Error generating AI suggestions', 'error');
        document.getElementById('suggestionsList').innerHTML = `
            <div class="loading">
                <p>Error generating suggestions</p>
            </div>
        `;
    });
}

function displayAISuggestions(suggestions) {
    const container = document.getElementById('suggestionsList');
    let html = '';

    suggestions.forEach((suggestion, index) => {
        html += `
            <div class="suggestion-item">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <strong>Suggestion ${index + 1}</strong>
                    <div style="font-size: 12px; opacity: 0.8;">
                        Confidence: ${Math.round(suggestion.confidence * 100)}%
                    </div>
                </div>
                <p>${suggestion.suggestionText}</p>
                <div style="margin-top: 10px;">
                    <button class="btn btn-secondary" onclick="copySuggestion('${suggestion._id}', this)" style="font-size: 12px; padding: 6px 12px;">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                    <button class="btn btn-secondary" onclick="markSuggestionUsed('${suggestion._id}')" style="font-size: 12px; padding: 6px 12px; margin-left: 8px;">
                        <i class="fas fa-check"></i> Mark as Used
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function copySuggestion(suggestionId, button) {
    const suggestionText = button.parentElement.parentElement.querySelector('p').textContent;
    navigator.clipboard.writeText(suggestionText).then(() => {
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
            button.innerHTML = '<i class="fas fa-copy"></i> Copy';
        }, 2000);
    });
}

function markSuggestionUsed(suggestionId) {
    fetch(`/api/ai/suggestions/${suggestionId}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId: currentUser.id,
            status: 'used'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Suggestion marked as used!', 'success');
        }
    })
    .catch(error => {
        console.error('Error updating suggestion status:', error);
    });
}

// UI Functions
function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked tab
    event.target.classList.add('active');
}

function showLoading(containerId, message = 'Loading...') {
    document.getElementById(containerId).innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner"></i>
            <p>${message}</p>
        </div>
    `;
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 12px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        max-width: 300px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;

    switch (type) {
        case 'success':
            notification.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            break;
        case 'error':
            notification.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            break;
        case 'warning':
            notification.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
            break;
        default:
            notification.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

function timeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) {
        return 'just now';
    } else if (diffInSeconds < 3600) {
        return `${Math.floor(diffInSeconds / 60)}m ago`;
    } else if (diffInSeconds < 86400) {
        return `${Math.floor(diffInSeconds / 3600)}h ago`;
    } else {
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }
}

// Handle tab clicks
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('tab')) {
        const tabName = e.target.onclick.toString().match(/'([^']+)'/)[1];
        showTab(tabName);
    }
});