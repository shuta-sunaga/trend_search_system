import type { TrendItem, AggregatedTrend } from '../types/index.js';
import { deduplicateItems } from './deduplicator.js';
import { rankItems } from './ranker.js';
import { summarize } from './summarizer.js';
import { generateId } from '../utils/id.js';

/**
 * Full aggregation pipeline: deduplicate → rank → summarize.
 */
export class TrendAggregator {
  aggregate(items: TrendItem[]): AggregatedTrend[] {
    if (items.length === 0) return [];

    // Step 1: Deduplicate
    const unique = deduplicateItems(items);

    // Step 2: Group and rank
    const ranked = rankItems(unique);

    // Step 3: Summarize each group
    const now = new Date();
    return ranked.map((group) => ({
      id: generateId(),
      topic: group.topic,
      summary: summarize(group.topic, group.items),
      sources: group.items,
      score: group.score,
      category: detectCategory(group.topic, group.items),
      lastUpdated: now,
    }));
  }
}

function detectCategory(topic: string, items: TrendItem[]): string {
  const text = `${topic} ${items.map((i) => i.title).join(' ')}`.toLowerCase();

  const categories: [string, string[]][] = [
    ['technology', ['ai', 'tech', 'software', 'google', 'apple', 'microsoft', 'api', 'programming', 'developer']],
    ['business', ['business', 'market', 'stock', 'economy', 'company', 'finance', 'investment']],
    ['politics', ['politics', 'government', 'election', 'president', 'minister', 'policy', 'law']],
    ['entertainment', ['movie', 'music', 'game', 'anime', 'drama', 'celebrity', 'entertainment']],
    ['sports', ['sports', 'football', 'baseball', 'soccer', 'basketball', 'olympic', 'match']],
    ['science', ['science', 'research', 'study', 'space', 'nasa', 'climate', 'health', 'medical']],
  ];

  for (const [category, keywords] of categories) {
    if (keywords.some((kw) => text.includes(kw))) {
      return category;
    }
  }

  return 'general';
}
