import express from 'express';
import cors from 'cors';
import type { TrendStore } from '../storage/trend-store.js';
import type { UpdateScheduler } from '../scheduler/update-scheduler.js';
import type { CollectorOrchestrator } from '../collectors/orchestrator.js';

export interface ServerDeps {
  store: TrendStore;
  scheduler: UpdateScheduler;
  orchestrator: CollectorOrchestrator;
}

export function createApp(deps: ServerDeps) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const { store, scheduler, orchestrator } = deps;

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Get all aggregated trends
  app.get('/api/trends', (_req, res) => {
    const trends = store.getAggregated();
    res.json({
      trends,
      count: trends.length,
      lastUpdate: scheduler.getStatus().lastUpdateAt,
    });
  });

  // Get a single trend by ID
  app.get('/api/trends/:id', (req, res) => {
    const trend = store.getAggregatedById(req.params.id);
    if (!trend) {
      res.status(404).json({ error: 'Trend not found' });
      return;
    }
    res.json(trend);
  });

  // Manual update trigger
  app.post('/api/update', async (_req, res) => {
    const { started } = await scheduler.triggerNow();
    if (!started) {
      res.status(409).json({ message: 'Update already in progress' });
      return;
    }
    res.json({
      message: 'Update completed',
      itemCount: store.itemCount,
      trendCount: store.aggregatedCount,
    });
  });

  // System status
  app.get('/api/status', (_req, res) => {
    const schedulerStatus = scheduler.getStatus();
    const collectorStatuses = orchestrator.getStatuses();

    res.json({
      lastUpdateAt: schedulerStatus.lastUpdateAt,
      nextUpdateAt: schedulerStatus.nextUpdateAt,
      isRunning: schedulerStatus.isRunning,
      isScheduled: schedulerStatus.isScheduled,
      intervalMs: schedulerStatus.intervalMs,
      itemCount: store.itemCount,
      trendCount: store.aggregatedCount,
      collectors: collectorStatuses,
    });
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
