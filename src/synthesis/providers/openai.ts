import OpenAI from 'openai';
import { LLMProvider, SynthesisConfig } from '../types.js';
import { SourceItem } from '../../ingestion/types.js';
import { buildContentPrompt } from '../prompt.js';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private config: SynthesisConfig;

  constructor(config?: SynthesisConfig) {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.config = {
      maxTokens: config?.maxTokens || 4096,
      temperature: config?.temperature || 0.7
    };
  }

  async synthesize(items: SourceItem[], systemPrompt: string): Promise<string> {
    const contentPrompt = buildContentPrompt(items);

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: contentPrompt
          }
        ]
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content returned from OpenAI');
      }

      return content;
    } catch (error) {
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
