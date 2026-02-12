import { TwitterApi } from 'twitter-api-v2';
import type { Collector } from './collector.interface.js';
import type { CollectionResult, TrendItem } from '../types/index.js';
import { generateId } from '../utils/id.js';

export interface TwitterCredentials {
  bearerToken?: string;
  consumerKey?: string;
  consumerSecret?: string;
  accessToken?: string;
  accessTokenSecret?: string;
}

export class TwitterCollector implements Collector {
  readonly name = 'X (Twitter) Collector';
  readonly source = 'twitter' as const;
  private client: TwitterApi;
  private woeid: number;

  /**
   * @param credentials - Twitter API credentials (OAuth 1.0a preferred for trends)
   * @param woeid - Where On Earth ID (default: 23424856 = Japan)
   */
  constructor(credentials: TwitterCredentials, woeid: number = 23424856) {
    if (credentials.consumerKey && credentials.consumerSecret && credentials.accessToken && credentials.accessTokenSecret) {
      // OAuth 1.0a user-context (required for v1.1 trends endpoint)
      this.client = new TwitterApi({
        appKey: credentials.consumerKey,
        appSecret: credentials.consumerSecret,
        accessToken: credentials.accessToken,
        accessSecret: credentials.accessTokenSecret,
      });
    } else if (credentials.bearerToken) {
      this.client = new TwitterApi(credentials.bearerToken);
    } else {
      throw new Error('Twitter credentials required: provide OAuth 1.0a keys or bearer token');
    }
    this.woeid = woeid;
  }

  async collect(): Promise<CollectionResult> {
    const start = Date.now();

    try {
      const trends = await this.fetchTrends();
      const now = new Date();

      const items: TrendItem[] = trends.map((trend) => ({
        id: generateId(),
        title: trend.name,
        description: trend.tweetVolume
          ? `Trending with ${trend.tweetVolume.toLocaleString()} tweets`
          : 'Trending on X',
        url: trend.url,
        source: this.source,
        sourceName: 'X (Twitter)',
        publishedAt: now,
        collectedAt: now,
        metadata: {
          tweetVolume: trend.tweetVolume,
          query: trend.query,
        },
      }));

      return {
        source: this.source,
        items,
        collectedAt: now,
        success: true,
        duration: Date.now() - start,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        source: this.source,
        items: [],
        collectedAt: new Date(),
        success: false,
        error: message,
        duration: Date.now() - start,
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.v2.me();
      return true;
    } catch {
      return false;
    }
  }

  private async fetchTrends(): Promise<TwitterTrend[]> {
    const trendsResult = await this.client.v1.trendsByPlace(this.woeid);

    if (!trendsResult || trendsResult.length === 0) {
      return [];
    }

    return trendsResult[0].trends.map((trend) => ({
      name: trend.name,
      url: trend.url,
      query: trend.query,
      tweetVolume: trend.tweet_volume ?? null,
    }));
  }
}

interface TwitterTrend {
  name: string;
  url: string;
  query: string;
  tweetVolume: number | null;
}
