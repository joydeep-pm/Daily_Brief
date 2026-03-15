import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, SynthesisConfig } from '../types.js';
import { SourceItem } from '../../ingestion/types.js';
import { buildContentPrompt } from '../prompt.js';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private config: SynthesisConfig;

  constructor(config?: SynthesisConfig) {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    this.config = {
      maxTokens: config?.maxTokens ?? 4096,
      temperature: config?.temperature ?? 0.7
    };
  }

  async synthesize(items: SourceItem[], systemPrompt: string): Promise<string> {
    const contentPrompt = buildContentPrompt(items);

    try {
      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5-20250929',
        max_tokens: this.config.maxTokens!,
        temperature: this.config.temperature!,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: contentPrompt
          }
        ]
      });

      const content = response.content[0];

      if (content.type === 'text') {
        return content.text;
      }

      throw new Error('Unexpected response type from Claude');
    } catch (error) {
      throw new Error(`Anthropic API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
