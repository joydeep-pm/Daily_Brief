import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

interface Section {
  title: string;
  body: string;
  type: 'executive-summary' | 'emerging-patterns' | 'theme';
}

export class ObsidianDelivery {
  private vaultPath: string;

  constructor() {
    this.vaultPath = process.env.OBSIDIAN_VAULT_PATH || '';
    if (!this.vaultPath) {
      throw new Error('OBSIDIAN_VAULT_PATH not configured');
    }
  }

  async deliver(briefing: string, date?: string): Promise<string> {
    const today = date || new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const dateDir = path.join(this.vaultPath, today);

    await mkdir(dateDir, { recursive: true });

    const sections = this.parseSections(briefing);

    for (const section of sections) {
      const filename = this.sanitizeFilename(section.title) + '.md';
      const filePath = path.join(dateDir, filename);
      const category = this.inferCategory(section.title, section.body);

      const tags = this.inferTags(section.title, section.body);

      const content = [
        '---',
        `date: ${today}`,
        `category: ${category}`,
        `type: ${section.type}`,
        `brief: "[[${today}]]"`,
        'tags:',
        ...tags.map(t => `  - ${t}`),
        '---',
        '',
        `## ${section.title}`,
        '',
        section.body,
      ].join('\n');

      await writeFile(filePath, content, 'utf-8');
    }

    return `${sections.length} notes saved to ${dateDir}`;
  }

  private parseSections(briefing: string): Section[] {
    const sections: Section[] = [];

    // Split on ## headings (keep the heading text)
    const parts = briefing.split(/\n## /);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      // Skip the first chunk (everything before the first ## heading, including # title)
      if (i === 0) continue;

      const newlineIdx = part.indexOf('\n');
      if (newlineIdx === -1) continue;

      const title = part.substring(0, newlineIdx).trim();
      const body = part.substring(newlineIdx + 1).trim();

      // Skip empty sections or error sections
      if (!body || title.startsWith('⚠️')) continue;

      sections.push({
        title,
        body,
        type: this.inferType(title),
      });
    }

    return sections;
  }

  private inferType(title: string): Section['type'] {
    const lower = title.toLowerCase();
    if (lower.includes('executive summary') || lower.includes('overview') || lower.includes('top stories')) {
      return 'executive-summary';
    }
    if (lower.includes('emerging pattern') || lower.includes('looking ahead') || lower.includes('trend')) {
      return 'emerging-patterns';
    }
    return 'theme';
  }

  private inferCategory(title: string, body: string): string {
    const text = (title + ' ' + body).toLowerCase();

    const categories: [string, string[]][] = [
      ['AI Architecture', ['architecture', 'system design', 'infrastructure', 'scaling']],
      ['AI Models', ['model', 'llm', 'gpt', 'claude', 'reasoning', 'benchmark']],
      ['AI Tools', ['tool', 'agent', 'code assistant', 'copilot', 'claude code', 'cursor']],
      ['Startups', ['startup', 'founder', 'fundrais', 'venture', 'yc', 'y combinator']],
      ['Product', ['product', 'user experience', 'retention', 'growth', 'engagement']],
      ['Engineering', ['engineering', 'developer', 'programming', 'software', 'code']],
      ['Research', ['research', 'paper', 'study', 'findings', 'experiment']],
      ['Industry', ['industry', 'market', 'company', 'business', 'enterprise']],
    ];

    for (const [category, keywords] of categories) {
      if (keywords.some(kw => text.includes(kw))) {
        return category;
      }
    }

    return 'General';
  }

  private inferTags(title: string, body: string): string[] {
    const text = (title + ' ' + body).toLowerCase();

    const rules: [string, string[]][] = [
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

    const tags = rules
      .filter(([, keywords]) => keywords.some(kw => text.includes(kw)))
      .map(([tag]) => tag);

    return tags.length > 0 ? tags : ['general'];
  }

  private sanitizeFilename(title: string): string {
    return title
      .replace(/[<>:"/\\|?*]/g, '')  // Remove filesystem-unsafe chars
      .replace(/\s+/g, ' ')           // Collapse whitespace
      .trim()
      .slice(0, 100);                 // Limit length
  }
}
