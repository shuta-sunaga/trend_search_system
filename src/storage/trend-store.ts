import type { TrendItem, AggregatedTrend, DataSourceType } from '../types/index.js';

interface StoredItem<T> {
  data: T;
  expiresAt: number;
}

/**
 * In-memory store for trend items and aggregated trends with TTL-based expiry.
 */
export class TrendStore {
  private items = new Map<string, StoredItem<TrendItem>>();
  private aggregated = new Map<string, StoredItem<AggregatedTrend>>();
  private ttlMs: number;

  constructor(ttlMs: number = 86_400_000) {
    this.ttlMs = ttlMs;
  }

  /** Add trend items to the store */
  addItems(items: TrendItem[]): void {
    const now = Date.now();
    for (const item of items) {
      this.items.set(item.id, {
        data: item,
        expiresAt: now + this.ttlMs,
      });
    }
  }

  /** Get all non-expired trend items */
  getAll(): TrendItem[] {
    this.evict();
    return Array.from(this.items.values()).map((entry) => entry.data);
  }

  /** Get trend items filtered by source type */
  getBySource(source: DataSourceType): TrendItem[] {
    return this.getAll().filter((item) => item.source === source);
  }

  /** Get a single trend item by ID */
  getItem(id: string): TrendItem | undefined {
    const entry = this.items.get(id);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.items.delete(id);
      return undefined;
    }
    return entry.data;
  }

  /** Store aggregated trends (replaces all previous) */
  setAggregated(trends: AggregatedTrend[]): void {
    this.aggregated.clear();
    const now = Date.now();
    for (const trend of trends) {
      this.aggregated.set(trend.id, {
        data: trend,
        expiresAt: now + this.ttlMs,
      });
    }
  }

  /** Get all non-expired aggregated trends */
  getAggregated(): AggregatedTrend[] {
    const now = Date.now();
    const result: AggregatedTrend[] = [];
    for (const [key, entry] of this.aggregated) {
      if (now > entry.expiresAt) {
        this.aggregated.delete(key);
      } else {
        result.push(entry.data);
      }
    }
    return result;
  }

  /** Get a single aggregated trend by ID */
  getAggregatedById(id: string): AggregatedTrend | undefined {
    const entry = this.aggregated.get(id);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.aggregated.delete(id);
      return undefined;
    }
    return entry.data;
  }

  /** Get count of stored items */
  get itemCount(): number {
    this.evict();
    return this.items.size;
  }

  /** Get count of aggregated trends */
  get aggregatedCount(): number {
    return this.getAggregated().length;
  }

  /** Clear all stored data */
  clear(): void {
    this.items.clear();
    this.aggregated.clear();
  }

  /** Remove expired entries */
  private evict(): void {
    const now = Date.now();
    for (const [key, entry] of this.items) {
      if (now > entry.expiresAt) {
        this.items.delete(key);
      }
    }
  }
}
