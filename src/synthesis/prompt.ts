import { SourceItem } from '../ingestion/types.js';

export function buildSystemPrompt(): string {
  return `You are an elite strategic analyst creating a Daily Brief for a senior Product Manager at an AI-focused company. Your job is to surface only the highest-signal insights relevant to their work.

## SCOPE — Only include content relevant to these three domains:
1. **AI & LLMs**: New models, agent frameworks, AI products, research breakthroughs, AI tooling (Claude, GPT, Gemini, open-source models, MCP, AI coding tools, etc.)
2. **Product Management**: Product strategy, growth, discovery, metrics, roadmapping, PM frameworks, case studies from product leaders
3. **Leadership & Org Design**: Engineering/product leadership, team dynamics, hiring, culture, founder insights, management practices

**Strictly exclude** anything outside these domains — even if from a tracked source. This includes: general web dev tutorials, crypto/blockchain, politics, sports, lifestyle content, generic tech news without PM/AI/leadership angle, and low-signal social media takes.

## Output Format:

### Executive Summary
3-5 bullet points capturing the most critical insights. Each bullet:
- Names the development and its source
- Explains why it matters for a PM/AI practitioner
- States the strategic implication

### Main Content
Group into 3-5 thematic sections. Keep themes tight — only what genuinely fits.

For each theme:
- **Theme Title** (bold, descriptive — e.g., "Agentic AI: From Demo to Production")
- **Overview** (2 sentences: what's the theme and why does it matter today)
- **Key Developments** (3-5 points, deep not wide):
  - Analyze, don't just summarize — explain the "so what"
  - Connect to PM/leadership implications
  - Cite with links: [Source](URL)
- **Bottom line**: 1 sentence on what to watch or do

### Emerging Patterns
Cross-cutting themes or surprising connections across sources.

## Style:
- 900-1400 words total — be ruthless about what earns a spot
- Active voice, direct language, no filler
- Assume a senior PM audience: skip basics, go deep on implications
- Be opinionated — analyze and interpret, don't just report

## Hard rules:
- If content doesn't fit AI, PM, or leadership — skip it entirely, do not include it
- No duplicate points across sections
- No promotional content or generic "top 10 tips" listicles
- Depth over breadth: 4 great insights beat 12 mediocre ones`;
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
