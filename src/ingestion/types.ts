export interface SourceItem {
  id: string;
  title: string;
  content: string;
  url?: string;
  publishedAt: Date;
  category: string;
  sourceName: string;
}

export interface SourceConfig {
  name: string;
  category: string;
  type: 'rss' | 'youtube' | 'gmail_extraction' | 'x_scraper';
  enabled: boolean;
  // RSS specific
  url?: string;
  // YouTube specific
  channelId?: string;
  // Gmail specific
  query?: string;
  // Twitter/X specific
  username?: string;
}

export interface SourceHandler {
  fetch(source: SourceConfig, lastProcessedTime?: Date): Promise<SourceItem[]>;
}

export interface SourceError {
  sourceName: string;
  sourceType: string;
  error: string;
  timestamp: Date;
}

export interface FetchResult {
  items: SourceItem[];
  errors: SourceError[];
}
