// import { useEffect, useRef, useState } from 'react';
// import { Link, NavLink, useLocation } from 'react-router-dom';
// import { groups } from '../../data/tools';
// import GlobalSearch from '../ui/GlobalSearch';

// export default function Navbar() {
//   const [searchOpen, setSearchOpen] = useState(false);
//   const [menuOpen, setMenuOpen] = useState(false);

//   // ✅ Theme state with localStorage
//   const [theme, setTheme] = useState(() => {
//     try {
//       return localStorage.getItem('toolchest-theme') || 'dark';
//     } catch {
//       return 'dark';
//     }
//   });

//   const menuRef = useRef(null);
//   const hamburgerRef = useRef(null);
//   const location = useLocation();

//   // ✅ Apply theme to body
//   useEffect(() => {
//     document.body.classList.remove('light-theme', 'dark-theme');
//     document.body.classList.add(`${theme}-theme`);
//     try {
//       localStorage.setItem('toolchest-theme', theme);
//     } catch {}
//   }, [theme]);

//   const toggleTheme = () => {
//     setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
//   };

//   // Global keyboard shortcut: Ctrl+K / Cmd+K / "/"
//   useEffect(() => {
//     const handler = (e) => {
//       const isInput =
//         document.activeElement &&
//         (document.activeElement.tagName === 'INPUT' ||
//           document.activeElement.tagName === 'TEXTAREA' ||
//           document.activeElement.isContentEditable);

//       if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
//         e.preventDefault();
//         setSearchOpen(true);
//         return;
//       }

//       if (e.key === '/' && !isInput) {
//         e.preventDefault();
//         setSearchOpen(true);
//       }
//     };

//     document.addEventListener('keydown', handler);
//     return () => document.removeEventListener('keydown', handler);
//   }, []);

//   // Close menu on route change
//   useEffect(() => {
//     setMenuOpen(false);
//   }, [location.pathname]);

//   // Close menu on outside click
//   useEffect(() => {
//     const handler = (e) => {
//       const clickedOutsideMenu =
//         menuRef.current && !menuRef.current.contains(e.target);
//       const clickedOutsideHamburger =
//         hamburgerRef.current && !hamburgerRef.current.contains(e.target);

//       if (clickedOutsideMenu && clickedOutsideHamburger) {
//         setMenuOpen(false);
//       }
//     };
//     if (menuOpen) {
//       document.addEventListener('mousedown', handler);
//       return () => document.removeEventListener('mousedown', handler);
//     }
//   }, [menuOpen]);

//   // Prevent body scroll when mobile menu is open
//   useEffect(() => {
//     if (menuOpen) {
//       document.body.style.overflow = 'hidden';
//     } else {
//       document.body.style.overflow = '';
//     }
//     return () => {
//       document.body.style.overflow = '';
//     };
//   }, [menuOpen]);

//   return (
//     <>
//       <nav className="navbar">
//         <Link to="/" className="navbar-logo">
//           🧰 toolchest
//         </Link>

//         {/* Desktop links */}
//         <div className="navbar-links navbar-links-desktop">
//           <NavLink to="/" end>
//             home
//           </NavLink>

//           {/* Show first 4 groups directly */}
//           {groups.slice(0, 4).map((group) => (
//             <NavLink
//               key={group.id}
//               to={
//                 group.tools.length === 1
//                   ? group.tools[0].path
//                   : `/tools/${group.id}`
//               }
//             >
//               {group.name.split(' ')[0].toLowerCase()}
//             </NavLink>
//           ))}

//           {/* Rest in "More" dropdown */}
//           {groups.length > 4 && (
//             <div className="navbar-more">
//               <button className="navbar-more-btn">
//                 more <span className="navbar-more-arrow">▾</span>
//               </button>
//               <div className="navbar-more-dropdown">
//                 {groups.slice(4).map((group) => (
//                   <NavLink
//                     key={group.id}
//                     to={
//                       group.tools.length === 1
//                         ? group.tools[0].path
//                         : `/tools/${group.id}`
//                     }
//                     className="navbar-more-item"
//                   >
//                     <span className="navbar-more-icon">{group.icon}</span>
//                     <span className="navbar-more-name">
//                       {group.name.split(' ')[0].toLowerCase()}
//                     </span>
//                     <span className="navbar-more-count">
//                       {group.tools.length}
//                     </span>
//                   </NavLink>
//                 ))}
//               </div>
//             </div>
//           )}
//         </div>

