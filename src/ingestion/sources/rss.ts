import Parser from 'rss-parser';
import { SourceHandler, SourceConfig, SourceItem } from '../types.js';

export class RSSHandler implements SourceHandler {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });
  }

  async fetch(source: SourceConfig, lastProcessedTime?: Date): Promise<SourceItem[]> {
    if (!source.url) {
      throw new Error(`RSS source "${source.name}" missing URL`);
    }

    try {
      const feed = await this.parser.parseURL(source.url);
      const items: SourceItem[] = [];

      for (const item of feed.items) {
        // Skip if no GUID/link (can't deduplicate)
        if (!item.guid && !item.link) {
          continue;
        }

        // Parse published date
        const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

        // Filter by last processed time if provided
        if (lastProcessedTime && pubDate <= lastProcessedTime) {
          continue;
        }

        // Extract content (prefer content over contentSnippet over description)
        const content =
          item.content ||
          item.contentSnippet ||
          item.description ||
          item.summary ||
          '';

        items.push({
          id: item.guid || item.link || '',
          title: item.title || 'Untitled',
          content: this.cleanContent(content),
          url: item.link,
          publishedAt: pubDate,
          category: source.category,
          sourceName: source.name
        });
      }

      return items;
    } catch (error) {
      throw new Error(`Failed to fetch RSS feed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private cleanContent(html: string): string {
    // Basic HTML tag removal
    let text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ')
      .trim();

    return text;
  }
}
