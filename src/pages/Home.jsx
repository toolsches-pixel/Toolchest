import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from '../components/ui/SearchBar';
import CategoryPills from '../components/ui/CategoryPills';
import EmptyState from '../components/ui/EmptyState';
import { groups, categories } from '../data/tools';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Home() {
  useDocumentTitle('toolchest — free online tools');

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter((group) => {
      const matchesCategory =
        activeCategory === 'All' || group.category === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        group.name.toLowerCase().includes(q) ||
        group.description.toLowerCase().includes(q) ||
        group.tags?.some((t) => t.toLowerCase().includes(q)) ||
        group.tools.some(
          (tool) =>
            tool.name.toLowerCase().includes(q) ||
            tool.description.toLowerCase().includes(q)
        )
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
          {filtered.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupCard({ group }) {
  const toolCount = group.tools.length;
  const isSingle = toolCount === 1;
  const targetPath = isSingle ? group.tools[0].path : `/tools/${group.id}`;

  return (
    <Link
      to={targetPath}
      className="tool-card"
      style={{ '--card-accent': group.color }}
    >
      <div className="tool-card-header">
        <span className="tool-card-icon">{group.icon}</span>
        <span className="tool-card-category">
          {isSingle ? group.category : `${toolCount} tools`}
        </span>
      </div>
      <h3 className="tool-card-name">{group.name}</h3>
      <p className="tool-card-desc">{group.description}</p>
      <div className="tool-card-footer">
        <div className="tool-card-tags">
          {group.tools.slice(0, 3).map((t) => (
            <span key={t.id} className="tool-card-tag">
              {t.icon} {t.name}
            </span>
          ))}
          {toolCount > 3 && (
            <span className="tool-card-tag">+{toolCount - 3} more</span>
          )}
        </div>
        <span className="tool-card-arrow">→</span>
      </div>
    </Link>
  );
}