//         {/* ✅ Actions wrapper — theme + search (desktop) */}
//         <div className="navbar-actions navbar-actions-desktop">
//           {/* Theme toggle */}
//           <button
//             className="navbar-theme-btn"
//             onClick={toggleTheme}
//             title={
//               theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
//             }
//             aria-label="Toggle theme"
//           >
//             {theme === 'dark' ? '☀️' : '🌙'}
//           </button>

//           {/* Search button */}
//           <button
//             className="navbar-search-btn"
//             onClick={() => setSearchOpen(true)}
//             title="Search tools (Ctrl+K or /)"
//             aria-label="Search tools"
//           >
//             <span className="navbar-search-icon">🔍</span>
//             <span className="navbar-search-text">search</span>
//             <kbd className="navbar-search-kbd">⌘K</kbd>
//           </button>
//         </div>

//         {/* ✅ Mobile: theme toggle (always visible) + hamburger */}
//         <div className="navbar-actions navbar-actions-mobile">
//           <button
//             className="navbar-theme-btn"
//             onClick={toggleTheme}
//             title={
//               theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
//             }
//             aria-label="Toggle theme"
//           >
//             {theme === 'dark' ? '☀️' : '🌙'}
//           </button>

//           <button
//             ref={hamburgerRef}
//             className={`navbar-hamburger ${menuOpen ? 'open' : ''}`}
//             onClick={() => setMenuOpen((o) => !o)}
//             aria-label="Toggle menu"
//             aria-expanded={menuOpen}
//           >
//             <span className="navbar-hamburger-bar" />
//             <span className="navbar-hamburger-bar" />
//             <span className="navbar-hamburger-bar" />
//           </button>
//         </div>

//         {/* Mobile menu dropdown */}
//         <div
//           className={`navbar-mobile-menu ${menuOpen ? 'open' : ''}`}
//           ref={menuRef}
//         >
//           <div className="navbar-mobile-title-row">
//             <span className="navbar-mobile-title-icon">🧰</span>
//             <span className="navbar-mobile-title">Menu</span>
//           </div>

//           <div className="navbar-mobile-links">
//             <NavLink to="/" end className="navbar-mobile-link">
//               <span className="navbar-mobile-link-icon">🏠</span>
//               <span>home</span>
//             </NavLink>
//             {groups.map((group) => (
//               <NavLink
//                 key={group.id}
//                 to={
//                   group.tools.length === 1
//                     ? group.tools[0].path
//                     : `/tools/${group.id}`
//                 }
//                 className="navbar-mobile-link"
//               >
//                 <span className="navbar-mobile-link-icon">{group.icon}</span>
//                 <span>{group.name.toLowerCase()}</span>
//                 <span className="navbar-mobile-link-count">
//                   {group.tools.length}
//                 </span>
//               </NavLink>
//             ))}
//           </div>

//           <button
//             className="navbar-mobile-search"
//             onClick={() => {
//               setMenuOpen(false);
//               setSearchOpen(true);
//             }}
//           >
//             <span>🔍</span>
//             <span>Search all tools…</span>
//           </button>
//         </div>

//         {/* Mobile menu backdrop */}
//         {menuOpen && (
//           <div
//             className="navbar-mobile-backdrop"
//             onClick={() => setMenuOpen(false)}
//             aria-hidden="true"
//           />
//         )}
//       </nav>

//       <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
//     </>
//   );
// }
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { groups } from '../../data/tools';
import GlobalSearch from '../ui/GlobalSearch';
import './Navbar.css';

const VISIBLE_GROUPS = 4;
const THEME_KEY = 'toolchest-theme';

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);

const groupPath = (group) =>
  group.tools.length === 1 ? group.tools[0].path : `/tools/${group.id}`;

const groupLabel = (group) => group.name.split(' ')[0].toLowerCase();

