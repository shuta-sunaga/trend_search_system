import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const configSchema = z.object({
  port: z.coerce.number().int().positive().default(3000),
  updateIntervalMs: z.coerce.number().int().positive().default(3_600_000),
  newsApiKey: z.string().optional(),
  twitterBearerToken: z.string().optional(),
  rssFeedUrls: z
    .string()
    .optional()
    .transform((val) =>
      val ? val.split(',').map((url) => url.trim()).filter(Boolean) : []
    ),
  anthropicApiKey: z.string().optional(),
  storageTtlMs: z.coerce.number().int().positive().default(86_400_000),
});

describe('Config', () => {
  it('should apply default values when env vars are not set', () => {
    const result = configSchema.parse({});
    expect(result.port).toBe(3000);
    expect(result.updateIntervalMs).toBe(3_600_000);
    expect(result.storageTtlMs).toBe(86_400_000);
    expect(result.rssFeedUrls).toEqual([]);
  });

  it('should parse provided values', () => {
    const result = configSchema.parse({
      port: '8080',
      updateIntervalMs: '60000',
      newsApiKey: 'test-key',
      rssFeedUrls: 'https://a.com/rss, https://b.com/rss',
    });
    expect(result.port).toBe(8080);
    expect(result.updateIntervalMs).toBe(60000);
    expect(result.newsApiKey).toBe('test-key');
    expect(result.rssFeedUrls).toEqual(['https://a.com/rss', 'https://b.com/rss']);
  });

  it('should reject invalid port', () => {
    const result = configSchema.safeParse({ port: '-1' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid updateIntervalMs', () => {
    const result = configSchema.safeParse({ updateIntervalMs: '0' });
    expect(result.success).toBe(false);
  });

  it('should handle empty RSS feed URLs', () => {
    const result = configSchema.parse({ rssFeedUrls: '' });
    expect(result.rssFeedUrls).toEqual([]);
  });

  it('should trim whitespace from RSS feed URLs', () => {
    const result = configSchema.parse({
      rssFeedUrls: '  https://a.com/rss ,  https://b.com/rss  ',
    });
    expect(result.rssFeedUrls).toEqual(['https://a.com/rss', 'https://b.com/rss']);
  });
});
