import type { TrendItem } from '../types/index.js';

export interface RankedGroup {
  topic: string;
  items: TrendItem[];
  score: number;
}

/**
 * Group items by topic similarity and rank by score.
 */
export function rankItems(items: TrendItem[]): RankedGroup[] {
  const groups = groupByTopic(items);

  // Score each group
  const ranked = groups.map((group) => ({
    ...group,
    score: calculateScore(group.items),
  }));

  // Sort by score descending
  ranked.sort((a, b) => b.score - a.score);

  return ranked;
}

function groupByTopic(items: TrendItem[]): RankedGroup[] {
  const groups: RankedGroup[] = [];

  for (const item of items) {
    let placed = false;

    for (const group of groups) {
      if (isRelated(item.title, group.topic)) {
        group.items.push(item);
        placed = true;
        break;
      }
    }

    if (!placed) {
      groups.push({
        topic: item.title,
        items: [item],
        score: 0,
      });
    }
  }

  return groups;
}

function isRelated(title: string, topic: string): boolean {
  const titleTokens = tokenize(title);
  const topicTokens = tokenize(topic);

  if (titleTokens.size === 0 || topicTokens.size === 0) return false;

  let overlap = 0;
  for (const t of titleTokens) {
    if (topicTokens.has(t)) overlap++;
  }

  const smaller = Math.min(titleTokens.size, topicTokens.size);
  return smaller > 0 && overlap / smaller >= 0.5;
}

function calculateScore(items: TrendItem[]): number {
  let score = 0;

  // More sources = higher score
  const uniqueSources = new Set(items.map((i) => i.source));
  score += uniqueSources.size * 10;

  // More items = higher score
  score += items.length * 3;

  // Recency bonus: items from the last hour get extra points
  const oneHourAgo = Date.now() - 3_600_000;
  for (const item of items) {
    if (item.publishedAt.getTime() > oneHourAgo) {
      score += 5;
    }
  }

  // Tweet volume bonus
  for (const item of items) {
    const volume = (item.metadata as Record<string, unknown>)?.tweetVolume;
    if (typeof volume === 'number' && volume > 0) {
      score += Math.log10(volume) * 2;
    }
  }

  return Math.round(score * 100) / 100;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .split(/\s+/)
      .filter((t) => t.length > 1)
  );
}
