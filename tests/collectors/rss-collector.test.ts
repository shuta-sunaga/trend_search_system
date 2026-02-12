import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RssCollector } from '../../src/collectors/rss-collector.js';

// Mock rss-parser
vi.mock('rss-parser', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      parseURL: vi.fn(),
    })),
  };
});

import Parser from 'rss-parser';

describe('RssCollector', () => {
  let collector: RssCollector;
  let mockParseURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    collector = new RssCollector(['https://example.com/rss']);
    // Access the mocked parseURL
    mockParseURL = (Parser as unknown as ReturnType<typeof vi.fn>).mock.results[0].value.parseURL;
  });

  it('should have correct name and source', () => {
    expect(collector.name).toBe('RSS Feed Collector');
    expect(collector.source).toBe('rss');
  });

  it('should collect items from RSS feed', async () => {
    mockParseURL.mockResolvedValueOnce({
      title: 'Test Feed',
      items: [
        {
          title: 'Article 1',
          contentSnippet: 'Description 1',
          link: 'https://example.com/1',
          pubDate: '2025-01-01T00:00:00Z',
          categories: ['tech'],
        },
        {
          title: 'Article 2',
          contentSnippet: 'Description 2',
          link: 'https://example.com/2',
          pubDate: '2025-01-02T00:00:00Z',
        },
      ],
    });

    const result = await collector.collect();
    expect(result.success).toBe(true);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].title).toBe('Article 1');
    expect(result.items[0].source).toBe('rss');
    expect(result.items[0].sourceName).toBe('Test Feed');
    expect(result.items[1].title).toBe('Article 2');
  });

  it('should handle feed with missing fields gracefully', async () => {
    mockParseURL.mockResolvedValueOnce({
      items: [
        { title: undefined, link: undefined, pubDate: undefined },
      ],
    });

    const result = await collector.collect();
    expect(result.success).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Untitled');
  });

  it('should handle feed parsing errors', async () => {
    mockParseURL.mockRejectedValueOnce(new Error('Network error'));

    const result = await collector.collect();
    expect(result.success).toBe(false);
    expect(result.items).toHaveLength(0);
    expect(result.error).toContain('Network error');
  });

  it('should succeed if at least one feed works in multi-feed setup', async () => {
    const multiCollector = new RssCollector([
      'https://example.com/rss1',
      'https://example.com/rss2',
    ]);
    const mock = (Parser as unknown as ReturnType<typeof vi.fn>).mock.results[1].value.parseURL;

    mock
      .mockResolvedValueOnce({
        title: 'Feed 1',
        items: [{ title: 'Article', link: 'https://example.com/1', contentSnippet: 'Desc' }],
      })
      .mockRejectedValueOnce(new Error('Feed 2 failed'));

    const result = await multiCollector.collect();
    expect(result.success).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.error).toContain('Feed 2 failed');
  });

  it('should return empty items when no feed URLs configured', async () => {
    const emptyCollector = new RssCollector([]);
    const result = await emptyCollector.collect();
    expect(result.success).toBe(true);
    expect(result.items).toEqual([]);
  });

  it('should return duration in result', async () => {
    mockParseURL.mockResolvedValueOnce({ items: [] });
    const result = await collector.collect();
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  describe('healthCheck', () => {
    it('should return true when feed is accessible', async () => {
      mockParseURL.mockResolvedValueOnce({ items: [] });
      expect(await collector.healthCheck()).toBe(true);
    });

    it('should return false when feed fails', async () => {
      mockParseURL.mockRejectedValueOnce(new Error('fail'));
      expect(await collector.healthCheck()).toBe(false);
    });

    it('should return false when no URLs configured', async () => {
      const emptyCollector = new RssCollector([]);
      expect(await emptyCollector.healthCheck()).toBe(false);
    });
  });
});
