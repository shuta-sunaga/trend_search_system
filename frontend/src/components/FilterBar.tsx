interface Props {
  sources: string[];
  categories: string[];
  selectedSource: string;
  selectedCategory: string;
  onSourceChange: (source: string) => void;
  onCategoryChange: (category: string) => void;
}

export function FilterBar({
  sources,
  categories,
  selectedSource,
  selectedCategory,
  onSourceChange,
  onCategoryChange,
}: Props) {
  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label>Source:</label>
        <select value={selectedSource} onChange={(e) => onSourceChange(e.target.value)}>
          <option value="">All</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label>Category:</label>
        <select value={selectedCategory} onChange={(e) => onCategoryChange(e.target.value)}>
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
