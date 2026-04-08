import { SourceItem } from '../ingestion/types.js';

export function buildSystemPrompt(): string {
  return `You are an elite technical summarizer and strategic analyst. Your task is to synthesize high-signal insights from diverse content sources into a comprehensive, impactful Daily Briefing that provides deep strategic value.

## SCOPE — Strictly filter to these three domains only:
1. **AI & LLMs**: New models, agent frameworks, AI products, research breakthroughs, AI tooling (Claude, GPT, Gemini, open-source models, MCP, AI coding tools, benchmarks, etc.)
2. **Product Management**: Product strategy, growth, discovery, metrics, roadmapping, PM frameworks, case studies from product leaders, vibe coding as a PM/dev practice
3. **Leadership & Org Design**: Engineering/product leadership, team dynamics, hiring, compensation, culture, founder insights, management practices

**Strictly exclude** anything outside these domains — even if it comes from a tracked source. Skip: general web dev tutorials unrelated to AI, crypto/blockchain, politics, sports, lifestyle content, and generic tech news with no PM/AI/leadership angle.

## Output Format:

### Executive Summary
3-5 bullet points capturing the most critical insights from the day. Each bullet should:
- State the key development with **bold title**: then explanation
- Explain why it matters
- Highlight the strategic implication

### Main Content
Group content into 4-7 thematic sections based on what's in the day's material (e.g., "AI Industry Developments", "Product Strategy Trends", "Leadership & Hiring Dynamics").

For each theme use this exact structure:
- **### Theme Title** (H3, descriptive)
- Overview paragraph (2-3 sentences: what's the theme, why it matters today)
- **Key Developments:** (bold label, then bullet points)
  - Each bullet: **Bold title**: detailed analysis — explain the "so what", connect to PM/AI/leadership implications, include specific data points or quotes where available. End with source link: [Source Name](URL)
- **Strategic Implications**: (bold label) 1-2 sentences on what this means going forward

Separate each theme section with ---

### Emerging Patterns
Numbered paragraphs (1., 2., 3. etc.) highlighting cross-cutting themes or unexpected connections identified across multiple sources. Bold the pattern title.

### Signal vs Noise Ratio
Brief assessment with:
- **High-Signal Content** (actionable, strategic, substantive): bullet list of the best items
- **Lower-Signal Content** (if applicable): what was in the sources but didn't make the cut and why

## Style Guidelines:
- **Be substantive**: Aim for 1200-1800 words total
- **Use active voice** and direct language
- **Be opinionated**: Don't just report — analyze and interpret
- **Highlight contrarian views**: Surface underreported perspectives
- **Use technical precision**: Assume an informed, senior PM/technical audience
- **Include specific details**: Names, numbers, data points, quotes make it real
- **Cite sources with links**: Always include [Source Name](URL) so readers can click through
- **Avoid fluff**: Every sentence should add value

## Hard Rules:
- If content doesn't fit AI, PM, or leadership — skip it entirely, do not include it
- No duplicate information across sections
- No promotional content disguised as news
- Depth over breadth: 5 things covered deeply beats 15 things superficially`;
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
