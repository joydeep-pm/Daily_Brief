import Parser from 'rss-parser';
import { SourceHandler, SourceConfig, SourceItem } from '../types.js';

/**
 * Nitter RSS Handler - Free Twitter/X RSS feeds via Nitter instances
 * No authentication required!
 */
export class NitterHandler implements SourceHandler {
  private parser: Parser;
  private nitterInstances = [
    'nitter.poast.org',
    'nitter.privacydev.net',
    'nitter.1d4.us'
  ];

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Daily-Brief-Aggregator/1.0'
      }
    });
  }

  async fetch(source: SourceConfig, lastProcessedTime?: Date): Promise<SourceItem[]> {
    if (!source.username) {
      throw new Error(`Nitter source "${source.name}" missing username`);
    }

    // Try multiple Nitter instances in case one is down
    for (const instance of this.nitterInstances) {
      try {
        const rssUrl = `https://${instance}/${source.username}/rss`;
        const feed = await this.parser.parseURL(rssUrl);
        const items: SourceItem[] = [];

        for (const item of feed.items) {
          if (!item.guid && !item.link) {
            continue;
          }

          const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

          // Filter by last processed time
          if (lastProcessedTime && pubDate <= lastProcessedTime) {
            continue;
          }

          // Extract tweet text from description
          const content = this.extractTweetText(item.contentSnippet || item.description || '');

          items.push({
            id: item.guid || item.link || '',
            title: `Tweet by @${source.username}`,
            content,
            url: item.link?.replace(instance, 'twitter.com'),
            publishedAt: pubDate,
            category: source.category,
            sourceName: source.name
          });
        }

        console.log(`   Using Nitter instance: ${instance}`);
        return items;

      } catch (error) {
        console.warn(`   Nitter instance ${instance} failed, trying next...`);
        continue;
      }
    }

    throw new Error(`All Nitter instances failed for @${source.username}`);
  }

  private extractTweetText(html: string): string {
    // Remove HTML tags
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
