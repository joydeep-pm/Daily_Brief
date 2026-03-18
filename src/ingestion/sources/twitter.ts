import { SourceHandler, SourceConfig, SourceItem } from '../types.js';
import { TwitterCache } from './twitter-cache.js';

/**
 * Twitter Handler using twitterapi.io REST API
 * Optimized for minimal credit usage:
 * - Caches user IDs to avoid profile lookups (saves 18 credits/source/run)
 * - Enforces 6s delay between API calls (QPS limit: 1 req per 5s for free users)
 * - No retries on failure to avoid wasting credits
 */
export class TwitterHandler implements SourceHandler {
  private apiKey: string;
  private baseUrl = 'https://api.twitterapi.io';
  private cache: TwitterCache;
  private lastCallTime = 0;

  constructor() {
    const apiKey = process.env.TWITTER_API_IO_KEY;
    if (!apiKey) {
      throw new Error('TWITTER_API_IO_KEY not configured in environment variables');
    }
    this.apiKey = apiKey;
    this.cache = new TwitterCache();
  }

  /**
   * Enforce QPS limit: wait at least 6 seconds between API calls
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCallTime;
    const minInterval = 6000; // 6 seconds (QPS limit is 1 per 5s, adding buffer)

    if (this.lastCallTime > 0 && elapsed < minInterval) {
      const waitTime = minInterval - elapsed;
      console.log(`   ⏳ Rate limit: waiting ${(waitTime / 1000).toFixed(1)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastCallTime = Date.now();
  }

  async fetch(source: SourceConfig, lastProcessedTime?: Date): Promise<SourceItem[]> {
    if (!source.username) {
      throw new Error(`Twitter source "${source.name}" missing username`);
    }

    try {
      // Step 1: Get user ID (check cache first to save API calls + credits)
      let userId = this.cache.getUserId(source.username);

      if (!userId) {
        console.log(`   📝 Cache miss for @${source.username}, fetching user ID (one-time cost)...`);
        await this.enforceRateLimit();

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
        userId = userInfoData.data?.id || userInfoData.data?.rest_id || userInfoData.id;

        if (!userId) {
          console.warn(`   Twitter API response for @${source.username}:`, JSON.stringify(userInfoData).substring(0, 300));
          throw new Error(`Could not find user ID for @${source.username}`);
        }

        // Cache permanently — user IDs never change
        this.cache.setUserId(source.username, userId);
      } else {
        console.log(`   ✓ Using cached user ID for @${source.username} (0 credits)`);
      }

      // Step 2: Fetch user timeline
      await this.enforceRateLimit();

      const timelineResponse = await fetch(
        `${this.baseUrl}/twitter/user/last_tweets?userId=${userId}`,
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
        const createdAt = tweet.created_at || tweet.createdAt;
        if (!createdAt) continue;

        const publishedAt = new Date(createdAt);

        if (publishedAt <= cutoffTime) {
          continue;
        }

        const tweetText = tweet.text || tweet.full_text || '';

        // Skip retweets and replies
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
          url: `https://x.com/${source.username}/status/${tweetId}`,
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
      .replace(/https?:\/\/t\.co\/\w+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
