import { Scraper } from 'agent-twitter-client';
import { SourceHandler, SourceConfig, SourceItem } from '../types.js';

export class TwitterHandler implements SourceHandler {
  private scraper: Scraper;
  private initialized = false;

  constructor() {
    this.scraper = new Scraper();
  }

  async fetch(source: SourceConfig, lastProcessedTime?: Date): Promise<SourceItem[]> {
    if (!source.username) {
      throw new Error(`Twitter source "${source.name}" missing username`);
    }

    try {
      // Login if not already authenticated
      if (!this.initialized) {
        await this.login();
        this.initialized = true;
      }

      // Fetch recent tweets from user
      const tweets = [];
      const cutoffTime = lastProcessedTime || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24 hours

      for await (const tweet of this.scraper.getTweets(source.username, 20)) {
        if (!tweet.timeParsed || tweet.timeParsed <= cutoffTime) {
          break;
        }

        tweets.push(tweet);
      }

      const items: SourceItem[] = tweets.map(tweet => ({
        id: tweet.id || String(tweet.timestamp),
        title: `Tweet by @${source.username}`,
        content: tweet.text || '',
        url: tweet.permanentUrl,
        publishedAt: tweet.timeParsed || new Date(tweet.timestamp || Date.now()),
        category: source.category,
        sourceName: source.name
      }));

      return items;
    } catch (error) {
      // Critical: Don't fail the entire pipeline if Twitter scraper breaks
      console.error(`Twitter scraper failed for @${source.username}:`, error);
      throw new Error(`Twitter scraper unavailable (unofficial API may have changed)`);
    }
  }

  private async login(): Promise<void> {
    const username = process.env.TWITTER_USERNAME;
    const password = process.env.TWITTER_PASSWORD;

    if (!username || !password) {
      throw new Error('Twitter credentials not configured (TWITTER_USERNAME, TWITTER_PASSWORD)');
    }

    await this.scraper.login(username, password);
  }
}
