import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { groups } from '../../data/tools';
import GlobalSearch from '../ui/GlobalSearch';
import { useTheme } from '../../context/ThemeContext';

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Global keyboard shortcut: Ctrl+K / Cmd+K / "/"
  useEffect(() => {
    const handler = (e) => {
      const isInput =
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA' ||
          document.activeElement.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-logo">
          🧰 toolchest
        </Link>

        <div className="navbar-links">
          <NavLink to="/" end>
            home
          </NavLink>
          {groups.map((group) => (
            <NavLink
              key={group.id}
              to={
                group.tools.length === 1
                  ? group.tools[0].path
                  : `/tools/${group.id}`
              }
            >
              {group.name.split(' ')[0].toLowerCase()}
            </NavLink>
          ))}

          {/* Search button */}
          <button
            className="navbar-search-btn"
            onClick={() => setSearchOpen(true)}
            title="Search tools (Ctrl+K or /)"
            aria-label="Search tools"
          >
            <span className="navbar-search-icon">🔍</span>
            <span className="navbar-search-text">search</span>
            <kbd className="navbar-search-kbd">⌘K</kbd>
          </button>

          {/* Theme toggle */}
          <button
            className="navbar-theme-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            <span className="navbar-theme-icon">
              {theme === 'dark' ? '☀️' : '🌙'}
            </span>
          </button>
        </div>
      </nav>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}