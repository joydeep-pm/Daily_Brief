import { SourceHandler, SourceConfig, SourceItem } from '../types.js';

/**
 * YouTube RSS Handler - Simpler and more reliable than API
 * Uses YouTube's public RSS feeds (Atom format)
 * No API key required, no quota limits!
 */
export class YouTubeRSSHandler implements SourceHandler {
  async fetch(source: SourceConfig, lastProcessedTime?: Date): Promise<SourceItem[]> {
    if (!source.channelId) {
      throw new Error(`YouTube source "${source.name}" missing channelId`);
    }

    try {
      // YouTube RSS feed URL (Atom format)
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${source.channelId}`;

      const response = await fetch(rssUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      const items: SourceItem[] = [];

      // Simple regex parsing (YouTube Atom feeds have consistent structure)
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      const entries = xmlText.match(entryRegex) || [];

      for (const entry of entries) {
        // Extract video ID
        const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
        const videoId = videoIdMatch?.[1];

        // Extract title
        const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
        const title = titleMatch?.[1];

        // Extract published date
        const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
        const published = publishedMatch?.[1];

        // Extract description
        const descMatch = entry.match(/<media:description>([^<]*)<\/media:description>/);
        const description = descMatch?.[1] || '';

        if (!videoId || !title || !published) {
          continue;
        }

        const publishedDate = new Date(published);

        // Filter by last processed time
        if (lastProcessedTime && publishedDate <= lastProcessedTime) {
          continue;
        }

        items.push({
          id: videoId,
          title: this.decodeHtml(title),
          content: this.decodeHtml(description),
          url: `https://www.youtube.com/watch?v=${videoId}`,
          publishedAt: publishedDate,
          category: source.category,
          sourceName: source.name
        });
      }

      return items;
    } catch (error) {
      throw new Error(`Failed to fetch YouTube RSS: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private decodeHtml(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
}
