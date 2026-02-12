import { useState } from 'react';
import type { AggregatedTrend } from '../types';

interface Props {
  trend: AggregatedTrend;
  rank: number;
}

const sourceColors: Record<string, string> = {
  rss: '#f59e0b',
  newsapi: '#3b82f6',
  'web-scraping': '#10b981',
  twitter: '#6366f1',
};

export function TrendCard({ trend, rank }: Props) {
  const [expanded, setExpanded] = useState(false);

  const uniqueSources = [...new Set(trend.sources.map((s) => s.source))];

  return (
    <div className="trend-card">
      <div className="trend-header">
        <span className="trend-rank">#{rank}</span>
        <div className="trend-title-section">
          <h3 className="trend-topic">{trend.topic}</h3>
          <div className="trend-badges">
            {uniqueSources.map((source) => (
              <span
                key={source}
                className="source-badge"
                style={{ backgroundColor: sourceColors[source] ?? '#6b7280' }}
              >
                {source}
              </span>
            ))}
            <span className="category-badge">{trend.category}</span>
            <span className="score-badge">Score: {trend.score}</span>
          </div>
        </div>
      </div>

      <p className="trend-summary">{trend.summary}</p>

      <div className="trend-footer">
        <span className="trend-sources-count">
          {trend.sources.length} source{trend.sources.length !== 1 ? 's' : ''}
        </span>
        <button
          className="expand-button"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Hide sources' : 'Show sources'}
        </button>
      </div>

      {expanded && (
        <ul className="source-list">
          {trend.sources.map((item, i) => (
            <li key={i} className="source-item">
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {item.title}
              </a>
              <span className="source-meta">
                {item.sourceName} - {new Date(item.publishedAt).toLocaleString('ja-JP')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
