import * as cheerio from 'cheerio';
import type { Collector } from './collector.interface.js';
import type { CollectionResult, TrendItem } from '../types/index.js';
import { generateId } from '../utils/id.js';

export interface ScrapingTarget {
  url: string;
  name: string;
  selectors: {
    articleContainer: string;
    title: string;
    link: string;
    summary?: string;
    date?: string;
  };
}

export class WebScrapingCollector implements Collector {
  readonly name = 'Web Scraping Collector';
  readonly source = 'web-scraping' as const;
  private targets: ScrapingTarget[];
  private delayMs: number;

  constructor(targets: ScrapingTarget[], options?: { delayMs?: number }) {
    this.targets = targets;
    this.delayMs = options?.delayMs ?? 1000;
  }

  async collect(): Promise<CollectionResult> {
    const start = Date.now();

    if (this.targets.length === 0) {
      return {
        source: this.source,
        items: [],
        collectedAt: new Date(),
        success: true,
        duration: Date.now() - start,
      };
    }

    const items: TrendItem[] = [];
    const errors: string[] = [];

    for (let i = 0; i < this.targets.length; i++) {
      try {
        const targetItems = await this.scrapeTarget(this.targets[i]);
        items.push(...targetItems);
      } catch (error) {
        errors.push(
          `${this.targets[i].name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      // Rate limit: delay between targets (skip after last)
      if (i < this.targets.length - 1 && this.delayMs > 0) {
        await this.delay(this.delayMs);
      }
    }

    return {
      source: this.source,
      items,
      collectedAt: new Date(),
      success: errors.length < this.targets.length,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      duration: Date.now() - start,
    };
  }

  async healthCheck(): Promise<boolean> {
    if (this.targets.length === 0) return false;
    try {
      const res = await fetch(this.targets[0].url, {
        headers: { 'User-Agent': 'TrendSearchBot/1.0 (+https://github.com/trend-search)' },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async scrapeTarget(target: ScrapingTarget): Promise<TrendItem[]> {
    const res = await fetch(target.url, {
      headers: { 'User-Agent': 'TrendSearchBot/1.0 (+https://github.com/trend-search)' },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const now = new Date();
    const items: TrendItem[] = [];

    $(target.selectors.articleContainer).each((_, el) => {
      const $el = $(el);
      const title = $el.find(target.selectors.title).text().trim();
      if (!title) return;

      let link = $el.find(target.selectors.link).attr('href') ?? '';
      // Resolve relative URLs
      if (link && !link.startsWith('http')) {
        try {
          link = new URL(link, target.url).href;
        } catch {
          // keep as-is if URL parsing fails
        }
      }

      const summary = target.selectors.summary
        ? $el.find(target.selectors.summary).text().trim()
        : '';

      const dateText = target.selectors.date
        ? $el.find(target.selectors.date).text().trim()
        : '';
      const publishedAt = dateText ? new Date(dateText) : now;

      items.push({
        id: generateId(),
        title,
        description: summary,
        url: link || target.url,
        source: this.source,
        sourceName: target.name,
        publishedAt: isNaN(publishedAt.getTime()) ? now : publishedAt,
        collectedAt: now,
        metadata: { scrapedFrom: target.url },
      });
    });

    return items;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
