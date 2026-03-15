import Database from 'better-sqlite3';
import { StateManagerConfig } from './types.js';
import path from 'path';
import fs from 'fs';

export class StateManager {
  private db: Database.Database;
  private dbPath: string;

  constructor(config?: StateManagerConfig) {
    this.dbPath = config?.dbPath || path.join(process.cwd(), 'data', 'state.db');

    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.initDatabase();
  }

  initDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS processed_items (
        id TEXT PRIMARY KEY,
        source_name TEXT NOT NULL,
        source_type TEXT NOT NULL,
        processed_at INTEGER NOT NULL,
        item_data TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_source_name ON processed_items(source_name);
      CREATE INDEX IF NOT EXISTS idx_processed_at ON processed_items(processed_at);
    `);
  }

  hasProcessed(id: string): boolean {
    const stmt = this.db.prepare('SELECT id FROM processed_items WHERE id = ?');
    const result = stmt.get(id);
    return result !== undefined;
  }

  markProcessed(
    id: string,
    sourceName: string,
    sourceType: string,
    itemData?: Record<string, unknown>
  ): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO processed_items (id, source_name, source_type, processed_at, item_data)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      sourceName,
      sourceType,
      Date.now(),
      itemData ? JSON.stringify(itemData) : null
    );
  }

  getLastProcessedTime(sourceName: string): Date | null {
    const stmt = this.db.prepare(`
      SELECT MAX(processed_at) as last_time
      FROM processed_items
      WHERE source_name = ?
    `);

    const result = stmt.get(sourceName) as { last_time: number | null } | undefined;

    if (result?.last_time) {
      return new Date(result.last_time);
    }

    return null;
  }

  cleanup(olderThanDays: number): number {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const stmt = this.db.prepare('DELETE FROM processed_items WHERE processed_at < ?');
    const result = stmt.run(cutoffTime);
    return result.changes;
  }

  getStats(): { totalItems: number; sourceCount: number; oldestItem: Date | null; newestItem: Date | null } {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM processed_items');
    const sourceStmt = this.db.prepare('SELECT COUNT(DISTINCT source_name) as count FROM processed_items');
    const oldestStmt = this.db.prepare('SELECT MIN(processed_at) as oldest FROM processed_items');
    const newestStmt = this.db.prepare('SELECT MAX(processed_at) as newest FROM processed_items');

    const total = (totalStmt.get() as { count: number }).count;
    const sources = (sourceStmt.get() as { count: number }).count;
    const oldest = (oldestStmt.get() as { oldest: number | null }).oldest;
    const newest = (newestStmt.get() as { newest: number | null }).newest;

    return {
      totalItems: total,
      sourceCount: sources,
      oldestItem: oldest ? new Date(oldest) : null,
      newestItem: newest ? new Date(newest) : null
    };
  }

  close(): void {
    this.db.close();
  }
}
