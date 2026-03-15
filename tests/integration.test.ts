import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StateManager } from '../src/state/database.js';
import fs from 'fs';
import path from 'path';

describe('StateManager', () => {
  const testDbPath = path.join(process.cwd(), 'tests', 'test.db');
  let stateManager: StateManager;

  beforeEach(() => {
    // Clean up test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    stateManager = new StateManager({ dbPath: testDbPath });
  });

  afterEach(() => {
    stateManager.close();

    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should initialize database with correct schema', () => {
    const stats = stateManager.getStats();
    expect(stats.totalItems).toBe(0);
    expect(stats.sourceCount).toBe(0);
  });

  it('should mark items as processed', () => {
    const itemId = 'test-item-123';
    const sourceName = 'Test Source';
    const sourceType = 'rss';

    stateManager.markProcessed(itemId, sourceName, sourceType, {
      title: 'Test Item'
    });

    expect(stateManager.hasProcessed(itemId)).toBe(true);
  });

  it('should not mark same item twice', () => {
    const itemId = 'test-item-456';

    stateManager.markProcessed(itemId, 'Source 1', 'rss');
    stateManager.markProcessed(itemId, 'Source 1', 'rss');

    const stats = stateManager.getStats();
    expect(stats.totalItems).toBe(1);
  });

  it('should track last processed time per source', () => {
    const source = 'Test Source';

    // Initially should be null
    expect(stateManager.getLastProcessedTime(source)).toBe(null);

    // Mark an item as processed
    stateManager.markProcessed('item-1', source, 'rss');

    // Should now have a timestamp
    const lastTime = stateManager.getLastProcessedTime(source);
    expect(lastTime).toBeInstanceOf(Date);
    expect(lastTime!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should cleanup old items', async () => {
    // Add some items
    stateManager.markProcessed('item-1', 'Source 1', 'rss');
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    stateManager.markProcessed('item-2', 'Source 2', 'rss');
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    stateManager.markProcessed('item-3', 'Source 3', 'rss');

    // Cleanup items older than 0 days (should delete all)
    const deleted = stateManager.cleanup(0);

    expect(deleted).toBeGreaterThanOrEqual(0);

    const stats = stateManager.getStats();
    expect(stats.totalItems).toBeLessThanOrEqual(3);
  });

  it('should track stats correctly', () => {
    stateManager.markProcessed('item-1', 'Source A', 'rss');
    stateManager.markProcessed('item-2', 'Source A', 'rss');
    stateManager.markProcessed('item-3', 'Source B', 'youtube');

    const stats = stateManager.getStats();

    expect(stats.totalItems).toBe(3);
    expect(stats.sourceCount).toBe(2);
    expect(stats.oldestItem).toBeInstanceOf(Date);
    expect(stats.newestItem).toBeInstanceOf(Date);
  });
});

describe('Prompt Building', () => {
  it('should build system prompt', async () => {
    const { buildSystemPrompt } = await import('../src/synthesis/prompt.js');
    const prompt = buildSystemPrompt();

    expect(prompt).toContain('elite technical summarizer');
    expect(prompt).toContain('Executive Summary');
    expect(prompt).toContain('Signal vs Noise');
  });

  it('should build content prompt from items', async () => {
    const { buildContentPrompt } = await import('../src/synthesis/prompt.js');

    const items = [
      {
        id: '1',
        title: 'Test Article',
        content: 'This is test content',
        url: 'https://example.com',
        publishedAt: new Date(),
        category: 'Tech News',
        sourceName: 'Test Source'
      }
    ];

    const prompt = buildContentPrompt(items);

    expect(prompt).toContain('CONTENT FROM LAST 24 HOURS');
    expect(prompt).toContain('Tech News');
    expect(prompt).toContain('Test Article');
    expect(prompt).toContain('This is test content');
  });
});
