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

  private createBeautifulEmail(briefing: string, _formattedDate: string): string {
    // Remove the first heading if it's just the date (redundant with subject)
    const cleanBriefing = briefing.replace(/^#\s+Daily Brief - \d{4}-\d{2}-\d{2}\s*\n/, '');

    const content = this.markdownToHtml(cleanBriefing);

    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const shortDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Brief</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f0; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px;">

          <!-- Top label -->
          <tr>
            <td style="padding: 0 0 12px 0; text-align: center;">
              <span style="font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #888;">
                ${dayOfWeek} &bull; ${shortDate}
              </span>
            </td>
          </tr>

          <!-- Header card -->
          <tr>
            <td style="background-color: #0f172a; border-radius: 12px 12px 0 0; padding: 36px 48px 32px 48px; text-align: center;">
              <div style="display: inline-block; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); border-radius: 20px; padding: 4px 14px; margin-bottom: 16px;">
                <span style="font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #818cf8;">AI &middot; PM &middot; Leadership</span>
              </div>
              <h1 style="margin: 0; color: #f8fafc; font-size: 30px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.1;">
                Daily Brief
              </h1>
              <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 14px; font-weight: 400;">
                Your signal in the noise
              </p>
            </td>
          </tr>

          <!-- Accent bar -->
          <tr>
            <td style="background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%); height: 3px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px 48px; border-radius: 0;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; border-radius: 0 0 12px 12px; padding: 20px 48px; text-align: center;">
              <p style="margin: 0; color: #475569; font-size: 12px; line-height: 1.6;">
                Compiled by AI &middot; ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST
              </p>
            </td>
          </tr>

          <!-- Bottom spacing -->
          <tr><td style="height: 32px;"></td></tr>

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
    let inList = false;
    let isFirst = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!line.trim()) {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        continue;
      }

      // Heading 1
      if (line.startsWith('# ')) {
        if (inList) { html += '</ul>'; inList = false; }
        const title = this.escapeHtml(line.substring(2));
        html += `<h1 style="margin: 0 0 24px 0; color: #0f172a; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2;">${title}</h1>`;
      }
      // Heading 2 — section header with left accent bar
      else if (line.startsWith('## ')) {
        if (inList) { html += '</ul>'; inList = false; }
        const title = this.escapeHtml(line.substring(3));
        const topMargin = isFirst ? '0' : '44px';
        html += `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: ${topMargin} 0 20px 0;">
            <tr>
              <td style="width: 4px; background: linear-gradient(180deg, #6366f1, #8b5cf6); border-radius: 2px;">&nbsp;</td>
              <td style="padding-left: 14px;">
                <h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">${title}</h2>
              </td>
            </tr>
          </table>`;
        isFirst = false;
      }
      // Heading 3
      else if (line.startsWith('### ')) {
        if (inList) { html += '</ul>'; inList = false; }
        const title = this.escapeHtml(line.substring(4));
        html += `<h3 style="margin: 28px 0 10px 0; color: #1e293b; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${title}</h3>`;
      }
      // Bullet list
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        if (!inList) {
          html += '<ul style="margin: 14px 0; padding: 0; list-style: none;">';
          inList = true;
        }
        html += `
          <li style="display: flex; align-items: flex-start; margin-bottom: 12px; padding: 14px 16px; background: #f8fafc; border-radius: 8px; border-left: 3px solid #e2e8f0;">
            <span style="color: #6366f1; font-weight: 700; font-size: 16px; margin-right: 10px; margin-top: 1px; flex-shrink: 0;">›</span>
            <span style="color: #334155; font-size: 15px; line-height: 1.7;">${this.parseInlineMarkdown(line.substring(2))}</span>
          </li>`;
      }
      // Divider
      else if (line.trim() === '---') {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<div style="border-top: 1px solid #e2e8f0; margin: 36px 0;"></div>';
      }
      // Regular paragraph
      else {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<p style="margin: 14px 0; color: #475569; line-height: 1.75; font-size: 15px;">${this.parseInlineMarkdown(line)}</p>`;
      }
    }

    if (inList) html += '</ul>';
    return html;
  }

  private parseInlineMarkdown(text: string): string {
    // Escape HTML first
    text = this.escapeHtmlBasic(text);

    // Bold (**text**)
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong style="color: #0f172a; font-weight: 700;">$1</strong>');

    // Italic (*text*)
    text = text.replace(/\*(.+?)\*/g, '<em style="color: #475569;">$1</em>');

    // Code (`text`)
    text = text.replace(/`(.+?)`/g, '<code style="background: #f1f5f9; color: #7c3aed; padding: 2px 6px; border-radius: 4px; font-family: \'SFMono-Regular\', \'Consolas\', monospace; font-size: 13px;">$1</code>');

    // Links ([text](url))
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #6366f1; text-decoration: none; font-weight: 500; border-bottom: 1px solid rgba(99,102,241,0.3);">$1</a>');

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
