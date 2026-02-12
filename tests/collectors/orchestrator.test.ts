import { describe, it, expect, vi } from 'vitest';
import { CollectorOrchestrator } from '../../src/collectors/orchestrator.js';
import type { Collector } from '../../src/collectors/collector.interface.js';
import type { CollectionResult } from '../../src/types/index.js';

function createMockCollector(name: string, result: Partial<CollectionResult>): Collector {
  return {
    name,
    source: result.source ?? 'rss',
    collect: vi.fn().mockResolvedValue({
      source: 'rss',
      items: [],
      collectedAt: new Date(),
      success: true,
      duration: 100,
      ...result,
    }),
    healthCheck: vi.fn().mockResolvedValue(true),
  };
}

describe('CollectorOrchestrator', () => {
  it('should register collectors', () => {
    const orch = new CollectorOrchestrator();
    orch.register(createMockCollector('Test', {}));
    expect(orch.getCollectorCount()).toBe(1);
  });

  it('should collect from all registered collectors', async () => {
    const orch = new CollectorOrchestrator();
    orch.register(
      createMockCollector('RSS', {
        source: 'rss',
        items: [{ id: '1', title: 'RSS Item', description: '', url: 'https://a.com', source: 'rss', sourceName: 'RSS', publishedAt: new Date(), collectedAt: new Date() }],
      })
    );
    orch.register(
      createMockCollector('News', {
        source: 'newsapi',
        items: [{ id: '2', title: 'News Item', description: '', url: 'https://b.com', source: 'newsapi', sourceName: 'News', publishedAt: new Date(), collectedAt: new Date() }],
      })
    );

    const { items, results } = await orch.collectAll();
    expect(items).toHaveLength(2);
    expect(results).toHaveLength(2);
  });

  it('should handle collector failures gracefully', async () => {
    const orch = new CollectorOrchestrator();
    const failingCollector: Collector = {
      name: 'Failing',
      source: 'twitter',
      collect: vi.fn().mockRejectedValue(new Error('API down')),
      healthCheck: vi.fn().mockResolvedValue(false),
    };
    orch.register(createMockCollector('RSS', { source: 'rss', items: [] }));
    orch.register(failingCollector);

    const { items, results } = await orch.collectAll();
    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
    expect(results[1].error).toContain('API down');
  });

  it('should track collector statuses', async () => {
    const orch = new CollectorOrchestrator();
    orch.register(createMockCollector('RSS', { source: 'rss' }));

    await orch.collectAll();
    const statuses = orch.getStatuses();
    expect(statuses).toHaveLength(1);
    expect(statuses[0].name).toBe('RSS');
    expect(statuses[0].healthy).toBe(true);
    expect(statuses[0].lastRun).toBeInstanceOf(Date);
  });

  it('should update status on failure', async () => {
    const orch = new CollectorOrchestrator();
    const failingCollector: Collector = {
      name: 'Broken',
      source: 'newsapi',
      collect: vi.fn().mockRejectedValue(new Error('Timeout')),
      healthCheck: vi.fn().mockResolvedValue(false),
    };
    orch.register(failingCollector);

    await orch.collectAll();
    const statuses = orch.getStatuses();
    expect(statuses[0].healthy).toBe(false);
    expect(statuses[0].lastError).toContain('Timeout');
  });

  it('should return empty when no collectors registered', async () => {
    const orch = new CollectorOrchestrator();
    const { items, results } = await orch.collectAll();
    expect(items).toEqual([]);
    expect(results).toEqual([]);
  });
});
