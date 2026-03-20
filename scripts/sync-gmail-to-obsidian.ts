/**
 * Sync Gmail briefings to Obsidian vault.
 * Incremental — only pulls emails that aren't already saved.
 *
 * Usage: npx tsx scripts/sync-gmail-to-obsidian.ts
 *        npm run sync
 */
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { existsSync, readdirSync } from 'fs';
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

  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  content = content.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, text) => `# ${stripTags(text).trim()}\n\n`);
  content = content.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, text) => `## ${stripTags(text).trim()}\n\n`);
  content = content.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, text) => `### ${stripTags(text).trim()}\n\n`);
  content = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, text) => `- ${stripTags(text).trim()}\n`);
  content = content.replace(/<\/?[uo]l[^>]*>/gi, '\n');
  content = content.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  content = content.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
  content = content.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  content = content.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');
  content = content.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
  content = content.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  content = content.replace(/<br\s*\/?>/gi, '\n');
  content = content.replace(/<\/p>/gi, '\n\n');
  content = content.replace(/<p[^>]*>/gi, '');
  content = content.replace(/<hr[^>]*>/gi, '\n---\n');
  content = content.replace(/<\/?div[^>]*>/gi, '\n');
  content = content.replace(/<\/?(?:table|tr|td|th|thead|tbody)[^>]*>/gi, '\n');
  content = content.replace(/<\/?[^>]+(>|$)/g, '');
  content = content.replace(/&amp;/g, '&');
  content = content.replace(/&lt;/g, '<');
  content = content.replace(/&gt;/g, '>');
  content = content.replace(/&quot;/g, '"');
  content = content.replace(/&#039;/g, "'");
  content = content.replace(/&nbsp;/g, ' ');
  content = content.split('\n').map(line => line.trim()).join('\n');
  content = content.replace(/^- •\s*/gm, '- ');
  content = content.replace(/\n{3,}/g, '\n\n');
  content = content.trim();
  content = content.replace(/^# 📬 Daily Brief\n.*?\n\n/s, '');
  content = content.replace(/\n🤖 Generated with AI.*$/s, '');

  return content.trim();
}

function stripTags(html: string): string {
  return html.replace(/<\/?[^>]+(>|$)/g, '');
}

function getExistingFolders(vaultPath: string): Set<string> {
  const folders = new Set<string>();
  if (!existsSync(vaultPath)) return folders;

  for (const entry of readdirSync(vaultPath, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== '.obsidian') {
      // Only count folders that have .md files
      const dirPath = path.join(vaultPath, entry.name);
      const hasNotes = readdirSync(dirPath).some(f => f.endsWith('.md'));
      if (hasNotes) {
        folders.add(entry.name);
      }
    }
  }
  return folders;
}

interface EmailInfo {
  id: string;
  subject: string;
  briefDate: string;
  sendTime: string;
  internalDate: number;
}

async function main() {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH!;
  const gmail = getGmailClient();

  const existingFolders = getExistingFolders(vaultPath);
  console.log(`Obsidian vault has ${existingFolders.size} existing briefing folders.\n`);

  // Search for Daily Brief emails
  console.log('Checking Gmail for Daily Brief emails...');
  const searchResponse = await gmail.users.messages.list({
    userId: 'me',
    q: 'subject:"Daily Brief" from:me to:me',
    maxResults: 50,
  });

  const messageIds = searchResponse.data.messages || [];
  console.log(`Found ${messageIds.length} emails. Checking for new ones...\n`);

  // Fetch metadata for all emails
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

    const dateMatch = subject.match(/(\d{4}-\d{2}-\d{2})/);
    const briefDate = dateMatch ? dateMatch[1] : sendDate.toISOString().slice(0, 10);

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

  emails.sort((a, b) => a.internalDate - b.internalDate);

  // Count per date for folder naming
  const countByDate = new Map<string, number>();
  for (const e of emails) {
    countByDate.set(e.briefDate, (countByDate.get(e.briefDate) || 0) + 1);
  }

  // Filter to only new emails
  const newEmails = emails.filter(email => {
    const hasMultiple = (countByDate.get(email.briefDate) || 0) > 1;
    const folderName = hasMultiple ? `${email.briefDate} ${email.sendTime}` : email.briefDate;
    return !existingFolders.has(folderName);
  });

  if (newEmails.length === 0) {
    console.log('Already up to date — no new briefings to sync.');
    return;
  }

  console.log(`${newEmails.length} new briefing(s) to sync:\n`);

  const obsidian = new ObsidianDelivery();
  let saved = 0;
  let empty = 0;
  let failed = 0;

  for (const email of newEmails) {
    try {
      const hasMultiple = (countByDate.get(email.briefDate) || 0) > 1;
      const folderDate = hasMultiple ? `${email.briefDate} ${email.sendTime}` : email.briefDate;

      process.stdout.write(`  ${folderDate} — ${email.subject} ... `);

      const full = await gmail.users.messages.get({
        userId: 'me',
        id: email.id,
        format: 'full',
      });

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

  console.log(`\nSync complete! New: ${saved}, Empty: ${empty}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
