import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { SourceHandler, SourceConfig, SourceItem } from '../types.js';

export class GmailHandler implements SourceHandler {
  private gmail: gmail_v1.Gmail;
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    this.oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    this.gmail = google.gmail({
      version: 'v1',
      auth: this.oauth2Client
    });
  }

  async fetch(source: SourceConfig, lastProcessedTime?: Date): Promise<SourceItem[]> {
    if (!source.query) {
      throw new Error(`Gmail source "${source.name}" missing query`);
    }

    try {
      // Build query with time filter
      let query = source.query;
      if (lastProcessedTime) {
        const timestamp = Math.floor(lastProcessedTime.getTime() / 1000);
        query += ` after:${timestamp}`;
      }

      // Search for messages
      const searchResponse = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 50
      });

      const messageIds = searchResponse.data.messages?.map(m => m.id).filter((id): id is string => !!id) || [];

      if (messageIds.length === 0) {
        return [];
      }

      // Fetch full message details
      const items: SourceItem[] = [];

      for (const messageId of messageIds) {
        try {
          const item = await this.processMessage(messageId, source);
          if (item) {
            items.push(item);
          }
        } catch (error) {
          console.warn(`Failed to process message ${messageId}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return items;
    } catch (error) {
      throw new Error(`Failed to fetch Gmail messages: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async processMessage(messageId: string, source: SourceConfig): Promise<SourceItem | null> {
    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    const message = response.data;

    // Extract headers
    const headers = message.payload?.headers || [];
    const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || 'No Subject';
    const dateStr = headers.find(h => h.name?.toLowerCase() === 'date')?.value;
    const publishedAt = dateStr ? new Date(dateStr) : new Date();

    // Extract body
    const body = this.extractBody(message.payload);

    if (!body.trim()) {
      return null;
    }

    return {
      id: messageId,
      title: subject,
      content: this.cleanEmailContent(body),
      url: `https://mail.google.com/mail/u/0/#inbox/${messageId}`,
      publishedAt,
      category: source.category,
      sourceName: source.name
    };
  }

  private extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
    if (!payload) return '';

    // Try to get text/plain or text/html body
    if (payload.body?.data) {
      const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      return decoded;
    }

    // Recursively search parts
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
          if (part.body?.data) {
            const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');
            return decoded;
          }
        }

        // Recurse into multipart
        const nested = this.extractBody(part);
        if (nested) return nested;
      }
    }

    return '';
  }

  private cleanEmailContent(html: string): string {
    // Remove common email boilerplate patterns
    let text = html
      // Remove HTML tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      // Remove URLs from unsubscribe footers
      .replace(/https?:\/\/[^\s]+unsubscribe[^\s]*/gi, '')
      .replace(/Click here to unsubscribe.*/gi, '');

    // Clean whitespace
    text = text
      .replace(/\s+/g, ' ')
      .trim();

    return text;
  }
}
