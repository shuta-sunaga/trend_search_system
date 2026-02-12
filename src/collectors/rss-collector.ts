import Parser from 'rss-parser';
import type { Collector } from './collector.interface.js';
import type { CollectionResult, TrendItem } from '../types/index.js';
import { generateId } from '../utils/id.js';

export class RssCollector implements Collector {
  readonly name = 'RSS Feed Collector';
  readonly source = 'rss' as const;
  private parser = new Parser({ timeout: 10_000 });
  private feedUrls: string[];

  constructor(feedUrls: string[]) {
    this.feedUrls = feedUrls;
  }

  async collect(): Promise<CollectionResult> {
    const start = Date.now();

    if (this.feedUrls.length === 0) {
      return {
        source: this.source,
        items: [],
        collectedAt: new Date(),
        success: true,
        duration: Date.now() - start,
      };
    }

    const results = await Promise.allSettled(
      this.feedUrls.map((url) => this.fetchFeed(url))
    );

    const items: TrendItem[] = [];
    const errors: string[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        items.push(...result.value);
      } else {
        errors.push(result.reason?.message ?? 'Unknown error');
      }
    }

    return {
      source: this.source,
      items,
      collectedAt: new Date(),
      success: errors.length < this.feedUrls.length, // success if at least one feed worked
      error: errors.length > 0 ? errors.join('; ') : undefined,
      duration: Date.now() - start,
    };
  }

  async healthCheck(): Promise<boolean> {
    if (this.feedUrls.length === 0) return false;
    try {
      await this.parser.parseURL(this.feedUrls[0]);
      return true;
    } catch {
      return false;
    }
  }

  private async fetchFeed(url: string): Promise<TrendItem[]> {
    const feed = await this.parser.parseURL(url);
    const now = new Date();

    return (feed.items ?? []).map((item) => ({
      id: generateId(),
      title: item.title ?? 'Untitled',
      description: item.contentSnippet ?? item.content ?? '',
      url: item.link ?? url,
      source: this.source,
      sourceName: feed.title ?? url,
      publishedAt: item.pubDate ? new Date(item.pubDate) : now,
      collectedAt: now,
      metadata: {
        feedUrl: url,
        categories: item.categories,
        creator: item.creator,
      },
    }));
  }
}
