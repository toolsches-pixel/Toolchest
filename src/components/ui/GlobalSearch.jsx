import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { groups, tools } from '../../data/tools';

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  // Build searchable index (tools + groups)
  const index = useMemo(() => {
    const items = [];
    groups.forEach((group) => {
      items.push({
        type: 'group',
        id: group.id,
        title: group.name,
        subtitle: group.description,
        icon: group.icon,
        color: group.color,
        path: group.tools.length === 1 ? group.tools[0].path : `/tools/${group.id}`,
        category: group.category,
        tags: group.tags || [],
      });
      group.tools.forEach((tool) => {
        items.push({
          type: 'tool',
          id: tool.id,
          title: tool.name,
          subtitle: tool.description,
          icon: tool.icon || group.icon,
          color: tool.color || group.color,
          path: tool.path,
          category: group.category,
          tags: [...(tool.tags || []), ...(group.tags || [])],
        });
      });
    });
    return items;
  }, []);

  // Filter results
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return index.slice(0, 8); // show first 8 by default
    const scored = index
      .map((item) => {
        const t = item.title.toLowerCase();
        const s = item.subtitle.toLowerCase();
        let score = 0;
        if (t === q) score += 100;
        if (t.startsWith(q)) score += 60;
        if (t.includes(q)) score += 40;
        if (s.includes(q)) score += 20;
        if (item.tags.some((tag) => tag.toLowerCase().includes(q))) score += 15;
        if (item.category.toLowerCase().includes(q)) score += 10;
        return { item, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((r) => r.item);
    return scored;
  }, [query, index]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlight(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  // Reset highlight when results change
  useEffect(() => {
    setHighlight(0);
  }, [query]);

  // Scroll highlighted into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector('.gs-item.highlighted');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  // Keyboard handler
  useEffect(() => {
    if (!open) return;

    const handler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = results[highlight];
        if (target) {
          navigate(target.path);
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [open, results, highlight, navigate, onClose]);

  if (!open) return null;

  return (
    <div className="gs-overlay" onClick={onClose}>
      <div className="gs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gs-input-wrap">
          <span className="gs-search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="gs-input"
            placeholder="Search tools… (e.g. merge, rotate, jpg)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck="false"
          />
          <kbd className="gs-esc">esc</kbd>
        </div>

        <div className="gs-results" ref={listRef}>
          {results.length === 0 ? (
            <div className="gs-empty">
              <div className="gs-empty-icon">🔍</div>
              <div className="gs-empty-title">No tools found</div>
              <div className="gs-empty-sub">
                Try "pdf", "image", "typing", or "merge"
              </div>
            </div>
          ) : (
            <>
              {!query && (
                <div className="gs-section-label">Popular tools</div>
              )}
              {results.map((item, i) => (
                <button
                  key={`${item.type}-${item.id}`}
                  className={`gs-item ${
                    i === highlight ? 'highlighted' : ''
                  }`}
                  style={{ '--item-accent': item.color }}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                >
                  <span className="gs-item-icon">{item.icon}</span>
                  <div className="gs-item-body">
                    <div className="gs-item-title">
                      {item.title}
                      {item.type === 'tool' && (
                        <span className="gs-item-badge">tool</span>
                      )}
                    </div>
                    <div className="gs-item-sub">{item.subtitle}</div>
                  </div>
                  <span className="gs-item-arrow">↵</span>
                </button>
              ))}
            </>
          )}
        </div>

        <div className="gs-footer">
          <div className="gs-footer-hint">
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
            <kbd>↵</kbd> open
            <kbd>esc</kbd> close
          </div>
        </div>
      </div>
    </div>
  );
}