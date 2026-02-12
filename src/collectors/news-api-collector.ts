import type { Collector } from './collector.interface.js';
import type { CollectionResult, TrendItem } from '../types/index.js';
import { generateId } from '../utils/id.js';

interface NewsApiArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

export class NewsApiCollector implements Collector {
  readonly name = 'News API Collector';
  readonly source = 'newsapi' as const;
  private apiKey: string;
  private baseUrl = 'https://newsapi.org/v2';
  private country: string;
  private pageSize: number;

  constructor(apiKey: string, options?: { country?: string; pageSize?: number }) {
    this.apiKey = apiKey;
    this.country = options?.country ?? 'jp';
    this.pageSize = options?.pageSize ?? 30;
  }

  async collect(): Promise<CollectionResult> {
    const start = Date.now();

    try {
      const articles = await this.fetchTopHeadlines();
      const now = new Date();

      const items: TrendItem[] = articles.map((article) => ({
        id: generateId(),
        title: article.title ?? 'Untitled',
        description: article.description ?? article.content ?? '',
        url: article.url,
        source: this.source,
        sourceName: article.source.name ?? 'NewsAPI',
        publishedAt: new Date(article.publishedAt),
        collectedAt: now,
        metadata: {
          author: article.author,
          imageUrl: article.urlToImage,
          originalSource: article.source,
        },
      }));

      return {
        source: this.source,
        items,
        collectedAt: now,
        success: true,
        duration: Date.now() - start,
      };
    } catch (error) {
      return {
        source: this.source,
        items: [],
        collectedAt: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - start,
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/top-headlines?country=${this.country}&pageSize=1&apiKey=${this.apiKey}`;
      const res = await fetch(url);
      return res.ok;
    } catch {
      return false;
    }
  }

  private async fetchTopHeadlines(): Promise<NewsApiArticle[]> {
    const url = `${this.baseUrl}/top-headlines?country=${this.country}&pageSize=${this.pageSize}&apiKey=${this.apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('NewsAPI rate limit exceeded');
      }
      throw new Error(`NewsAPI error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as NewsApiResponse;

    if (data.status !== 'ok') {
      throw new Error(`NewsAPI returned status: ${data.status}`);
    }

    return data.articles ?? [];
  }
}
