import React from 'react'
import { Link, NavLink } from 'react-router-dom'

function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        🧰 toolchest
      </Link>
      <div className="navbar-links">
        <NavLink to="/" end>home</NavLink>
        <NavLink to="/typingcountries">typing</NavLink>
        <NavLink to="/pdf-editor">pdf</NavLink>
        <NavLink to="/image-resizer">resize</NavLink>
        <NavLink to="/image-compressor">compress</NavLink>
      </div>
    </nav>
  )
}

export default Navbar