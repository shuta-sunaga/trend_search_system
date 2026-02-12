import type { Collector } from './collector.interface.js';
import type { CollectionResult, CollectorStatus, TrendItem } from '../types/index.js';

export class CollectorOrchestrator {
  private collectors: Collector[] = [];
  private statuses = new Map<string, CollectorStatus>();

  register(collector: Collector): void {
    this.collectors.push(collector);
    this.statuses.set(collector.name, {
      name: collector.name,
      source: collector.source,
      healthy: false,
      lastRun: null,
      lastItemCount: 0,
    });
  }

  async collectAll(): Promise<{ items: TrendItem[]; results: CollectionResult[] }> {
    const results = await Promise.allSettled(
      this.collectors.map((c) => c.collect())
    );

    const allItems: TrendItem[] = [];
    const collectionResults: CollectionResult[] = [];

    for (let i = 0; i < results.length; i++) {
      const collector = this.collectors[i];
      const result = results[i];

      if (result.status === 'fulfilled') {
        collectionResults.push(result.value);
        allItems.push(...result.value.items);
        this.statuses.set(collector.name, {
          name: collector.name,
          source: collector.source,
          healthy: result.value.success,
          lastRun: result.value.collectedAt,
          lastItemCount: result.value.items.length,
          lastError: result.value.error,
        });
      } else {
        const errorMsg = result.reason?.message ?? 'Unknown error';
        collectionResults.push({
          source: collector.source,
          items: [],
          collectedAt: new Date(),
          success: false,
          error: errorMsg,
          duration: 0,
        });
        this.statuses.set(collector.name, {
          name: collector.name,
          source: collector.source,
          healthy: false,
          lastRun: new Date(),
          lastItemCount: 0,
          lastError: errorMsg,
        });
      }
    }

    return { items: allItems, results: collectionResults };
  }

  getStatuses(): CollectorStatus[] {
    return Array.from(this.statuses.values());
  }

  getCollectorCount(): number {
    return this.collectors.length;
  }
}
