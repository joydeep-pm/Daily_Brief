import { LLMProvider } from './types.js';
import { SourceItem } from '../ingestion/types.js';
import { buildSystemPrompt } from './prompt.js';
import { AnthropicProvider } from './providers/anthropic.js';

export class LLMClient {
  private provider: LLMProvider;
  private fallbackProvider?: LLMProvider;

  constructor(provider?: LLMProvider, fallbackProvider?: LLMProvider) {
    this.provider = provider || new AnthropicProvider();
    this.fallbackProvider = fallbackProvider;
  }

  async generateBriefing(items: SourceItem[]): Promise<string> {
    if (items.length === 0) {
      return this.generateEmptyBriefing();
    }

    const systemPrompt = buildSystemPrompt();

    try {
      console.log('🤖 Generating briefing with primary LLM provider...');
      const briefing = await this.provider.synthesize(items, systemPrompt);
      return this.addMetadata(briefing, items);
    } catch (error) {
      console.warn(`Primary LLM provider failed: ${error instanceof Error ? error.message : String(error)}`);

      if (this.fallbackProvider) {
        console.log('🔄 Attempting fallback LLM provider...');
        try {
          const briefing = await this.fallbackProvider.synthesize(items, systemPrompt);
          return this.addMetadata(briefing, items);
        } catch (fallbackError) {
          throw new Error(`Both LLM providers failed. Last error: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
        }
      }

      throw error;
    }
  }

  private generateEmptyBriefing(): string {
    return `# Daily Brief - ${new Date().toISOString().split('T')[0]}

## No New Content

No new content was found from any configured sources in the last 24 hours.

This could mean:
- All sources have been previously processed
- Sources are experiencing technical issues
- No new content was published

Check the error log below for any source failures.`;
  }

  private addMetadata(briefing: string, items: SourceItem[]): string {
    const date = new Date().toISOString().split('T')[0];
    const sourceNames = new Set(items.map(i => i.sourceName));

    const metadata = `
---
**Generated**: ${new Date().toISOString()}
**Sources Processed**: ${sourceNames.size}
**Total Items**: ${items.length}`;

    return `# Daily Brief - ${date}\n\n${briefing}\n${metadata}`;
  }
}
