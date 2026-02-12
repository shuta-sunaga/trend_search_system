/**
 * Core type definitions for the trend search system
 */

/** Data source identifiers */
export type DataSourceType = 'rss' | 'newsapi' | 'web-scraping' | 'twitter';

/** A single trend/news item collected from any source */
export interface TrendItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: DataSourceType;
  sourceName: string;
  publishedAt: Date;
  collectedAt: Date;
  metadata?: Record<string, unknown>;
}

/** Result from a single collector run */
export interface CollectionResult {
  source: DataSourceType;
  items: TrendItem[];
  collectedAt: Date;
  success: boolean;
  error?: string;
  duration: number;
}

/** An aggregated trend combining multiple sources */
export interface AggregatedTrend {
  id: string;
  topic: string;
  summary: string;
  sources: TrendItem[];
  score: number;
  category: string;
  lastUpdated: Date;
}

/** System update status */
export interface UpdateStatus {
  lastUpdateAt: Date | null;
  nextUpdateAt: Date | null;
  isRunning: boolean;
  itemCount: number;
  collectors: CollectorStatus[];
}

/** Individual collector health status */
export interface CollectorStatus {
  name: string;
  source: DataSourceType;
  healthy: boolean;
  lastRun: Date | null;
  lastItemCount: number;
  lastError?: string;
}
