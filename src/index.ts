import { appConfig } from './config/index.js';
import { TrendStore } from './storage/trend-store.js';
import { CollectorOrchestrator } from './collectors/orchestrator.js';
import { TrendAggregator } from './aggregator/trend-aggregator.js';
import { RssCollector } from './collectors/rss-collector.js';
import { NewsApiCollector } from './collectors/news-api-collector.js';
import { TwitterCollector } from './collectors/twitter-collector.js';
import { XTrendsScraper } from './collectors/x-trends-scraper.js';
import { UpdateScheduler } from './scheduler/update-scheduler.js';
import { createApp } from './api/server.js';

export function hello(): string {
  return 'Hello from trend_search_system!';
}

export async function main(): Promise<void> {
  console.log('Starting Trend Search System...');

  // Initialize core components
  const store = new TrendStore(appConfig.storageTtlMs);
  const orchestrator = new CollectorOrchestrator();
  const aggregator = new TrendAggregator();

  // Register collectors
  if (appConfig.rssFeedUrls.length > 0) {
    orchestrator.register(new RssCollector(appConfig.rssFeedUrls));
    console.log(`  RSS Collector: ${appConfig.rssFeedUrls.length} feeds`);
  }

  if (appConfig.newsApiKey) {
    orchestrator.register(new NewsApiCollector(appConfig.newsApiKey));
    console.log('  News API Collector: enabled');
  }

  // X (Twitter): Use API if available, otherwise fall back to scraping
  const hasTwitterOAuth = appConfig.twitterConsumerKey && appConfig.twitterConsumerSecret
    && appConfig.twitterAccessToken && appConfig.twitterAccessTokenSecret;
  if (hasTwitterOAuth || appConfig.twitterBearerToken) {
    // Try API first, register scraper as fallback
    orchestrator.register(new TwitterCollector({
      bearerToken: appConfig.twitterBearerToken,
      consumerKey: appConfig.twitterConsumerKey,
      consumerSecret: appConfig.twitterConsumerSecret,
      accessToken: appConfig.twitterAccessToken,
      accessTokenSecret: appConfig.twitterAccessTokenSecret,
    }));
    console.log(`  Twitter API Collector: enabled (${hasTwitterOAuth ? 'OAuth 1.0a' : 'Bearer Token'})`);
  }
  // Always register the scraper as a reliable X trends source
  orchestrator.register(new XTrendsScraper('japan'));
  console.log('  X Trends Scraper (trends24.in): enabled');

  if (orchestrator.getCollectorCount() === 0) {
    console.warn('Warning: No collectors configured. Set API keys in .env file.');
  }

  // Update function: collect -> aggregate -> store
  const runUpdate = async () => {
    console.log(`[${new Date().toISOString()}] Running update...`);
    const { items, results } = await orchestrator.collectAll();

    const successCount = results.filter((r) => r.success).length;
    console.log(`  Collected ${items.length} items from ${successCount}/${results.length} sources`);

    const trends = aggregator.aggregate(items);
    store.addItems(items);
    store.setAggregated(trends);

    console.log(`  Aggregated into ${trends.length} trends`);
  };

  // Scheduler: auto-update every interval
  const scheduler = new UpdateScheduler(runUpdate, appConfig.updateIntervalMs);

  // Create and start HTTP server
  const app = createApp({ store, scheduler, orchestrator });

  app.listen(appConfig.port, () => {
    console.log(`\nServer running on http://localhost:${appConfig.port}`);
    console.log(`  API: http://localhost:${appConfig.port}/api/trends`);
    console.log(`  Status: http://localhost:${appConfig.port}/api/status`);
    console.log(`  Manual update: POST http://localhost:${appConfig.port}/api/update`);
    console.log(`  Auto-update interval: ${appConfig.updateIntervalMs / 60000} minutes`);
  });

  // Run first update immediately, then start scheduler
  await runUpdate();
  scheduler.start();
  console.log('Scheduler started. Auto-update enabled.');
}

// Run main if this is the entry point
const entryUrl = `file:///${process.argv[1]?.replace(/\\/g, '/')}`;
if (import.meta.url === entryUrl || process.argv[1]?.endsWith('index.ts')) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
