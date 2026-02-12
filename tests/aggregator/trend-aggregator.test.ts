import { describe, it, expect } from 'vitest';
import { TrendAggregator } from '../../src/aggregator/trend-aggregator.js';
import type { TrendItem } from '../../src/types/index.js';

function item(overrides: Partial<TrendItem>): TrendItem {
  return {
    id: 'id-' + Math.random().toString(36).slice(2, 6),
    title: 'Default Title',
    description: 'Default description',
    url: 'https://example.com/' + Math.random().toString(36).slice(2, 6),
    source: 'rss',
    sourceName: 'Test',
    publishedAt: new Date(),
    collectedAt: new Date(),
    ...overrides,
  };
}

describe('TrendAggregator', () => {
  const aggregator = new TrendAggregator();

  it('should return empty array for empty input', () => {
    expect(aggregator.aggregate([])).toEqual([]);
  });

  it('should aggregate items into trends', () => {
    const items = [
      item({ title: 'AI model released by Google', source: 'rss' }),
      item({ title: 'Apple announces new iPhone', source: 'newsapi' }),
      item({ title: 'Japan earthquake warning', source: 'twitter' }),
    ];

    const result = aggregator.aggregate(items);
    expect(result.length).toBeGreaterThan(0);
    // Each trend should have required fields
    for (const trend of result) {
      expect(trend.id).toBeDefined();
      expect(trend.topic).toBeDefined();
      expect(trend.summary).toBeDefined();
      expect(trend.sources.length).toBeGreaterThan(0);
      expect(typeof trend.score).toBe('number');
      expect(trend.category).toBeDefined();
      expect(trend.lastUpdated).toBeInstanceOf(Date);
    }
  });

  it('should rank trends by score (higher source count = higher score)', () => {
    const items = [
      // This topic appears from 3 different sources
      item({ title: 'Major earthquake strikes', source: 'rss', url: 'https://a.com/eq1' }),
      item({ title: 'Major earthquake strikes region', source: 'newsapi', url: 'https://b.com/eq2' }),
      item({ title: 'Major earthquake strikes today', source: 'twitter', url: 'https://c.com/eq3' }),
      // This topic appears from 1 source
      item({ title: 'Local bakery opens downtown', source: 'rss', url: 'https://d.com/bak1' }),
    ];

    const result = aggregator.aggregate(items);
    expect(result.length).toBeGreaterThanOrEqual(1);
    // First result should have higher score
    if (result.length >= 2) {
      expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    }
  });

  it('should deduplicate items with same URL', () => {
    const items = [
      item({ title: 'Same Article', url: 'https://example.com/same', description: 'Short' }),
      item({ title: 'Same Article', url: 'https://example.com/same', description: 'Longer description' }),
    ];

    const result = aggregator.aggregate(items);
    expect(result).toHaveLength(1);
    expect(result[0].sources).toHaveLength(1);
  });

  it('should detect technology category', () => {
    const items = [
      item({ title: 'Google AI breakthrough in machine learning' }),
    ];

    const result = aggregator.aggregate(items);
    expect(result[0].category).toBe('technology');
  });

  it('should detect sports category', () => {
    const items = [
      item({ title: 'Japan wins baseball championship match' }),
    ];

    const result = aggregator.aggregate(items);
    expect(result[0].category).toBe('sports');
  });

  it('should assign general category when no keywords match', () => {
    const items = [
      item({ title: 'Random unique unrelated topic xyz' }),
    ];

    const result = aggregator.aggregate(items);
    expect(result[0].category).toBe('general');
  });

  it('should generate summaries for trends', () => {
    const items = [
      item({
        title: 'Tech News Update',
        description: 'A detailed description of the latest tech developments in the industry',
      }),
    ];

    const result = aggregator.aggregate(items);
    expect(result[0].summary.length).toBeGreaterThan(0);
  });

  it('should truncate very long summaries', () => {
    const longDesc = 'A'.repeat(500);
    const items = [item({ title: 'Test', description: longDesc })];

    const result = aggregator.aggregate(items);
    expect(result[0].summary.length).toBeLessThanOrEqual(303); // 300 + '...'
  });
});
