import type { TrendItem } from '../types/index.js';

/**
 * Generate an extractive summary from a group of trend items.
 * Picks the most informative description as the summary.
 */
export function summarize(topic: string, items: TrendItem[]): string {
  if (items.length === 0) return topic;

  // Collect non-empty descriptions
  const descriptions = items
    .map((item) => item.description.trim())
    .filter((d) => d.length > 0);

  if (descriptions.length === 0) {
    return `${topic} - ${items.length} sources reporting`;
  }

  // Pick the longest / most informative description
  const best = descriptions.reduce((a, b) => (a.length >= b.length ? a : b));

  // Truncate if too long
  const maxLen = 300;
  if (best.length > maxLen) {
    return best.slice(0, maxLen).trimEnd() + '...';
  }

  return best;
}
