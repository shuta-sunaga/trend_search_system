import type { CollectionResult, DataSourceType } from '../types/index.js';

/**
 * Interface that all data collectors must implement.
 * Each collector is responsible for fetching trend/news data from a specific source.
 */
export interface Collector {
  /** Human-readable name of this collector */
  readonly name: string;

  /** The data source type this collector handles */
  readonly source: DataSourceType;

  /** Collect trend items from the source */
  collect(): Promise<CollectionResult>;

  /** Check if the collector is properly configured and reachable */
  healthCheck(): Promise<boolean>;
}
