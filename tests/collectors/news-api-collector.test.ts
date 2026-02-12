import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NewsApiCollector } from '../../src/collectors/news-api-collector.js';

describe('NewsApiCollector', () => {
  let collector: NewsApiCollector;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    collector = new NewsApiCollector('test-api-key', { country: 'jp', pageSize: 10 });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockFetch(data: unknown, status = 200) {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: () => Promise.resolve(data),
    }) as unknown as typeof fetch;
  }

  it('should have correct name and source', () => {
    expect(collector.name).toBe('News API Collector');
    expect(collector.source).toBe('newsapi');
  });

  it('should collect articles from NewsAPI', async () => {
    mockFetch({
      status: 'ok',
      totalResults: 2,
      articles: [
        {
          source: { id: null, name: 'TechCrunch' },
          author: 'John',
          title: 'AI Breakthrough',
          description: 'New AI model released',
          url: 'https://techcrunch.com/ai',
          urlToImage: 'https://img.com/1.jpg',
          publishedAt: '2025-01-01T00:00:00Z',
          content: 'Full content here',
        },
        {
          source: { id: null, name: 'Reuters' },
          author: null,
          title: 'Market Update',
          description: 'Markets rose today',
          url: 'https://reuters.com/market',
          urlToImage: null,
          publishedAt: '2025-01-02T00:00:00Z',
          content: null,
        },
      ],
    });

    const result = await collector.collect();
    expect(result.success).toBe(true);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].title).toBe('AI Breakthrough');
    expect(result.items[0].source).toBe('newsapi');
    expect(result.items[0].sourceName).toBe('TechCrunch');
    expect(result.items[1].title).toBe('Market Update');
  });

  it('should handle rate limit (429) errors', async () => {
    mockFetch({}, 429);

    const result = await collector.collect();
    expect(result.success).toBe(false);
    expect(result.error).toContain('rate limit');
  });

  it('should handle server errors', async () => {
    mockFetch({}, 500);

    const result = await collector.collect();
    expect(result.success).toBe(false);
    expect(result.error).toContain('500');
  });

  it('should handle non-ok API status in response body', async () => {
    mockFetch({ status: 'error', code: 'apiKeyInvalid', message: 'Invalid API key' });

    const result = await collector.collect();
    expect(result.success).toBe(false);
    expect(result.error).toContain('error');
  });

  it('should handle network errors', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failed')) as unknown as typeof fetch;

    const result = await collector.collect();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Network failed');
  });

  it('should include duration in result', async () => {
    mockFetch({ status: 'ok', totalResults: 0, articles: [] });

    const result = await collector.collect();
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should use correct URL parameters', async () => {
    mockFetch({ status: 'ok', totalResults: 0, articles: [] });

    await collector.collect();
    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('country=jp');
    expect(calledUrl).toContain('pageSize=10');
    expect(calledUrl).toContain('apiKey=test-api-key');
  });

  describe('healthCheck', () => {
    it('should return true when API is accessible', async () => {
      mockFetch({ status: 'ok' });
      expect(await collector.healthCheck()).toBe(true);
    });

    it('should return false when API is not accessible', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail')) as unknown as typeof fetch;
      expect(await collector.healthCheck()).toBe(false);
    });
  });
});
