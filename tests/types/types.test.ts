import { describe, it, expectTypeOf } from 'vitest';
import type {
  TrendItem,
  CollectionResult,
  AggregatedTrend,
  DataSourceType,
  UpdateStatus,
  CollectorStatus,
} from '../../src/types/index.js';

describe('Type definitions', () => {
  it('DataSourceType should be a union of valid sources', () => {
    expectTypeOf<DataSourceType>().toEqualTypeOf<'rss' | 'newsapi' | 'web-scraping' | 'twitter'>();
  });

  it('TrendItem should have required fields', () => {
    expectTypeOf<TrendItem>().toHaveProperty('id');
    expectTypeOf<TrendItem>().toHaveProperty('title');
    expectTypeOf<TrendItem>().toHaveProperty('description');
    expectTypeOf<TrendItem>().toHaveProperty('url');
    expectTypeOf<TrendItem>().toHaveProperty('source');
    expectTypeOf<TrendItem>().toHaveProperty('sourceName');
    expectTypeOf<TrendItem>().toHaveProperty('publishedAt');
    expectTypeOf<TrendItem>().toHaveProperty('collectedAt');
  });

  it('CollectionResult should have required fields', () => {
    expectTypeOf<CollectionResult>().toHaveProperty('source');
    expectTypeOf<CollectionResult>().toHaveProperty('items');
    expectTypeOf<CollectionResult>().toHaveProperty('success');
    expectTypeOf<CollectionResult>().toHaveProperty('collectedAt');
    expectTypeOf<CollectionResult>().toHaveProperty('duration');
  });

  it('AggregatedTrend should have required fields', () => {
    expectTypeOf<AggregatedTrend>().toHaveProperty('id');
    expectTypeOf<AggregatedTrend>().toHaveProperty('topic');
    expectTypeOf<AggregatedTrend>().toHaveProperty('summary');
    expectTypeOf<AggregatedTrend>().toHaveProperty('sources');
    expectTypeOf<AggregatedTrend>().toHaveProperty('score');
    expectTypeOf<AggregatedTrend>().toHaveProperty('category');
    expectTypeOf<AggregatedTrend>().toHaveProperty('lastUpdated');
  });

  it('UpdateStatus should have required fields', () => {
    expectTypeOf<UpdateStatus>().toHaveProperty('lastUpdateAt');
    expectTypeOf<UpdateStatus>().toHaveProperty('nextUpdateAt');
    expectTypeOf<UpdateStatus>().toHaveProperty('isRunning');
    expectTypeOf<UpdateStatus>().toHaveProperty('itemCount');
    expectTypeOf<UpdateStatus>().toHaveProperty('collectors');
  });

  it('CollectorStatus should have required fields', () => {
    expectTypeOf<CollectorStatus>().toHaveProperty('name');
    expectTypeOf<CollectorStatus>().toHaveProperty('source');
    expectTypeOf<CollectorStatus>().toHaveProperty('healthy');
    expectTypeOf<CollectorStatus>().toHaveProperty('lastRun');
    expectTypeOf<CollectorStatus>().toHaveProperty('lastItemCount');
  });

  it('TrendItem should be assignable with correct data', () => {
    const item: TrendItem = {
      id: 'test',
      title: 'Test',
      description: 'Test description',
      url: 'https://example.com',
      source: 'rss',
      sourceName: 'Test RSS',
      publishedAt: new Date(),
      collectedAt: new Date(),
    };
    expectTypeOf(item).toMatchTypeOf<TrendItem>();
  });
});
