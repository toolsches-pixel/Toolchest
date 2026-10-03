import { Link, NavLink } from 'react-router-dom';
import { groups } from '../../data/tools';

export default function Navbar() {
  return (
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
      </div>
    </nav>
  );
}