import { SourceHandler, SourceConfig, SourceItem } from '../types.js';
import { TwitterCache } from './twitter-cache.js';

/**
 * Twitter Handler using twitterapi.io REST API
 * Uses caching to reduce API calls from 2 to 1 per source
 */
export class TwitterHandler implements SourceHandler {
  private apiKey: string;
  private baseUrl = 'https://api.twitterapi.io';
  private cache: TwitterCache;

  constructor() {
    const apiKey = process.env.TWITTER_API_IO_KEY;
    if (!apiKey) {
      throw new Error('TWITTER_API_IO_KEY not configured in environment variables');
    }
    this.apiKey = apiKey;
    this.cache = new TwitterCache();
  }

  async fetch(source: SourceConfig, lastProcessedTime?: Date): Promise<SourceItem[]> {
    if (!source.username) {
      throw new Error(`Twitter source "${source.name}" missing username`);
    }

    try {
      // Step 1: Get user ID (check cache first to save API calls)
      let userId = this.cache.getUserId(source.username);

      if (!userId) {
        // Cache miss - fetch from API
        console.log(`   📝 Cache miss for @${source.username}, fetching user ID...`);
        const userInfoResponse = await fetch(
          `${this.baseUrl}/twitter/user/info?userName=${source.username}`,
          {
            headers: {
              'X-API-Key': this.apiKey,
              'Accept': 'application/json'
            }
          }
        );

        if (!userInfoResponse.ok) {
          throw new Error(`Twitter API error (user info): ${userInfoResponse.status} ${userInfoResponse.statusText}`);
        }

        const userInfoData = await userInfoResponse.json();
        userId = userInfoData.data?.id;

        if (!userId) {
          throw new Error(`Could not find user ID for @${source.username}`);
        }

        // Cache the user ID for future runs
        this.cache.setUserId(source.username, userId);

        // Add 5-second delay between API calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.log(`   ✓ Using cached user ID for @${source.username}`);
      }

      // Step 2: Fetch user timeline using userId
      const timelineResponse = await fetch(
        `${this.baseUrl}/twitter/user/tweet_timeline?userId=${userId}&includeReplies=false`,
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Accept': 'application/json'
          }
        }
      );

      if (!timelineResponse.ok) {
        throw new Error(`Twitter API error (timeline): ${timelineResponse.status} ${timelineResponse.statusText}`);
      }

      const timelineData = await timelineResponse.json();
      const tweets = timelineData.data?.tweets || [];
      const items: SourceItem[] = [];
      const cutoffTime = lastProcessedTime || new Date(Date.now() - 24 * 60 * 60 * 1000);

      for (const tweet of tweets) {
        // Parse tweet timestamp (twitterapi.io uses 'created_at' field)
        const createdAt = tweet.created_at || tweet.createdAt;
        if (!createdAt) continue;

        const publishedAt = new Date(createdAt);

        // Filter by last processed time
        if (publishedAt <= cutoffTime) {
          continue;
        }

        // Get tweet text
        const tweetText = tweet.text || tweet.full_text || '';

        // Skip retweets and replies to maintain high signal-to-noise ratio
        if (tweetText.startsWith('RT @') || tweetText.startsWith('@')) {
          continue;
        }

        // Skip tweets with no meaningful content
        if (tweetText.trim().length < 20) {
          continue;
        }

        const tweetId = tweet.id || tweet.id_str;

        items.push({
          id: String(tweetId),
          title: `Tweet by @${source.username}`,
          content: this.cleanTweetText(tweetText),
          url: `https://twitter.com/${source.username}/status/${tweetId}`,
          publishedAt,
          category: source.category,
          sourceName: source.name
        });
      }

      return items;
    } catch (error) {
      throw new Error(`Failed to fetch Twitter timeline: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private cleanTweetText(text: string): string {
    return text
      // Remove short URLs (they're usually included separately)
      .replace(/https?:\/\/t\.co\/\w+/g, '')
      // Clean up excessive whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }
}
