import { Link, NavLink } from 'react-router-dom';
import { tools } from '../../data/tools';

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
        {tools.map((tool) => (
          <NavLink key={tool.id} to={tool.path}>
            {tool.name.split(' ')[0].toLowerCase()}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}