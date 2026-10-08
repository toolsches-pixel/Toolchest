import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { groups } from '../../data/tools';
import GlobalSearch from '../ui/GlobalSearch';

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const hamburgerRef = useRef(null); 
  const location = useLocation();

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

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Close menu on outside click
 useEffect(() => {
  const handler = (e) => {
    // Close menu only if click is OUTSIDE both the menu AND the hamburger button
    const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(e.target);
    const clickedOutsideHamburger = hamburgerRef.current && !hamburgerRef.current.contains(e.target);

    if (clickedOutsideMenu && clickedOutsideHamburger) {
      setMenuOpen(false);
    }
  };
  if (menuOpen) {
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }
}, [menuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-logo">
          🧰 toolchest
        </Link>

        {/* Desktop links */}
        <div className="navbar-links navbar-links-desktop">
  <NavLink to="/" end>home</NavLink>

  {/* Show first 4 groups directly */}
  {groups.slice(0, 4).map((group) => (
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

  {/* Rest in "More" dropdown */}
  {groups.length > 4 && (
    <div className="navbar-more">
      <button className="navbar-more-btn">
        more <span className="navbar-more-arrow">▾</span>
      </button>
      <div className="navbar-more-dropdown">
        {groups.slice(4).map((group) => (
          <NavLink
            key={group.id}
            to={
              group.tools.length === 1
                ? group.tools[0].path
                : `/tools/${group.id}`
            }
            className="navbar-more-item"
          >
            <span className="navbar-more-icon">{group.icon}</span>
            <span className="navbar-more-name">
              {group.name.split(' ')[0].toLowerCase()}
            </span>
            <span className="navbar-more-count">{group.tools.length}</span>
          </NavLink>
        ))}
      </div>
    </div>
  )}

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
</div>

        {/* Mobile hamburger button */}
        <button
  ref={hamburgerRef}
  className={`navbar-hamburger ${menuOpen ? 'open' : ''}`}
  onClick={() => setMenuOpen((o) => !o)}
  aria-label="Toggle menu"
  aria-expanded={menuOpen}
>
  <span className="navbar-hamburger-bar" />
  <span className="navbar-hamburger-bar" />
  <span className="navbar-hamburger-bar" />
</button>

        {/* Mobile menu dropdown */}
        <div
          className={`navbar-mobile-menu ${menuOpen ? 'open' : ''}`}
          ref={menuRef}
        >
          <div className="navbar-mobile-title-row">
  <span className="navbar-mobile-title-icon">🧰</span>
  <span className="navbar-mobile-title">Menu</span>
</div>

          <div className="navbar-mobile-links">
            <NavLink to="/" end className="navbar-mobile-link">
              <span className="navbar-mobile-link-icon">🏠</span>
              <span>home</span>
            </NavLink>
            {groups.map((group) => (
              <NavLink
                key={group.id}
                to={
                  group.tools.length === 1
                    ? group.tools[0].path
                    : `/tools/${group.id}`
                }
                className="navbar-mobile-link"
              >
                <span className="navbar-mobile-link-icon">{group.icon}</span>
                <span>{group.name.toLowerCase()}</span>
                <span className="navbar-mobile-link-count">
                  {group.tools.length}
                </span>
              </NavLink>
            ))}
          </div>

          <button
            className="navbar-mobile-search"
            onClick={() => {
              setMenuOpen(false);
              setSearchOpen(true);
            }}
          >
            <span>🔍</span>
            <span>Search all tools…</span>
          </button>
        </div>

        {/* Mobile menu backdrop */}
        {menuOpen && (
          <div
            className="navbar-mobile-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </nav>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}