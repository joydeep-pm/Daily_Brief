/**
 * Backfill Obsidian vault with past briefings from Notion.
 *
 * Usage: npx tsx scripts/backfill-obsidian.ts
 */
import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import { ObsidianDelivery } from '../src/delivery/obsidian.js';

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID!;

interface RichTextItem {
  type: string;
  plain_text: string;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
  };
  text?: { link?: { url: string } | null };
}

function richTextToMarkdown(richText: RichTextItem[]): string {
  return richText
    .map((rt) => {
      let text = rt.plain_text;
      if (rt.annotations?.bold) text = `**${text}**`;
      if (rt.annotations?.italic) text = `*${text}*`;
      if (rt.annotations?.code) text = `\`${text}\``;
      if (rt.text?.link?.url) text = `[${text}](${rt.text.link.url})`;
      return text;
    })
    .join('');
}

async function blocksToMarkdown(pageId: string): Promise<string> {
  const lines: string[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of response.results as any[]) {
      switch (block.type) {
        case 'heading_1':
          lines.push(`# ${richTextToMarkdown(block.heading_1.rich_text)}`);
          break;
        case 'heading_2':
          lines.push(`## ${richTextToMarkdown(block.heading_2.rich_text)}`);
          break;
        case 'heading_3':
          lines.push(`### ${richTextToMarkdown(block.heading_3.rich_text)}`);
          break;
        case 'bulleted_list_item':
          lines.push(`- ${richTextToMarkdown(block.bulleted_list_item.rich_text)}`);
          break;
        case 'numbered_list_item':
          lines.push(`- ${richTextToMarkdown(block.numbered_list_item.rich_text)}`);
          break;
        case 'paragraph':
          lines.push(richTextToMarkdown(block.paragraph.rich_text));
          break;
        case 'divider':
          lines.push('---');
          break;
        default:
          break;
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return lines.join('\n');
}

async function main() {
  console.log('Fetching past briefings from Notion...\n');

  // Query all pages in the database, sorted by created time
  let cursor: string | undefined;
  const pages: { id: string; title: string; date: string }[] = [];

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
      sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
    });

    for (const page of response.results as any[]) {
      const titleProp = page.properties?.Name?.title;
      const title: string = titleProp?.[0]?.plain_text || 'Untitled';

      // Extract date from title "Daily Brief - YYYY-MM-DD"
      const dateMatch = title.match(/(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch
        ? dateMatch[1]
        : page.created_time?.slice(0, 10) || new Date().toISOString().slice(0, 10);

      pages.push({ id: page.id, title, date });
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  console.log(`Found ${pages.length} briefings in Notion.\n`);

  const obsidian = new ObsidianDelivery();
  let saved = 0;
  let failed = 0;

  for (const page of pages) {
    try {
      process.stdout.write(`  ${page.date} — ${page.title} ... `);

      const markdown = await blocksToMarkdown(page.id);

      if (!markdown.trim()) {
        console.log('empty, skipped');
        continue;
      }

      const result = await obsidian.deliver(markdown, page.date);
      console.log(result);
      saved++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`FAILED: ${msg}`);
      failed++;
    }
  }

  console.log(`\nDone! Saved: ${saved}, Failed: ${failed}, Total: ${pages.length}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
