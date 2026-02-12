export interface TrendItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  sourceName: string;
  publishedAt: string;
  collectedAt: string;
}

export interface AggregatedTrend {
  id: string;
  topic: string;
  summary: string;
  sources: TrendItem[];
  score: number;
  category: string;
  lastUpdated: string;
}

export interface TrendsResponse {
  trends: AggregatedTrend[];
  count: number;
  lastUpdate: string | null;
}

export interface StatusResponse {
  lastUpdateAt: string | null;
  nextUpdateAt: string | null;
  isRunning: boolean;
  isScheduled: boolean;
  intervalMs: number;
  itemCount: number;
  trendCount: number;
  collectors: {
    name: string;
    source: string;
    healthy: boolean;
    lastRun: string | null;
    lastItemCount: number;
    lastError?: string;
  }[];
}
