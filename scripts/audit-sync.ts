/**
 * Audit sync state across Gmail, Notion, and Obsidian.
 */
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Client } from '@notionhq/client';
import { existsSync, readdirSync } from 'fs';
import path from 'path';

dotenv.config();

async function getGmailDates(): Promise<string[]> {
  const oauth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: 'subject:"Daily Brief" from:me to:me',
    maxResults: 100,
  });

  const dates: string[] = [];
  for (const msg of res.data.messages || []) {
    const full = await gmail.users.messages.get({
      userId: 'me', id: msg.id!, format: 'metadata', metadataHeaders: ['Subject'],
    });
    const headers = full.data.payload?.headers || [];
    const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
    const internalDate = parseInt(full.data.internalDate || '0');
    const sendDate = new Date(internalDate);
    const dateStr = sendDate.toISOString().slice(0, 10);
    const hours = sendDate.getHours().toString().padStart(2, '0');
    const minutes = sendDate.getMinutes().toString().padStart(2, '0');
    dates.push(`${dateStr} ${hours}h${minutes}`);
  }
  return dates.sort();
}

async function getNotionDates(): Promise<string[]> {
  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  const databaseId = process.env.NOTION_DATABASE_ID!;

  const dates: string[] = [];
  let cursor: string | undefined;

  do {
    const res = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
      sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
    });

    for (const page of res.results as any[]) {
      const title = page.properties?.Name?.title?.[0]?.plain_text || '';
      const created = page.created_time?.slice(0, 16).replace('T', ' ') || '';
      dates.push(`${title} (${created})`);
    }

    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  return dates;
}

function getObsidianFolders(): string[] {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH!;
  if (!existsSync(vaultPath)) return [];

  return readdirSync(vaultPath, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name !== '.obsidian')
    .map(e => {
      const noteCount = readdirSync(path.join(vaultPath, e.name)).filter(f => f.endsWith('.md')).length;
      return `${e.name} (${noteCount} notes)`;
    })
    .sort();
}

async function main() {
  console.log('=== GMAIL ===');
  const gmailDates = await getGmailDates();
  console.log(`${gmailDates.length} emails:`);
  gmailDates.forEach(d => console.log(`  ${d}`));

  console.log('\n=== NOTION ===');
  const notionDates = await getNotionDates();
  console.log(`${notionDates.length} pages:`);
  notionDates.forEach(d => console.log(`  ${d}`));

  console.log('\n=== OBSIDIAN ===');
  const obsidianFolders = getObsidianFolders();
  console.log(`${obsidianFolders.length} folders:`);
  obsidianFolders.forEach(d => console.log(`  ${d}`));

  // Find unique dates in each
  const gmailUniqueDates = new Set(gmailDates.map(d => d.slice(0, 10)));
  const notionUniqueDates = new Set(notionDates.map(d => {
    const m = d.match(/(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
  }).filter(Boolean));
  const obsidianUniqueDates = new Set(obsidianFolders.map(f => f.slice(0, 10)));

  console.log('\n=== SUMMARY BY DATE ===');
  const allDates = new Set([...gmailUniqueDates, ...notionUniqueDates, ...obsidianUniqueDates]);
  const sorted = [...allDates].sort();
  console.log('Date        | Gmail | Notion | Obsidian');
  console.log('------------|-------|--------|--------');
  for (const date of sorted) {
    const gCount = gmailDates.filter(d => d.startsWith(date)).length;
    const nCount = notionDates.filter(d => d.includes(date)).length;
    const oCount = obsidianFolders.filter(f => f.startsWith(date)).length;
    const gMark = gCount > 0 ? `${gCount}` : '  MISSING';
    const nMark = nCount > 0 ? `${nCount}` : '  MISSING';
    const oMark = oCount > 0 ? `${oCount}` : '  MISSING';
    console.log(`${date}  | ${gMark.padStart(5)} | ${nMark.padStart(6)} | ${oMark.padStart(6)}`);
  }
}

main().catch(console.error);
