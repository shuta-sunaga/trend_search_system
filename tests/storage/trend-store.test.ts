import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrendStore } from '../../src/storage/trend-store.js';
import type { TrendItem, AggregatedTrend } from '../../src/types/index.js';

function createItem(overrides: Partial<TrendItem> = {}): TrendItem {
  return {
    id: `item-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Test Trend',
    description: 'A test trend item',
    url: 'https://example.com/article',
    source: 'rss',
    sourceName: 'Test RSS',
    publishedAt: new Date('2025-01-01'),
    collectedAt: new Date(),
    ...overrides,
  };
}

function createAggregated(overrides: Partial<AggregatedTrend> = {}): AggregatedTrend {
  return {
    id: `agg-${Math.random().toString(36).slice(2, 8)}`,
    topic: 'Test Topic',
    summary: 'A test summary',
    sources: [createItem()],
    score: 10,
    category: 'general',
    lastUpdated: new Date(),
    ...overrides,
  };
}

describe('TrendStore', () => {
  let store: TrendStore;

  beforeEach(() => {
    store = new TrendStore(60_000); // 60s TTL for tests
  });

  describe('addItems / getAll', () => {
    it('should store and retrieve items', () => {
      const items = [createItem({ id: '1' }), createItem({ id: '2' })];
      store.addItems(items);
      expect(store.getAll()).toHaveLength(2);
    });

    it('should overwrite items with the same id', () => {
      store.addItems([createItem({ id: '1', title: 'Original' })]);
      store.addItems([createItem({ id: '1', title: 'Updated' })]);
      const all = store.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].title).toBe('Updated');
    });

    it('should return empty array when no items', () => {
      expect(store.getAll()).toEqual([]);
    });
  });

  describe('getBySource', () => {
    it('should filter items by source type', () => {
      store.addItems([
        createItem({ id: '1', source: 'rss' }),
        createItem({ id: '2', source: 'twitter' }),
        createItem({ id: '3', source: 'rss' }),
      ]);
      expect(store.getBySource('rss')).toHaveLength(2);
      expect(store.getBySource('twitter')).toHaveLength(1);
      expect(store.getBySource('newsapi')).toHaveLength(0);
    });
  });

  describe('getItem', () => {
    it('should return a single item by ID', () => {
      store.addItems([createItem({ id: 'target', title: 'Target' })]);
      const item = store.getItem('target');
      expect(item).toBeDefined();
      expect(item!.title).toBe('Target');
    });

    it('should return undefined for non-existent ID', () => {
      expect(store.getItem('nope')).toBeUndefined();
    });
  });

  describe('TTL expiry', () => {
    it('should evict expired items from getAll', () => {
      const shortStore = new TrendStore(100); // 100ms TTL
      shortStore.addItems([createItem({ id: '1' })]);
      expect(shortStore.getAll()).toHaveLength(1);

      vi.useFakeTimers();
      vi.advanceTimersByTime(200);
      expect(shortStore.getAll()).toHaveLength(0);
      vi.useRealTimers();
    });

    it('should evict expired items from getItem', () => {
      const shortStore = new TrendStore(100);
      shortStore.addItems([createItem({ id: '1' })]);

      vi.useFakeTimers();
      vi.advanceTimersByTime(200);
      expect(shortStore.getItem('1')).toBeUndefined();
      vi.useRealTimers();
    });
  });

  describe('aggregated trends', () => {
    it('should set and get aggregated trends', () => {
      const trends = [createAggregated({ id: 'a1' }), createAggregated({ id: 'a2' })];
      store.setAggregated(trends);
      expect(store.getAggregated()).toHaveLength(2);
    });

    it('should replace previous aggregated on setAggregated', () => {
      store.setAggregated([createAggregated({ id: 'a1' })]);
      store.setAggregated([createAggregated({ id: 'a2' }), createAggregated({ id: 'a3' })]);
      const result = store.getAggregated();
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id).sort()).toEqual(['a2', 'a3']);
    });

    it('should get a single aggregated trend by ID', () => {
      store.setAggregated([createAggregated({ id: 'a1', topic: 'AI Trends' })]);
      const trend = store.getAggregatedById('a1');
      expect(trend).toBeDefined();
      expect(trend!.topic).toBe('AI Trends');
    });

    it('should return undefined for non-existent aggregated ID', () => {
      expect(store.getAggregatedById('nope')).toBeUndefined();
    });

    it('should evict expired aggregated trends', () => {
      const shortStore = new TrendStore(100);
      shortStore.setAggregated([createAggregated({ id: 'a1' })]);
      expect(shortStore.getAggregated()).toHaveLength(1);

      vi.useFakeTimers();
      vi.advanceTimersByTime(200);
      expect(shortStore.getAggregated()).toHaveLength(0);
      expect(shortStore.getAggregatedById('a1')).toBeUndefined();
      vi.useRealTimers();
    });
  });

  describe('itemCount / aggregatedCount', () => {
    it('should return correct counts', () => {
      expect(store.itemCount).toBe(0);
      expect(store.aggregatedCount).toBe(0);

      store.addItems([createItem({ id: '1' }), createItem({ id: '2' })]);
      store.setAggregated([createAggregated({ id: 'a1' })]);

      expect(store.itemCount).toBe(2);
      expect(store.aggregatedCount).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all data', () => {
      store.addItems([createItem({ id: '1' })]);
      store.setAggregated([createAggregated({ id: 'a1' })]);
      store.clear();
      expect(store.getAll()).toEqual([]);
      expect(store.getAggregated()).toEqual([]);
      expect(store.itemCount).toBe(0);
    });
  });
});
