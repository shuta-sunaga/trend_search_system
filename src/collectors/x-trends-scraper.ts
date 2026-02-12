import * as cheerio from 'cheerio';
import type { Collector } from './collector.interface.js';
import type { CollectionResult, TrendItem } from '../types/index.js';
import { generateId } from '../utils/id.js';

/**
 * Scrapes X (Twitter) trending topics from trends24.in
 * as a fallback when X API access is limited.
 */
export class XTrendsScraper implements Collector {
  readonly name = 'X Trends Scraper (trends24.in)';
  readonly source = 'twitter' as const;
  private url: string;

  constructor(country: string = 'japan') {
    this.url = `https://trends24.in/${country}/`;
  }

  async collect(): Promise<CollectionResult> {
    const start = Date.now();

    try {
      const res = await fetch(this.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ja,en;q=0.9',
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const html = await res.text();
      const items = this.parseHtml(html);

      return {
        source: this.source,
        items,
        collectedAt: new Date(),
        success: true,
        duration: Date.now() - start,
      };
    } catch (error) {
      return {
        source: this.source,
        items: [],
        collectedAt: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - start,
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(this.url, { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  }

  private parseHtml(html: string): TrendItem[] {
    const $ = cheerio.load(html);
    const items: TrendItem[] = [];
    const now = new Date();
    const seen = new Set<string>();

    // Directly select all trend list items (class may be unquoted in HTML)
    $('.trend-card__list li').each((_, li) => {
      const $li = $(li);
      const $link = $li.find('a.trend-link').first();
      if ($link.length === 0) return;

      const name = $link.text().trim();
      if (!name || seen.has(name.toLowerCase())) return;
      seen.add(name.toLowerCase());

      // Use the href from the link directly, or build search URL
      const href = $link.attr('href') ?? '';
      const url = href.startsWith('http')
        ? href
        : `https://x.com/search?q=${encodeURIComponent(name)}&src=trend_click`;

      // Tweet count from data-count attribute or text
      const $count = $li.find('.tweet-count');
      const countData = $count.attr('data-count') ?? '';
      const countText = $count.text().trim();
      const tweetVolume = this.parseTweetCount(countData || countText);

      items.push({
        id: generateId(),
        title: name,
        description: tweetVolume
          ? `X trending with ${tweetVolume.toLocaleString()} tweets`
          : 'Trending on X',
        url,
        source: this.source,
        sourceName: 'X (Twitter)',
        publishedAt: now,
        collectedAt: now,
        metadata: {
          tweetVolume,
          query: name,
          scrapedFrom: 'trends24.in',
        },
      });
    });

    return items;
  }

  private parseTweetCount(text: string): number | null {
    if (!text) return null;
    // Formats: "123K", "1.2M", "45.6K", "1,234"
    const cleaned = text.replace(/[,\s]/g, '').toUpperCase();
    const match = cleaned.match(/([\d.]+)([KM])?/);
    if (!match) return null;

    let num = parseFloat(match[1]);
    if (match[2] === 'K') num *= 1_000;
    if (match[2] === 'M') num *= 1_000_000;
    return Math.round(num);
  }
}
