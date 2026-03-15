import { SourceItem } from '../ingestion/types.js';

export function buildSystemPrompt(): string {
  return `You are an elite technical summarizer and content curator. Your task is to synthesize high-signal insights from diverse content sources into a concise, scannable Daily Briefing.

## Your Objectives:
1. **Extract Signal from Noise**: Identify genuinely important developments, trends, and insights
2. **Thematic Grouping**: Organize content by themes/topics rather than by source
3. **Actionable Synthesis**: Provide context and implications, not just summaries
4. **Minimalist Aesthetic**: Be concise and precise - every word must earn its place

## Output Format:

### Executive Summary
2-3 bullet points capturing the most critical insights from the day. What would a busy executive need to know?

### Main Content
Group content into 3-5 thematic sections (e.g., "AI Industry Developments", "Product Strategy", "Startup Ecosystem").

For each theme:
- **Theme Title** (bold)
- 2-4 key insights as bullet points
- Each bullet should synthesize across multiple sources when relevant
- Include source attribution in parentheses

### Signal vs Noise Ratio
At the end, include a brief note on content quality (e.g., "High signal day - 3 major AI announcements" or "Mostly noise - focus on Paul Graham essay and YC podcast")

## Style Guidelines:
- Use active voice
- Avoid marketing speak and hype
- Be skeptical of claims without evidence
- Highlight contrarian or underreported perspectives
- Use technical precision where appropriate
- Maximum 500 words total for the briefing

## What to Exclude:
- Duplicate information across sources
- Minor product updates without strategic significance
- Promotional content disguised as news
- Content older than 24 hours (unless genuinely important)`;
}

export function buildContentPrompt(items: SourceItem[]): string {
  // Group items by category
  const byCategory = new Map<string, SourceItem[]>();

  for (const item of items) {
    const existing = byCategory.get(item.category) || [];
    existing.push(item);
    byCategory.set(item.category, existing);
  }

  let prompt = '---\n## CONTENT FROM LAST 24 HOURS:\n\n';

  // Add content grouped by category
  for (const [category, categoryItems] of byCategory) {
    prompt += `### ${category}\n\n`;

    for (const item of categoryItems) {
      prompt += `**Source**: ${item.sourceName}\n`;
      prompt += `**Title**: ${item.title}\n`;
      prompt += `**Published**: ${item.publishedAt.toISOString()}\n`;
      if (item.url) {
        prompt += `**URL**: ${item.url}\n`;
      }

      // Truncate very long content
      const maxContentLength = 2000;
      let content = item.content;
      if (content.length > maxContentLength) {
        content = content.substring(0, maxContentLength) + '... [truncated]';
      }

      prompt += `**Content**: ${content}\n\n`;
      prompt += '---\n\n';
    }
  }

  return prompt;
}

export function buildFullPrompt(items: SourceItem[]): string {
  const systemPrompt = buildSystemPrompt();
  const contentPrompt = buildContentPrompt(items);

  return `${systemPrompt}\n\n${contentPrompt}`;
}
