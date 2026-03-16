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
<body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Email Container -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 680px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                📬 Daily Brief
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                ${formattedDate}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 24px 40px; border-top: 1px solid #e9ecef; text-align: center;">
              <p style="margin: 0; color: #6c757d; font-size: 13px; line-height: 1.5;">
                🤖 Generated with AI • ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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

      // Heading 2 (Main Sections) - with gradient background
      if (line.startsWith('## ')) {
        if (inSection) html += '</div>'; // Close previous section

        const title = this.escapeHtml(line.substring(3));
        html += `
          <div style="margin: 32px 0 24px 0; padding: 16px 20px; background: linear-gradient(to right, #f8f9fa, #ffffff); border-left: 4px solid #667eea; border-radius: 6px;">
            <h2 style="margin: 0; color: #2d3748; font-size: 22px; font-weight: 600;">${title}</h2>
          </div>
        `;
        inSection = true;
      }
      // Heading 3 (Subsections)
      else if (line.startsWith('### ')) {
        html += `<h3 style="margin: 20px 0 12px 0; color: #4a5568; font-size: 18px; font-weight: 600;">${this.escapeHtml(line.substring(4))}</h3>`;
      }
      // Bullet list - enhanced styling
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        const prevLine = i > 0 ? lines[i - 1] : '';
        if (!prevLine.startsWith('- ') && !prevLine.startsWith('* ')) {
          html += '<ul style="margin: 16px 0; padding-left: 24px; list-style-type: none;">';
        }

        html += `
          <li style="margin-bottom: 12px; padding-left: 8px; position: relative; color: #4a5568; line-height: 1.6;">
            <span style="position: absolute; left: -16px; color: #667eea;">•</span>
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
        html += '<hr style="border: none; border-top: 2px solid #e9ecef; margin: 32px 0;">';
      }
      // Regular paragraph
      else {
        html += `<p style="margin: 12px 0; color: #4a5568; line-height: 1.7; font-size: 15px;">${this.parseInlineMarkdown(line)}</p>`;
      }
    }

    if (inSection) html += '</div>';
    return html;
  }

  private parseInlineMarkdown(text: string): string {
    // Escape HTML first
    text = this.escapeHtmlBasic(text);

    // Bold (**text**)
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong style="color: #2d3748; font-weight: 600;">$1</strong>');

    // Italic (*text*)
    text = text.replace(/\*(.+?)\*/g, '<em style="color: #4a5568;">$1</em>');

    // Code (`text`)
    text = text.replace(/`(.+?)`/g, '<code style="background: #f1f3f5; color: #e74c3c; padding: 3px 6px; border-radius: 4px; font-family: \'Monaco\', \'Courier New\', monospace; font-size: 13px;">$1</code>');

    // Links ([text](url))
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #667eea; text-decoration: none; border-bottom: 1px solid rgba(102, 126, 234, 0.3);">$1</a>');

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
