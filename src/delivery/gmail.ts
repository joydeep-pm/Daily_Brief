import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GmailDelivery {
  private gmail: gmail_v1.Gmail;
  private oauth2Client: OAuth2Client;
  private sendAddress: string;

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

    this.sendAddress = process.env.GMAIL_SEND_ADDRESS || '';

    if (!this.sendAddress) {
      throw new Error('GMAIL_SEND_ADDRESS not configured');
    }
  }

  async deliver(briefing: string): Promise<string> {
    try {
      const date = new Date().toISOString().split('T')[0];
      const subject = `Daily Brief - ${date}`;

      // Convert markdown to HTML
      const htmlBody = this.markdownToHtml(briefing);

      // Create email message
      const message = this.createEmail(this.sendAddress, subject, htmlBody);

      // Send email
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message
        }
      });

      return response.data.id || 'unknown';
    } catch (error) {
      throw new Error(`Failed to deliver to Gmail: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private createEmail(to: string, subject: string, htmlBody: string): string {
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlBody
    ].join('\n');

    // Base64url encode the email
    return Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private markdownToHtml(markdown: string): string {
    let html = '<html><body style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px;">';

    const lines = markdown.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!line.trim()) {
        continue;
      }

      // Heading 1
      if (line.startsWith('# ')) {
        html += `<h1 style="color: #1a1a1a; margin-top: 24px; margin-bottom: 16px;">${this.escapeHtml(line.substring(2))}</h1>`;
      }
      // Heading 2
      else if (line.startsWith('## ')) {
        html += `<h2 style="color: #2a2a2a; margin-top: 20px; margin-bottom: 12px;">${this.escapeHtml(line.substring(3))}</h2>`;
      }
      // Heading 3
      else if (line.startsWith('### ')) {
        html += `<h3 style="color: #3a3a3a; margin-top: 16px; margin-bottom: 8px;">${this.escapeHtml(line.substring(4))}</h3>`;
      }
      // Bullet list
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        // Check if we're starting a new list
        const prevLine = i > 0 ? lines[i - 1] : '';
        if (!prevLine.startsWith('- ') && !prevLine.startsWith('* ')) {
          html += '<ul style="margin-top: 8px; margin-bottom: 8px;">';
        }

        html += `<li style="margin-bottom: 4px;">${this.parseInlineMarkdown(line.substring(2))}</li>`;

        // Check if we're ending the list
        const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
        if (!nextLine.startsWith('- ') && !nextLine.startsWith('* ')) {
          html += '</ul>';
        }
      }
      // Divider
      else if (line.trim() === '---') {
        html += '<hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">';
      }
      // Regular paragraph
      else {
        html += `<p style="margin-top: 8px; margin-bottom: 8px; color: #444;">${this.parseInlineMarkdown(line)}</p>`;
      }
    }

    html += '</body></html>';
    return html;
  }

  private parseInlineMarkdown(text: string): string {
    // Bold (**text**)
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic (*text*)
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Code (`text`)
    text = text.replace(/`(.+?)`/g, '<code style="background: #f5f5f5; padding: 2px 4px; border-radius: 3px;">$1</code>');

    return this.escapeHtml(text);
  }

  private escapeHtml(text: string): string {
    // Don't escape if it already contains HTML tags (from parseInlineMarkdown)
    if (/<\/?[a-z][\s\S]*>/i.test(text)) {
      return text;
    }

    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
