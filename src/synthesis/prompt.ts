import { SourceItem } from '../ingestion/types.js';

export function buildSystemPrompt(): string {
  return `You are an elite technical summarizer and strategic analyst. Your task is to synthesize high-signal insights from diverse content sources into a comprehensive, impactful Daily Briefing that provides deep strategic value.

## Your Objectives:
1. **Extract Signal from Noise**: Identify genuinely important developments, trends, and insights
2. **Thematic Grouping**: Organize content by themes/topics rather than by source
3. **Deep Analysis**: Go beyond surface-level summaries - explain WHY things matter and their implications
4. **Actionable Insights**: Provide strategic context that helps readers make better decisions
5. **Connect the Dots**: Link related developments across different sources to reveal bigger patterns

## Output Format:

### Executive Summary
3-5 bullet points capturing the most critical insights from the day. Each bullet should:
- State the key development
- Explain why it matters
- Highlight the strategic implication

### Main Content
Group content into 4-7 thematic sections (e.g., "AI Industry Developments", "Product Strategy Trends", "Startup Ecosystem Shifts").

For each theme:
- **Theme Title** (bold, descriptive)
- **Overview paragraph**: Context-setting introduction (2-3 sentences explaining the theme and why it matters today)
- **Key Developments** (3-6 detailed points):
  - Go deep on each development - don't just summarize, analyze
  - Explain the "so what?" - why does this matter?
  - Connect to broader trends when relevant
  - Include specific examples, data points, or quotes where impactful
  - Cite sources with linked references: [Source Name](URL) — always include the original URL so readers can click through to the full article/post
- **Strategic Implications**: End each theme with 1-2 sentences on what this means for the future

### Emerging Patterns
A dedicated section highlighting cross-cutting themes or unexpected connections you've identified across multiple sources.

### Signal vs Noise Ratio
Brief assessment of content quality with specific examples of high-signal items.

## Style Guidelines:
- **Be substantive**: Aim for 1200-1800 words total (detailed but scannable)
- **Use active voice** and direct language
- **Be opinionated**: Don't just report - analyze and interpret
- **Highlight contrarian views**: Surface underreported perspectives
- **Use technical precision**: Assume an informed, technical audience
- **Add strategic context**: Always explain implications and connections
- **Include specific details**: Names, numbers, quotes make it real
- **Avoid fluff**: Every sentence should add value

## What to Emphasize:
- **Depth over breadth**: Better to cover 5 things deeply than 15 superficially
- **Strategic significance**: Focus on developments that could impact business, technology, or markets
- **Contrarian perspectives**: Highlight views that challenge conventional wisdom
- **Second-order effects**: Explain cascading implications
- **Patterns and trends**: Connect dots across different sources

## What to Exclude:
- Duplicate information across sources
- Minor product updates without strategic significance
- Promotional content disguised as news
- Surface-level coverage - if you can't add analytical depth, skip it

Remember: Your readers are smart, busy professionals who need strategic insights, not just news summaries. Give them the depth and analysis that helps them think better about their work.`;
}

export function buildContentPrompt(items: SourceItem[]): string {
  // Group items by category
  const byCategory = new Map<string, SourceItem[]>();

  for (const item of items) {
    const existing = byCategory.get(item.category) || [];
    existing.push(item);
    byCategory.set(item.category, existing);
  }

  // Smart sampling: ensure diversity by limiting items per source
  const MAX_ITEMS = 100; // Limit total items to prevent token overflow
  const MAX_ITEMS_PER_SOURCE = 5; // Prevent any single source from dominating
  let sampledItems: SourceItem[] = [];

  // Sort by published date (most recent first)
  const sortedItems = [...items].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

  // Group by source and apply per-source limits
  const itemsBySource = new Map<string, SourceItem[]>();
  for (const item of sortedItems) {
    const sourceItems = itemsBySource.get(item.sourceName) || [];

    // Only add if we haven't hit the per-source limit
    if (sourceItems.length < MAX_ITEMS_PER_SOURCE) {
      sourceItems.push(item);
      itemsBySource.set(item.sourceName, sourceItems);
    }
  }

  // Flatten back to array (still sorted by recency within each source)
  for (const sourceItems of itemsBySource.values()) {
    sampledItems.push(...sourceItems);
  }

  // If still too many items, take the most recent ones
  if (sampledItems.length > MAX_ITEMS) {
    sampledItems = sampledItems
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, MAX_ITEMS);
  }

  let prompt = `---\n## CONTENT FROM LAST 24 HOURS:\n\n`;
  prompt += `Total items: ${items.length} | Analyzed: ${sampledItems.length}\n\n`;

  // Re-group sampled items by category
  const sampledByCategory = new Map<string, SourceItem[]>();
  for (const item of sampledItems) {
    const existing = sampledByCategory.get(item.category) || [];
    existing.push(item);
    sampledByCategory.set(item.category, existing);
  }

  // Add content grouped by category
  for (const [category, categoryItems] of sampledByCategory) {
    prompt += `### ${category}\n\n`;

    for (const item of categoryItems) {
      prompt += `**Source**: ${item.sourceName}\n`;
      prompt += `**Title**: ${item.title}\n`;
      prompt += `**Published**: ${item.publishedAt.toISOString()}\n`;
      if (item.url) {
        prompt += `**URL**: ${item.url}\n`;
      }

      // Truncate content more aggressively
      const maxContentLength = 1000; // Reduced from 2000
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
