import { useState, useMemo } from 'react';
import type { AggregatedTrend } from '../types';
import { TrendCard } from './TrendCard';
import { FilterBar } from './FilterBar';

interface Props {
  trends: AggregatedTrend[];
}

export function TrendList({ trends }: Props) {
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const t of trends) {
      for (const s of t.sources) {
        set.add(s.source);
      }
    }
    return [...set].sort();
  }, [trends]);

  const categories = useMemo(() => {
    return [...new Set(trends.map((t) => t.category))].sort();
  }, [trends]);

  const filtered = useMemo(() => {
    return trends.filter((t) => {
      if (selectedCategory && t.category !== selectedCategory) return false;
      if (selectedSource && !t.sources.some((s) => s.source === selectedSource)) return false;
      return true;
    });
  }, [trends, selectedSource, selectedCategory]);

  return (
    <div className="trend-list">
      <FilterBar
        sources={sources}
        categories={categories}
        selectedSource={selectedSource}
        selectedCategory={selectedCategory}
        onSourceChange={setSelectedSource}
        onCategoryChange={setSelectedCategory}
      />
      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No trends found. Try updating or adjusting filters.</p>
        </div>
      ) : (
        filtered.map((trend, i) => (
          <TrendCard key={trend.id} trend={trend} rank={i + 1} />
        ))
      )}
    </div>
  );
}
