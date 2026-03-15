import { SourceItem } from '../ingestion/types.js';

export interface LLMProvider {
  synthesize(items: SourceItem[], systemPrompt: string): Promise<string>;
}

export interface SynthesisConfig {
  maxTokens?: number;
  temperature?: number;
}
