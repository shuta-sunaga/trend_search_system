import { describe, it, expect } from 'vitest';
import { deduplicateItems, titleSimilarity } from '../../src/aggregator/deduplicator.js';
import type { TrendItem } from '../../src/types/index.js';

function item(overrides: Partial<TrendItem>): TrendItem {
  return {
    id: 'id-' + Math.random().toString(36).slice(2, 6),
    title: 'Default Title',
    description: 'Default description',
    url: 'https://example.com/default',
    source: 'rss',
    sourceName: 'Test',
    publishedAt: new Date(),
    collectedAt: new Date(),
    ...overrides,
  };
}

describe('titleSimilarity', () => {
  it('should return 1 for identical titles', () => {
    expect(titleSimilarity('Hello World', 'Hello World')).toBe(1);
  });

  it('should return 0 for completely different titles', () => {
    expect(titleSimilarity('Apple releases iPhone', 'Japan wins baseball')).toBe(0);
  });

  it('should detect similar titles', () => {
    const sim = titleSimilarity(
      'Google announces new AI model',
      'Google reveals new AI model today'
    );
    expect(sim).toBeGreaterThan(0.5);
  });

  it('should be case insensitive', () => {
    expect(titleSimilarity('HELLO WORLD', 'hello world')).toBe(1);
  });

  it('should handle empty strings', () => {
    expect(titleSimilarity('', '')).toBe(1);
    expect(titleSimilarity('hello', '')).toBe(0);
  });
});

describe('deduplicateItems', () => {
  it('should remove items with the same URL', () => {
    const items = [
      item({ id: '1', url: 'https://example.com/article', description: 'Short' }),
      item({ id: '2', url: 'https://example.com/article', description: 'Longer description here' }),
    ];
    const result = deduplicateItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Longer description here');
  });

  it('should normalize URLs (remove UTM params)', () => {
    const items = [
      item({ id: '1', url: 'https://example.com/article?utm_source=twitter' }),
      item({ id: '2', url: 'https://example.com/article' }),
    ];
    const result = deduplicateItems(items);
    expect(result).toHaveLength(1);
  });

  it('should deduplicate by similar titles', () => {
    const items = [
      item({ id: '1', title: 'Google announces new AI model', url: 'https://a.com/1' }),
      item({ id: '2', title: 'Google announces new AI model today', url: 'https://b.com/2' }),
    ];
    const result = deduplicateItems(items);
    expect(result).toHaveLength(1);
  });

  it('should keep items with different titles', () => {
    const items = [
      item({ id: '1', title: 'Apple releases iPhone', url: 'https://a.com/1' }),
      item({ id: '2', title: 'Japan earthquake update', url: 'https://b.com/2' }),
    ];
    const result = deduplicateItems(items);
    expect(result).toHaveLength(2);
  });

  it('should return empty array for empty input', () => {
    expect(deduplicateItems([])).toEqual([]);
  });
});
