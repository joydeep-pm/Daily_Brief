/**
 * Backfill Obsidian vault with ALL past briefings from Gmail.
 * Each email gets its own time-stamped folder so multiple runs per day are preserved.
 *
 * Usage: npx tsx scripts/backfill-obsidian-gmail.ts
 */
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { existsSync, readdirSync, rmSync } from 'fs';
import path from 'path';
import { ObsidianDelivery } from '../src/delivery/obsidian.js';

dotenv.config();

function getGmailClient() {
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function htmlToMarkdown(html: string): string {
  let content = html;

  // Remove style tags and their content
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Convert headings
  content = content.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, text) => `# ${stripTags(text).trim()}\n\n`);
  content = content.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, text) => `## ${stripTags(text).trim()}\n\n`);
  content = content.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, text) => `### ${stripTags(text).trim()}\n\n`);

  // Convert list items
  content = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, text) => `- ${stripTags(text).trim()}\n`);
  content = content.replace(/<\/?[uo]l[^>]*>/gi, '\n');

  // Convert bold
  content = content.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  content = content.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');

  // Convert italic
  content = content.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  content = content.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');

  // Convert code
  content = content.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // Convert links
  content = content.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  // Convert line breaks and paragraphs
  content = content.replace(/<br\s*\/?>/gi, '\n');
  content = content.replace(/<\/p>/gi, '\n\n');
  content = content.replace(/<p[^>]*>/gi, '');

  // Convert horizontal rules
  content = content.replace(/<hr[^>]*>/gi, '\n---\n');

  // Remove divs (but keep content)
  content = content.replace(/<\/?div[^>]*>/gi, '\n');

  // Remove table elements but keep content
  content = content.replace(/<\/?(?:table|tr|td|th|thead|tbody)[^>]*>/gi, '\n');

  // Remove remaining HTML tags
  content = content.replace(/<\/?[^>]+(>|$)/g, '');

  // Decode HTML entities
  content = content.replace(/&amp;/g, '&');
  content = content.replace(/&lt;/g, '<');
  content = content.replace(/&gt;/g, '>');
  content = content.replace(/&quot;/g, '"');
  content = content.replace(/&#039;/g, "'");
  content = content.replace(/&nbsp;/g, ' ');

  // Trim leading whitespace from each line (table nesting causes indentation)
  content = content.split('\n').map(line => line.trim()).join('\n');

  // Remove stray bullet characters from styled <span>•</span> inside <li>
  content = content.replace(/^- •\s*/gm, '- ');

  // Clean up excessive whitespace
  content = content.replace(/\n{3,}/g, '\n\n');
  content = content.trim();

  // Remove email chrome (header "Daily Brief" + date, footer "Generated with AI")
  content = content.replace(/^# 📬 Daily Brief\n.*?\n\n/s, '');
  content = content.replace(/\n🤖 Generated with AI.*$/s, '');
  content = content.trim();

  return content;
}

function stripTags(html: string): string {
  return html.replace(/<\/?[^>]+(>|$)/g, '');
}

function clearExistingDateFolders(vaultPath: string) {
  if (!existsSync(vaultPath)) return;

  for (const entry of readdirSync(vaultPath, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== '.obsidian') {
      rmSync(path.join(vaultPath, entry.name), { recursive: true });
    }
  }
}

interface EmailInfo {
  id: string;
  subject: string;
  briefDate: string;
  sendTime: string; // HH-mm format
  internalDate: number;
}

async function main() {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH!;
  const gmail = getGmailClient();

  // Clear existing content so we get a clean rebuild
  console.log('Clearing existing vault content...');
  clearExistingDateFolders(vaultPath);

  // Search for Daily Brief emails
  console.log('Searching Gmail for Daily Brief emails...\n');
  const searchResponse = await gmail.users.messages.list({
    userId: 'me',
    q: 'subject:"Daily Brief" from:me to:me',
    maxResults: 50,
  });

  const messageIds = searchResponse.data.messages || [];
  console.log(`Found ${messageIds.length} emails. Fetching metadata...\n`);

  // First pass: fetch all emails and collect metadata
  const emails: EmailInfo[] = [];
  for (const msg of messageIds) {
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id!,
      format: 'metadata',
      metadataHeaders: ['Subject', 'Date'],
    });

    const headers = full.data.payload?.headers || [];
    const subject = headers.find((h) => h.name?.toLowerCase() === 'subject')?.value || '';
    const internalDate = parseInt(full.data.internalDate || '0');
    const sendDate = new Date(internalDate);

    // Extract date from subject or fall back to send time
    const dateMatch = subject.match(/(\d{4}-\d{2}-\d{2})/);
    let briefDate: string;
    if (dateMatch) {
      briefDate = dateMatch[1];
    } else {
      briefDate = sendDate.toISOString().slice(0, 10);
    }

    const hours = sendDate.getHours().toString().padStart(2, '0');
    const minutes = sendDate.getMinutes().toString().padStart(2, '0');

    emails.push({
      id: msg.id!,
      subject,
      briefDate,
      sendTime: `${hours}h${minutes}`,
      internalDate,
    });
  }

  // Sort oldest first
  emails.sort((a, b) => a.internalDate - b.internalDate);

  // Count emails per date to decide folder naming
  const countByDate = new Map<string, number>();
  for (const e of emails) {
    countByDate.set(e.briefDate, (countByDate.get(e.briefDate) || 0) + 1);
  }

  console.log('Emails by date:');
  for (const [date, count] of [...countByDate.entries()].sort()) {
    console.log(`  ${date}: ${count} email${count > 1 ? 's' : ''}`);
  }
  console.log();

  // Second pass: fetch full content and save
  const obsidian = new ObsidianDelivery();
  let saved = 0;
  let empty = 0;
  let failed = 0;

  for (const email of emails) {
    try {
      // Use time-stamped folder if multiple emails on same date, plain date otherwise
      const hasMultiple = (countByDate.get(email.briefDate) || 0) > 1;
      const folderDate = hasMultiple
        ? `${email.briefDate} ${email.sendTime}`
        : email.briefDate;

      process.stdout.write(`  ${folderDate} — ${email.subject} ... `);

      const full = await gmail.users.messages.get({
        userId: 'me',
        id: email.id,
        format: 'full',
      });

      // Extract HTML body
      let htmlBody = '';
      const payload = full.data.payload;

      if (payload?.body?.data) {
        htmlBody = Buffer.from(payload.body.data, 'base64url').toString('utf-8');
      } else if (payload?.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === 'text/html' && part.body?.data) {
            htmlBody = Buffer.from(part.body.data, 'base64url').toString('utf-8');
            break;
          }
        }
      }

      if (!htmlBody) {
        console.log('no HTML body, skipped');
        empty++;
        continue;
      }

      const markdown = htmlToMarkdown(htmlBody);

      if (!markdown.trim()) {
        console.log('empty after conversion, skipped');
        empty++;
        continue;
      }

      const result = await obsidian.deliver(markdown, folderDate);
      console.log(result);
      saved++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(`FAILED: ${errMsg}`);
      failed++;
    }
  }

  console.log(`\nDone! Saved: ${saved}, Empty: ${empty}, Failed: ${failed}, Total: ${emails.length}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
