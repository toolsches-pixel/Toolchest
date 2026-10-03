import { useMemo, useState } from 'react';
import ToolCard from '../components/ui/ToolCard';
import SearchBar from '../components/ui/SearchBar';
import CategoryPills from '../components/ui/CategoryPills';
import EmptyState from '../components/ui/EmptyState';
import { tools, categories } from '../data/tools';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Home() {
  useDocumentTitle('toolchest — free online tools');

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools.filter((tool) => {
      const matchesCategory =
        activeCategory === 'All' || tool.category === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.tags?.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, activeCategory]);

  return (
    <div className="home">
      <header className="home-header">
        <h1>
          your <span className="accent">toolchest</span>
        </h1>
        <p>
          A growing collection of fast, private, browser-based tools. No
          signup, no tracking, no nonsense.
        </p>
      </header>

      <div className="home-controls">
        <SearchBar value={query} onChange={setQuery} />
        <CategoryPills
          categories={categories}
          active={activeCategory}
          onChange={setActiveCategory}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No tools found"
          message={`Nothing matches "${query}" in ${activeCategory}.`}
        />
      ) : (
        <div className="tools-grid">
          {filtered.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}