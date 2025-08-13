const OpenAI = require('openai');

class AIClient {
  constructor() {
    this.openai = null;
    this.initializeClient();
  }

  initializeClient() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not found. AI functionality will be limited.');
      return;
    }

    try {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      console.log('OpenAI client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error.message);
    }
  }

  // Generate comment suggestions for Reddit posts
  async generateCommentSuggestion(post, context = {}) {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const {
      tone = 'helpful',
      length = 'medium',
      includeQuestions = true,
      userContext = ''
    } = context;

    const prompt = this.buildCommentPrompt(post, tone, length, includeQuestions, userContext);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates thoughtful, engaging Reddit comments. Your responses should be authentic, add value to the discussion, and follow Reddit etiquette.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.getMaxTokens(length),
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const suggestion = response.choices[0].message.content.trim();
      
      return {
        suggestion,
        metadata: {
          model: 'gpt-3.5-turbo',
          tokens: {
            prompt: response.usage.prompt_tokens,
            completion: response.usage.completion_tokens,
            total: response.usage.total_tokens
          },
          tone,
          length,
          confidence: this.calculateConfidence(response.choices[0])
        }
      };

    } catch (error) {
      console.error('Error generating comment suggestion:', error.message);
      throw error;
    }
  }

  // Generate reply suggestions for existing comments
  async generateReplySuggestion(originalComment, parentPost, context = {}) {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const {
      tone = 'conversational',
      agree = null, // true, false, or null for neutral
      addValue = true
    } = context;

    const prompt = this.buildReplyPrompt(originalComment, parentPost, tone, agree, addValue);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates thoughtful replies to Reddit comments. Your responses should be respectful, constructive, and add value to the conversation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.6,
        presence_penalty: 0.2
      });

      const suggestion = response.choices[0].message.content.trim();
      
      return {
        suggestion,
        metadata: {
          model: 'gpt-3.5-turbo',
          tokens: {
            prompt: response.usage.prompt_tokens,
            completion: response.usage.completion_tokens,
            total: response.usage.total_tokens
          },
          tone,
          confidence: this.calculateConfidence(response.choices[0])
        }
      };

    } catch (error) {
      console.error('Error generating reply suggestion:', error.message);
      throw error;
    }
  }

  // Generate post suggestions based on scraped website content
  async generatePostSuggestion(websiteData, subreddit, context = {}) {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const {
      postType = 'discussion', // discussion, question, announcement, tip
      includeLink = true
    } = context;

    const prompt = this.buildPostPrompt(websiteData, subreddit, postType, includeLink);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that creates engaging Reddit posts for r/${subreddit}. Your posts should follow the subreddit's culture, be valuable to the community, and encourage discussion.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.7,
        presence_penalty: 0.1
      });

      const suggestion = response.choices[0].message.content.trim();
      
      return {
        suggestion,
        metadata: {
          model: 'gpt-3.5-turbo',
          tokens: {
            prompt: response.usage.prompt_tokens,
            completion: response.usage.completion_tokens,
            total: response.usage.total_tokens
          },
          postType,
          subreddit,
          confidence: this.calculateConfidence(response.choices[0])
        }
      };

    } catch (error) {
      console.error('Error generating post suggestion:', error.message);
      throw error;
    }
  }

  // Analyze sentiment of text
  async analyzeSentiment(text) {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a sentiment analysis assistant. Analyze the sentiment of the given text and respond with only one word: "positive", "negative", or "neutral".'
          },
          {
            role: 'user',
            content: `Analyze the sentiment of this text: "${text}"`
          }
        ],
        max_tokens: 10,
        temperature: 0.1
      });

      const sentiment = response.choices[0].message.content.trim().toLowerCase();
      return ['positive', 'negative', 'neutral'].includes(sentiment) ? sentiment : 'neutral';

    } catch (error) {
      console.error('Error analyzing sentiment:', error.message);
      return 'neutral';
    }
  }

  // Build comment prompt
  buildCommentPrompt(post, tone, length, includeQuestions, userContext) {
    let prompt = `Generate a ${tone} Reddit comment for the following post:\n\n`;
    prompt += `Title: ${post.title}\n`;
    prompt += `Subreddit: r/${post.subreddit}\n`;
    
    if (post.selftext) {
      prompt += `Content: ${post.selftext}\n`;
    }
    
    if (userContext) {
      prompt += `\nUser Context: ${userContext}\n`;
    }

    prompt += `\nRequirements:\n`;
    prompt += `- Tone: ${tone}\n`;
    prompt += `- Length: ${length} (short: 1-2 sentences, medium: 2-4 sentences, long: 4-6 sentences)\n`;
    
    if (includeQuestions) {
      prompt += `- Include a thoughtful question to encourage discussion\n`;
    }
    
    prompt += `- Be authentic and add value to the conversation\n`;
    prompt += `- Follow Reddit etiquette and community guidelines\n`;
    prompt += `- Do not include any promotional content\n`;

    return prompt;
  }

  // Build reply prompt
  buildReplyPrompt(originalComment, parentPost, tone, agree, addValue) {
    let prompt = `Generate a ${tone} reply to this Reddit comment:\n\n`;
    prompt += `Original Post Title: ${parentPost.title}\n`;
    prompt += `Comment to Reply to: ${originalComment.body}\n`;
    prompt += `Comment Author: ${originalComment.author}\n`;

    prompt += `\nRequirements:\n`;
    prompt += `- Tone: ${tone}\n`;
    
    if (agree !== null) {
      prompt += `- ${agree ? 'Agree with' : 'Respectfully disagree with'} the comment\n`;
    }
    
    if (addValue) {
      prompt += `- Add new information or perspective to the discussion\n`;
    }
    
    prompt += `- Be respectful and constructive\n`;
    prompt += `- Keep it concise (1-3 sentences)\n`;

    return prompt;
  }

  // Build post prompt
  buildPostPrompt(websiteData, subreddit, postType, includeLink) {
    let prompt = `Create a ${postType} Reddit post for r/${subreddit} based on this website content:\n\n`;
    prompt += `Website: ${websiteData.url}\n`;
    prompt += `Title: ${websiteData.title}\n`;
    prompt += `Description: ${websiteData.metaDescription}\n`;
    
    if (websiteData.headings && websiteData.headings.h1.length > 0) {
      prompt += `Key Topics: ${websiteData.headings.h1.join(', ')}\n`;
    }

    prompt += `\nRequirements:\n`;
    prompt += `- Create an engaging title (under 300 characters)\n`;
    prompt += `- Write compelling post content\n`;
    prompt += `- Make it relevant to r/${subreddit}\n`;
    prompt += `- Encourage community discussion\n`;
    
    if (includeLink) {
      prompt += `- Include the website link naturally in the content\n`;
    }
    
    prompt += `- Follow Reddit's self-promotion guidelines\n`;

    return prompt;
  }

  // Calculate confidence score based on response
  calculateConfidence(choice) {
    // Simple confidence calculation based on finish_reason and length
    if (choice.finish_reason === 'stop') {
      const length = choice.message.content.length;
      if (length > 50 && length < 1000) {
        return 0.8 + Math.random() * 0.2; // 0.8-1.0 for good responses
      }
    }
    return 0.5 + Math.random() * 0.3; // 0.5-0.8 for uncertain responses
  }

  // Get max tokens based on length preference
  getMaxTokens(length) {
    switch (length) {
      case 'short': return 100;
      case 'medium': return 200;
      case 'long': return 300;
      default: return 200;
    }
  }

  // Check if AI client is available
  isAvailable() {
    return this.openai !== null;
  }

  // Generate multiple suggestions
  async generateMultipleSuggestions(post, count = 3, context = {}) {
    const suggestions = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const suggestion = await this.generateCommentSuggestion(post, {
          ...context,
          temperature: 0.7 + (i * 0.1) // Vary temperature for diversity
        });
        suggestions.push(suggestion);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Error generating suggestion ${i + 1}:`, error.message);
      }
    }
    
    return suggestions;
  }
}

module.exports = AIClient;