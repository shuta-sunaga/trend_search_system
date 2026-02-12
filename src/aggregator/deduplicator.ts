import type { TrendItem } from '../types/index.js';

/**
 * Deduplicate trend items by URL normalization and title similarity.
 */
export function deduplicateItems(items: TrendItem[]): TrendItem[] {
  const seen = new Map<string, TrendItem>();

  for (const item of items) {
    const normalizedUrl = normalizeUrl(item.url);
    const existingByUrl = seen.get(normalizedUrl);

    if (existingByUrl) {
      // Keep the one with more description content
      if (item.description.length > existingByUrl.description.length) {
        seen.set(normalizedUrl, item);
      }
      continue;
    }

    // Check title similarity against all existing items
    let isDuplicate = false;
    for (const [key, existing] of seen) {
      if (titleSimilarity(item.title, existing.title) > 0.7) {
        // Keep the one with more info
        if (item.description.length > existing.description.length) {
          seen.delete(key);
          seen.set(normalizedUrl, item);
        }
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seen.set(normalizedUrl, item);
    }
  }

  return Array.from(seen.values());
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    u.searchParams.delete('utm_source');
    u.searchParams.delete('utm_medium');
    u.searchParams.delete('utm_campaign');
    u.searchParams.delete('utm_content');
    u.searchParams.delete('utm_term');
    // Remove trailing slash
    let pathname = u.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    return `${u.host}${pathname}${u.search}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Calculate Jaccard similarity between two titles based on tokenized words.
 */
export function titleSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }

  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
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