/* ---------- small inline icons ---------- */
const Icon = ({ children, size = 18 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const SearchIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);
const SunIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);
const MoonIcon = () => (
  <Icon>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
  </Icon>
);
const ChevronIcon = () => (
  <Icon size={14}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Theme: saved choice -> system preference -> dark
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      /* storage unavailable */
    }
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  const menuRef = useRef(null);
  const hamburgerRef = useRef(null);
  const moreRef = useRef(null);
  const location = useLocation();

  /* Apply theme */
  useEffect(() => {
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme}-theme`);
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  /* Global shortcuts: Ctrl/Cmd+K and "/" */
  useEffect(() => {
    const onKey = (e) => {
      const el = document.activeElement;
      const typing =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /* Close menus on route change */
  useEffect(() => {
    setMenuOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  /* Shadow once the page scrolls */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Outside click + Escape close the open menu / dropdown */
  useEffect(() => {
    if (!menuOpen && !moreOpen) return undefined;

    const onDown = (e) => {
      if (menuOpen && !menuRef.current?.contains(e.target) && !hamburgerRef.current?.contains(e.target)) {
        setMenuOpen(false);
      }
      if (moreOpen && !moreRef.current?.contains(e.target)) {
        setMoreOpen(false);
      }
    };
    const onEsc = (e) => {
      if (e.key !== 'Escape') return;
      if (menuOpen) hamburgerRef.current?.focus();
      setMenuOpen(false);
      setMoreOpen(false);
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen, moreOpen]);

  /* Lock page scroll while the mobile menu is open */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  /* Close the mobile menu if the window grows to desktop width */
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 861px)');
    const onChange = (e) => e.matches && setMenuOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const openSearch = () => {
    setMenuOpen(false);
    setSearchOpen(true);
  };

  const themeButton = (
    <button
      type="button"
      className="tcn-icon-btn"
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );

  const primary = groups.slice(0, VISIBLE_GROUPS);
  const overflow = groups.slice(VISIBLE_GROUPS);

  return (
    <>
      <header className={`tcn ${scrolled ? 'is-scrolled' : ''}`}>
        <nav className="tcn-bar" aria-label="Main">
          <Link to="/" className="tcn-logo">
            <span className="tcn-logo-mark" aria-hidden="true">🧰</span>
            <span className="tcn-logo-text">toolchest</span>
          </Link>

          {/* Desktop links */}
          <div className="tcn-links">
            <NavLink to="/" end className="tcn-link">
              home
            </NavLink>

            {primary.map((group) => (
              <NavLink key={group.id} to={groupPath(group)} className="tcn-link">
                {groupLabel(group)}
              </NavLink>
            ))}

            {overflow.length > 0 && (
              <div className="tcn-more" ref={moreRef}>
                <button
                  type="button"
                  className={`tcn-link tcn-more-btn ${moreOpen ? 'is-open' : ''}`}
                  onClick={() => setMoreOpen((o) => !o)}
                  aria-expanded={moreOpen}
                  aria-haspopup="true"
                >
                  more <ChevronIcon />
                </button>

                {moreOpen && (
                  <div className="tcn-more-panel">
                    {overflow.map((group) => (
                      <NavLink key={group.id} to={groupPath(group)} className="tcn-more-item">
                        <span className="tcn-more-icon">{group.icon}</span>
                        <span className="tcn-more-name">{groupLabel(group)}</span>
                        <span className="tcn-count">{group.tools.length}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop actions */}
          <div className="tcn-actions">
            <button
              type="button"
              className="tcn-search"
              onClick={openSearch}
              title={`Search tools (${isMac ? '⌘' : 'Ctrl'}+K or /)`}
              aria-label="Search tools"
            >
              <SearchIcon />
              <span className="tcn-search-text">Search tools…</span>
              <kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
            </button>
            {themeButton}
          </div>

          {/* Mobile actions */}
          <div className="tcn-actions-mobile">
            <button type="button" className="tcn-icon-btn" onClick={openSearch} aria-label="Search tools">
              <SearchIcon />
            </button>
            {themeButton}
            <button
              type="button"
              ref={hamburgerRef}
              className={`tcn-burger ${menuOpen ? 'is-open' : ''}`}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="tcn-drawer"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      <div className={`tcn-backdrop ${menuOpen ? 'is-open' : ''}`} aria-hidden="true" />
      <aside
        id="tcn-drawer"
        ref={menuRef}
        className={`tcn-drawer ${menuOpen ? 'is-open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className="tcn-drawer-head">
          <span className="tcn-drawer-title">All tools</span>
        </div>

        <div className="tcn-drawer-links">
          <NavLink to="/" end className="tcn-drawer-link">
            <span className="tcn-drawer-icon">🏠</span>
            <span>home</span>
          </NavLink>
          {groups.map((group) => (
            <NavLink key={group.id} to={groupPath(group)} className="tcn-drawer-link">
              <span className="tcn-drawer-icon">{group.icon}</span>
              <span className="tcn-drawer-name">{group.name.toLowerCase()}</span>
              <span className="tcn-count">{group.tools.length}</span>
            </NavLink>
          ))}
        </div>

        <button type="button" className="tcn-drawer-search" onClick={openSearch}>
          <SearchIcon />
          <span>Search all tools…</span>
        </button>
      </aside>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}