import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TwitterCollector } from '../../src/collectors/twitter-collector.js';

// Mock twitter-api-v2
vi.mock('twitter-api-v2', () => {
  const mockTrendsByPlace = vi.fn();
  const mockMe = vi.fn();

  return {
    TwitterApi: vi.fn().mockImplementation(() => ({
      v1: { trendsByPlace: mockTrendsByPlace },
      v2: { me: mockMe },
    })),
    __mockTrendsByPlace: mockTrendsByPlace,
    __mockMe: mockMe,
  };
});

import { TwitterApi } from 'twitter-api-v2';

// Get the mock functions
const mocks = await import('twitter-api-v2') as unknown as {
  __mockTrendsByPlace: ReturnType<typeof vi.fn>;
  __mockMe: ReturnType<typeof vi.fn>;
};

describe('TwitterCollector', () => {
  let collector: TwitterCollector;

  beforeEach(() => {
    vi.clearAllMocks();
    collector = new TwitterCollector({ bearerToken: 'test-bearer-token' });
  });

  it('should have correct name and source', () => {
    expect(collector.name).toBe('X (Twitter) Collector');
    expect(collector.source).toBe('twitter');
  });

  it('should collect trending topics', async () => {
    mocks.__mockTrendsByPlace.mockResolvedValueOnce([
      {
        trends: [
          { name: '#AITrending', url: 'https://twitter.com/search?q=%23AITrending', query: '%23AITrending', tweet_volume: 50000 },
          { name: 'TypeScript', url: 'https://twitter.com/search?q=TypeScript', query: 'TypeScript', tweet_volume: 12000 },
          { name: '#NicheTopic', url: 'https://twitter.com/search?q=%23NicheTopic', query: '%23NicheTopic', tweet_volume: null },
        ],
      },
    ]);

    const result = await collector.collect();
    expect(result.success).toBe(true);
    expect(result.items).toHaveLength(3);
    expect(result.items[0].title).toBe('#AITrending');
    expect(result.items[0].source).toBe('twitter');
    expect(result.items[0].description).toContain('50,000');
    expect(result.items[2].description).toBe('Trending on X');
  });

  it('should handle empty trends response', async () => {
    mocks.__mockTrendsByPlace.mockResolvedValueOnce([]);

    const result = await collector.collect();
    expect(result.success).toBe(true);
    expect(result.items).toHaveLength(0);
  });

  it('should handle API errors gracefully', async () => {
    mocks.__mockTrendsByPlace.mockRejectedValueOnce(new Error('Rate limit exceeded'));

    const result = await collector.collect();
    expect(result.success).toBe(false);
    expect(result.items).toHaveLength(0);
    expect(result.error).toContain('Rate limit exceeded');
  });

  it('should handle null response', async () => {
    mocks.__mockTrendsByPlace.mockResolvedValueOnce(null);

    const result = await collector.collect();
    expect(result.success).toBe(true);
    expect(result.items).toHaveLength(0);
  });

  it('should include duration in result', async () => {
    mocks.__mockTrendsByPlace.mockResolvedValueOnce([{ trends: [] }]);

    const result = await collector.collect();
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should use bearer token when only bearer is provided', () => {
    expect(TwitterApi).toHaveBeenCalledWith('test-bearer-token');
  });

  it('should use OAuth 1.0a when all keys provided', () => {
    vi.clearAllMocks();
    new TwitterCollector({
      consumerKey: 'ck',
      consumerSecret: 'cs',
      accessToken: 'at',
      accessTokenSecret: 'ats',
    });
    expect(TwitterApi).toHaveBeenCalledWith({
      appKey: 'ck',
      appSecret: 'cs',
      accessToken: 'at',
      accessSecret: 'ats',
    });
  });

  it('should throw when no credentials provided', () => {
    expect(() => new TwitterCollector({})).toThrow('Twitter credentials required');
  });

  describe('healthCheck', () => {
    it('should return true when API is accessible', async () => {
      mocks.__mockMe.mockResolvedValueOnce({ data: { id: '1', name: 'test' } });
      expect(await collector.healthCheck()).toBe(true);
    });

    it('should return false when API fails', async () => {
      mocks.__mockMe.mockRejectedValueOnce(new Error('Unauthorized'));
      expect(await collector.healthCheck()).toBe(false);
    });
  });
});
