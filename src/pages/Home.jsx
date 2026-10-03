import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CategoryPills from '../components/ui/CategoryPills';
import EmptyState from '../components/ui/EmptyState';
import { groups, categories } from '../data/tools';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Home() {
  useDocumentTitle('toolchest — free online tools');

  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = useMemo(() => {
    return groups.filter(
      (group) => activeCategory === 'All' || group.category === activeCategory
    );
  }, [activeCategory]);

  return (
    <div className="home">
      <header className="home-header">
        <h1>
           <span className="accent">Toolchest</span>
        </h1>
        <button
          className="home-search-trigger"
          onClick={() => {
            // Dispatch keyboard event to open global search
            const ev = new KeyboardEvent('keydown', {
              key: 'k',
              ctrlKey: true,
              bubbles: true,
            });
            document.dispatchEvent(ev);
          }}
        >
          <span>🔍</span>
          <span>Search all tools…</span>
          <kbd>Ctrl K</kbd>
        </button>
      </header>

      <div className="home-controls">
        <CategoryPills
          categories={categories}
          active={activeCategory}
          onChange={setActiveCategory}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No tools found"
          message={`Nothing in ${activeCategory} category.`}
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