import { StateManager } from '../state/database.js';
import { SourceConfig, SourceHandler, SourceItem, SourceError, FetchResult } from './types.js';
import { RSSHandler } from './sources/rss.js';
import { YouTubeHandler } from './sources/youtube.js';
import { YouTubeRSSHandler } from './sources/youtube-rss.js';
import { GmailHandler } from './sources/gmail.js';
import { TwitterHandler } from './sources/twitter.js';
import { NitterHandler } from './sources/nitter.js';
import fs from 'fs';
import path from 'path';

export class SourceManager {
  private stateManager: StateManager;
  private handlers: Map<string, SourceHandler>;
  private sources: SourceConfig[];

  constructor(stateManager: StateManager, sourcesPath?: string) {
    this.stateManager = stateManager;
    this.handlers = new Map();

    // Initialize handlers
    this.handlers.set('rss', new RSSHandler());
    // Use YouTube Data API v3 (more reliable, fetches transcripts)
    this.handlers.set('youtube', new YouTubeHandler());
    this.handlers.set('gmail_extraction', new GmailHandler());
    this.handlers.set('x_scraper', new TwitterHandler());
    this.handlers.set('nitter', new NitterHandler());

    // Load sources from config
    const configPath = sourcesPath || path.join(process.cwd(), 'src', 'config', 'sources.json');
    const configData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configData);
    this.sources = config.sources;
  }

  async fetchAll(): Promise<FetchResult> {
    const allItems: SourceItem[] = [];
    const errors: SourceError[] = [];

    const enabledSources = this.sources.filter(s => s.enabled);

    console.log(`📡 Fetching from ${enabledSources.length} enabled sources...`);

    for (const source of enabledSources) {
      try {
        const items = await this.fetchSource(source);
        allItems.push(...items);
        console.log(`   ✓ ${source.name}: ${items.length} new items`);

        // Add delay after Twitter sources to avoid rate limiting
        if (source.type === 'x_scraper') {
          await this.sleep(10000); // 10 second delay between Twitter sources
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({
          sourceName: source.name,
          sourceType: source.type,
          error: errorMsg,
          timestamp: new Date()
        });
        console.warn(`   ✗ ${source.name}: ${errorMsg}`);
      }
    }

    return { items: allItems, errors };
  }

  private async fetchSource(source: SourceConfig): Promise<SourceItem[]> {
    const handler = this.handlers.get(source.type);

    if (!handler) {
      throw new Error(`No handler found for source type: ${source.type}`);
    }

    // Get last processed time for this source
    const lastProcessedTime = this.stateManager.getLastProcessedTime(source.name);

    // Fetch items with retry logic
    const items = await this.fetchWithRetry(
      () => handler.fetch(source, lastProcessedTime || undefined),
      2,
      1000
    );

    // Filter out already processed items (double-check in case timestamp filtering missed some)
    const newItems = items.filter(item => !this.stateManager.hasProcessed(item.id));

    // Mark all new items as processed
    for (const item of newItems) {
      this.stateManager.markProcessed(
        item.id,
        source.name,
        source.type,
        {
          title: item.title,
          url: item.url,
          publishedAt: item.publishedAt.toISOString()
        }
      );
    }

    return newItems;
  }

  private async fetchWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    delayMs: number
  ): Promise<T> {
    let lastError: Error | unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on last attempt
        if (attempt < maxRetries) {
          const backoffDelay = delayMs * Math.pow(2, attempt);
          console.warn(`   Retry attempt ${attempt + 1}/${maxRetries} after ${backoffDelay}ms...`);
          await this.sleep(backoffDelay);
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getSourcesCount(): number {
    return this.sources.filter(s => s.enabled).length;
  }

  getSourcesByCategory(): Map<string, SourceConfig[]> {
    const byCategory = new Map<string, SourceConfig[]>();

    for (const source of this.sources.filter(s => s.enabled)) {
      const existing = byCategory.get(source.category) || [];
      existing.push(source);
      byCategory.set(source.category, existing);
    }

    return byCategory;
  }
}
