import fs from 'fs';
import path from 'path';

/**
 * Twitter User ID Cache
 * Stores username -> userId mappings to reduce API calls
 */
export class TwitterCache {
  private cachePath: string;
  private cache: Map<string, string>;

  constructor() {
    this.cachePath = path.join(process.cwd(), 'data', 'twitter-cache.json');
    this.cache = new Map();
    this.loadCache();
  }

  /**
   * Get cached user ID for a username
   */
  getUserId(username: string): string | undefined {
    return this.cache.get(username.toLowerCase());
  }

  /**
   * Store user ID for a username
   */
  setUserId(username: string, userId: string): void {
    this.cache.set(username.toLowerCase(), userId);
    this.saveCache();
  }

  /**
   * Load cache from disk
   */
  private loadCache(): void {
    try {
      if (fs.existsSync(this.cachePath)) {
        const data = fs.readFileSync(this.cachePath, 'utf-8');
        const parsed = JSON.parse(data);
        this.cache = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.warn('Failed to load Twitter cache, starting fresh:', error);
      this.cache = new Map();
    }
  }

  /**
   * Save cache to disk
   */
  private saveCache(): void {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.cachePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Convert Map to object and save
      const obj = Object.fromEntries(this.cache);
      fs.writeFileSync(this.cachePath, JSON.stringify(obj, null, 2));
    } catch (error) {
      console.error('Failed to save Twitter cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { totalCached: number; usernames: string[] } {
    return {
      totalCached: this.cache.size,
      usernames: Array.from(this.cache.keys())
    };
  }
}
