export interface ProcessedItem {
  id: string;
  source_name: string;
  source_type: string;
  processed_at: number;
  item_data: string; // JSON blob
}

export interface StateManagerConfig {
  dbPath: string;
}
