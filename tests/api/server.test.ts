import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp, type ServerDeps } from '../../src/api/server.js';
import { TrendStore } from '../../src/storage/trend-store.js';
import { UpdateScheduler } from '../../src/scheduler/update-scheduler.js';
import { CollectorOrchestrator } from '../../src/collectors/orchestrator.js';
import type { AggregatedTrend } from '../../src/types/index.js';

function makeDeps(): ServerDeps {
  const store = new TrendStore();
  const scheduler = new UpdateScheduler(vi.fn().mockResolvedValue(undefined), 3_600_000);
  const orchestrator = new CollectorOrchestrator();
  return { store, scheduler, orchestrator };
}

function makeTrend(id: string): AggregatedTrend {
  return {
    id,
    topic: `Topic ${id}`,
    summary: `Summary for ${id}`,
    sources: [],
    score: 10,
    category: 'general',
    lastUpdated: new Date(),
  };
}

describe('API Server', () => {
  let deps: ServerDeps;

  beforeEach(() => {
    deps = makeDeps();
  });

  describe('GET /api/health', () => {
    it('should return ok status', async () => {
      const app = createApp(deps);
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/trends', () => {
    it('should return empty trends when store is empty', async () => {
      const app = createApp(deps);
      const res = await request(app).get('/api/trends');
      expect(res.status).toBe(200);
      expect(res.body.trends).toEqual([]);
      expect(res.body.count).toBe(0);
    });

    it('should return trends from store', async () => {
      deps.store.setAggregated([makeTrend('t1'), makeTrend('t2')]);
      const app = createApp(deps);
      const res = await request(app).get('/api/trends');
      expect(res.status).toBe(200);
      expect(res.body.trends).toHaveLength(2);
      expect(res.body.count).toBe(2);
    });
  });

  describe('GET /api/trends/:id', () => {
    it('should return a specific trend', async () => {
      deps.store.setAggregated([makeTrend('t1')]);
      const app = createApp(deps);
      const res = await request(app).get('/api/trends/t1');
      expect(res.status).toBe(200);
      expect(res.body.topic).toBe('Topic t1');
    });

    it('should return 404 for non-existent trend', async () => {
      const app = createApp(deps);
      const res = await request(app).get('/api/trends/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/update', () => {
    it('should trigger manual update', async () => {
      const app = createApp(deps);
      const res = await request(app).post('/api/update');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Update completed');
    });

    it('should return 409 when update already in progress', async () => {
      // Start a long-running update via scheduler directly
      let resolveUpdate!: () => void;
      const longUpdate = new Promise<void>((r) => { resolveUpdate = r; });
      deps.scheduler = new UpdateScheduler(() => longUpdate, 3_600_000);
      const app = createApp(deps);

      // Start update via scheduler (non-blocking)
      const updatePromise = deps.scheduler.triggerNow();

      // Now the scheduler reports isRunning, so POST /api/update should get 409
      const res = await request(app).post('/api/update');
      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already in progress');

      // Clean up
      resolveUpdate();
      await updatePromise;
    });
  });

  describe('GET /api/status', () => {
    it('should return system status', async () => {
      const app = createApp(deps);
      const res = await request(app).get('/api/status');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('isRunning');
      expect(res.body).toHaveProperty('itemCount');
      expect(res.body).toHaveProperty('trendCount');
      expect(res.body).toHaveProperty('collectors');
      expect(res.body).toHaveProperty('intervalMs');
    });
  });
});
