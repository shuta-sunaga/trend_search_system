import { describe, it, expect, vi, afterEach } from 'vitest';
import { WebScrapingCollector, type ScrapingTarget } from '../../src/collectors/web-scraping-collector.js';

const sampleHtml = `
<html>
<body>
  <div class="article">
    <h2 class="title"><a href="https://example.com/1">Article One</a></h2>
    <p class="summary">Summary of article one</p>
    <span class="date">2025-01-15</span>
  </div>
  <div class="article">
    <h2 class="title"><a href="/relative/link">Article Two</a></h2>
    <p class="summary">Summary of article two</p>
  </div>
  <div class="article">
    <h2 class="title"><a href="https://example.com/3"></a></h2>
  </div>
</body>
</html>`;

const target: ScrapingTarget = {
  url: 'https://example.com/news',
  name: 'Example News',
  selectors: {
    articleContainer: '.article',
    title: '.title',
    link: '.title a',
    summary: '.summary',
    date: '.date',
  },
};

describe('WebScrapingCollector', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockFetchHtml(html: string, status = 200) {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      text: () => Promise.resolve(html),
    }) as unknown as typeof fetch;
  }

  it('should have correct name and source', () => {
    const collector = new WebScrapingCollector([target], { delayMs: 0 });
    expect(collector.name).toBe('Web Scraping Collector');
    expect(collector.source).toBe('web-scraping');
  });

  it('should scrape articles from HTML', async () => {
    mockFetchHtml(sampleHtml);
    const collector = new WebScrapingCollector([target], { delayMs: 0 });

    const result = await collector.collect();
    expect(result.success).toBe(true);
    // 3rd article has empty title text, so only 2 articles
    expect(result.items).toHaveLength(2);
    expect(result.items[0].title).toBe('Article One');
    expect(result.items[0].description).toBe('Summary of article one');
    expect(result.items[0].url).toBe('https://example.com/1');
    expect(result.items[0].sourceName).toBe('Example News');
  });

  it('should resolve relative URLs', async () => {
    mockFetchHtml(sampleHtml);
    const collector = new WebScrapingCollector([target], { delayMs: 0 });

    const result = await collector.collect();
    expect(result.items[1].url).toBe('https://example.com/relative/link');
  });

  it('should handle missing date gracefully', async () => {
    mockFetchHtml(sampleHtml);
    const collector = new WebScrapingCollector([target], { delayMs: 0 });

    const result = await collector.collect();
    // Second article has no date - should use current time
    expect(result.items[1].publishedAt).toBeInstanceOf(Date);
    expect(result.items[1].publishedAt.getTime()).not.toBeNaN();
  });

  it('should handle HTTP errors', async () => {
    mockFetchHtml('', 500);
    const collector = new WebScrapingCollector([target], { delayMs: 0 });

    const result = await collector.collect();
    expect(result.success).toBe(false);
    expect(result.error).toContain('500');
  });

  it('should handle network errors', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused')) as unknown as typeof fetch;
    const collector = new WebScrapingCollector([target], { delayMs: 0 });

    const result = await collector.collect();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Connection refused');
  });

  it('should return empty items when no targets configured', async () => {
    const collector = new WebScrapingCollector([]);
    const result = await collector.collect();
    expect(result.success).toBe(true);
    expect(result.items).toEqual([]);
  });

  it('should handle malformed HTML without crashing', async () => {
    mockFetchHtml('<div><p>Not valid structure</div></p><unclosed');
    const collector = new WebScrapingCollector([target], { delayMs: 0 });

    const result = await collector.collect();
    expect(result.success).toBe(true);
    expect(result.items).toHaveLength(0);
  });

  it('should succeed if at least one target works', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true, status: 200, statusText: 'OK',
          text: () => Promise.resolve(sampleHtml),
        });
      }
      return Promise.reject(new Error('Target 2 failed'));
    }) as unknown as typeof fetch;

    const target2: ScrapingTarget = { ...target, url: 'https://other.com', name: 'Other' };
    const collector = new WebScrapingCollector([target, target2], { delayMs: 0 });

    const result = await collector.collect();
    expect(result.success).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.error).toContain('Target 2 failed');
  });

  describe('healthCheck', () => {
    it('should return true when target is accessible', async () => {
      mockFetchHtml('<html></html>');
      const collector = new WebScrapingCollector([target]);
      expect(await collector.healthCheck()).toBe(true);
    });

    it('should return false when target is not accessible', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail')) as unknown as typeof fetch;
      const collector = new WebScrapingCollector([target]);
      expect(await collector.healthCheck()).toBe(false);
    });

    it('should return false when no targets configured', async () => {
      const collector = new WebScrapingCollector([]);
      expect(await collector.healthCheck()).toBe(false);
    });
  });
});
