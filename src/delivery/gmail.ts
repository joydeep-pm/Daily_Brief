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
      const date = new Date();
      const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Clean subject: just "Daily Brief - Monday, March 16, 2026"
      const subject = `Daily Brief - ${formattedDate}`;

      // Convert markdown to beautiful HTML
      const htmlBody = this.createBeautifulEmail(briefing, formattedDate);

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

  private createBeautifulEmail(briefing: string, formattedDate: string): string {
    // Remove the first heading if it's just the date (redundant with subject)
    const cleanBriefing = briefing.replace(/^#\s+Daily Brief - \d{4}-\d{2}-\d{2}\s*\n/, '');

    const content = this.markdownToHtml(cleanBriefing);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Brief</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9f9f9; font-family: Georgia, 'Times New Roman', Times, serif;">

  <!-- Email Container -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; background-color: #ffffff; border-radius: 2px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">

          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a2e; padding: 40px 48px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Daily Brief
              </h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.6); font-size: 15px; font-family: Georgia, 'Times New Roman', Times, serif; font-style: italic;">
                ${formattedDate}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 44px 48px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 48px; border-top: 1px solid #e0e0e0; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Compiled by AI &middot; ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
  }

  private markdownToHtml(markdown: string): string {
    let html = '';
    const lines = markdown.split('\n');
    let inSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!line.trim()) {
        continue;
      }

      // Heading 2 (Main Sections) - clean bottom border
      if (line.startsWith('## ')) {
        if (inSection) html += '</div>'; // Close previous section

        const title = this.escapeHtml(line.substring(3));
        html += `
          <h2 style="margin: 40px 0 20px 0; padding-bottom: 12px; border-bottom: 2px solid #e0e0e0; color: #1a1a1a; font-size: 22px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${title}</h2>
        `;
        inSection = true;
      }
      // Heading 3 (Subsections)
      else if (line.startsWith('### ')) {
        html += `<h3 style="margin: 28px 0 12px 0; color: #1a1a1a; font-size: 17px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${this.escapeHtml(line.substring(4))}</h3>`;
      }
      // Bullet list - enhanced styling
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        const prevLine = i > 0 ? lines[i - 1] : '';
        if (!prevLine.startsWith('- ') && !prevLine.startsWith('* ')) {
          html += '<ul style="margin: 16px 0; padding-left: 28px; list-style-type: none;">';
        }

        html += `
          <li style="margin-bottom: 14px; padding-left: 8px; position: relative; color: #3d3d3d; font-size: 17px; line-height: 1.78;">
            <span style="position: absolute; left: -16px; color: #9ca3af;">•</span>
            ${this.parseInlineMarkdown(line.substring(2))}
          </li>
        `;

        const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
        if (!nextLine.startsWith('- ') && !nextLine.startsWith('* ')) {
          html += '</ul>';
        }
      }
      // Divider
      else if (line.trim() === '---') {
        if (inSection) {
          html += '</div>';
          inSection = false;
        }
        html += '<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 40px 0;">';
      }
      // Regular paragraph
      else {
        html += `<p style="margin: 16px 0; color: #3d3d3d; line-height: 1.78; font-size: 17px;">${this.parseInlineMarkdown(line)}</p>`;
      }
    }

    if (inSection) html += '</div>';
    return html;
  }

  private parseInlineMarkdown(text: string): string {
    // Escape HTML first
    text = this.escapeHtmlBasic(text);

    // Bold (**text**)
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong style="color: #1a1a1a; font-weight: 600;">$1</strong>');

    // Italic (*text*)
    text = text.replace(/\*(.+?)\*/g, '<em style="color: #3d3d3d;">$1</em>');

    // Code (`text`)
    text = text.replace(/`(.+?)`/g, '<code style="background: #f5f5f5; color: #b91c1c; padding: 3px 6px; border-radius: 4px; font-family: \'SFMono-Regular\', \'Consolas\', \'Liberation Mono\', \'Menlo\', monospace; font-size: 14px;">$1</code>');

    // Links ([text](url))
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #8b5cf6; text-decoration: none; border-bottom: 1px solid rgba(139, 92, 246, 0.25);">$1</a>');

    return text;
  }

  private escapeHtmlBasic(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
