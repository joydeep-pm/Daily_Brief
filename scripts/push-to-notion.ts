/**
 * Push today's briefing to Notion (one-off fix for the 100-block limit failure).
 * Reads the latest briefing from Obsidian and sends it to Notion.
 */
import dotenv from 'dotenv';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { NotionDelivery } from '../src/delivery/notion.js';

dotenv.config();

const vaultPath = process.env.OBSIDIAN_VAULT_PATH!;

// Find today's folder
const today = new Date().toISOString().slice(0, 10);
const entries = readdirSync(vaultPath, { withFileTypes: true })
  .filter(e => e.isDirectory() && e.name.startsWith(today))
  .sort();

if (entries.length === 0) {
  console.log(`No Obsidian folder for ${today}`);
  process.exit(1);
}

// Use the plain date folder (from local run) or the latest timestamped one
const folder = entries.find(e => e.name === today) || entries[entries.length - 1];
const folderPath = path.join(vaultPath, folder.name);

console.log(`Reading notes from: ${folderPath}`);

// Read all .md files and reconstruct a briefing
const files = readdirSync(folderPath).filter(f => f.endsWith('.md')).sort();
let briefing = `# Daily Brief - ${today}\n\n`;

for (const file of files) {
  const content = readFileSync(path.join(folderPath, file), 'utf-8');
  // Strip frontmatter
  const body = content.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
  if (body) {
    briefing += body + '\n\n';
  }
}

console.log(`Reconstructed briefing with ${files.length} sections.\n`);
console.log('Pushing to Notion...');

const notion = new NotionDelivery();
notion.deliver(briefing, {}).then(url => {
  console.log(`Done! ${url}`);
}).catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
