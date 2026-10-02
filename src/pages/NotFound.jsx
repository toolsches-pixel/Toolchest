import React from 'react'
import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <div className="not-found">
      <h1>404</h1>
      <p>page not found</p>
      <Link to="/">← back to home</Link>
    </div>
  )
}

export default NotFound