/**
 * Enrich existing Obsidian notes with tags in frontmatter.
 * Reads each note, infers tags from content, and rewrites the frontmatter.
 *
 * Usage: npx tsx scripts/enrich-obsidian-tags.ts
 */
import dotenv from 'dotenv';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

dotenv.config();

const TAG_RULES: [string, string[]][] = [
  ['ai-agents', ['agent', 'agentic', 'dispatch', 'cowork', 'autonomous']],
  ['ai-models', ['llm', 'gpt', 'claude', 'gemini', 'reasoning', 'benchmark', 'model']],
  ['ai-tools', ['claude code', 'cursor', 'copilot', 'code assistant', 'vibe coding', 'codex']],
  ['ai-architecture', ['architecture', 'infrastructure', 'local-first', 'cloud', 'system design']],
  ['startups', ['startup', 'founder', 'fundrais', 'venture', 'yc', 'y combinator', 'series']],
  ['product', ['product', 'retention', 'growth', 'engagement', 'user experience', 'ux', 'moat']],
  ['engineering', ['engineering', 'developer', 'programming', 'software', 'production']],
  ['talent', ['hiring', 'layoff', 'talent', 'job market', 'contractor', 'remote']],
  ['nvidia', ['nvidia', 'gpu', 'cuda', 'gtc']],
  ['open-source', ['open source', 'open-source', 'github', 'oss']],
  ['funding', ['funding', 'billion', 'million', 'raised', 'valuation', 'investment']],
];

function inferTags(content: string): string[] {
  const lower = content.toLowerCase();
  const tags: string[] = [];

  for (const [tag, keywords] of TAG_RULES) {
    if (keywords.some(kw => lower.includes(kw))) {
      tags.push(tag);
    }
  }

  return tags.length > 0 ? tags : ['general'];
}

function processFile(filePath: string) {
  const raw = readFileSync(filePath, 'utf-8');

  // Parse frontmatter
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) return false;

  const frontmatter = fmMatch[1];
  const body = raw.slice(fmMatch[0].length);

  // Skip if tags already exist
  if (frontmatter.includes('tags:')) return false;

  const tags = inferTags(body);
  const tagLine = `tags:\n${tags.map(t => `  - ${t}`).join('\n')}`;

  const newContent = `---\n${frontmatter}\n${tagLine}\n---\n${body}`;
  writeFileSync(filePath, newContent, 'utf-8');
  return true;
}

function walkDir(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '.obsidian') {
      files.push(...walkDir(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

const vaultPath = process.env.OBSIDIAN_VAULT_PATH!;
const files = walkDir(vaultPath);
let updated = 0;

for (const f of files) {
  if (processFile(f)) {
    updated++;
  }
}

console.log(`Done! Updated ${updated}/${files.length} notes with tags.`);
