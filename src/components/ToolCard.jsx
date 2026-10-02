import React from 'react'
import { Link } from 'react-router-dom'

function ToolCard({ tool }) {
  return (
    <Link to={tool.path} className="tool-card">
      <span className="tool-card-icon" style={{ color: tool.color }}>
        {tool.icon}
      </span>
      <h3 className="tool-card-name">{tool.name}</h3>
      <p className="tool-card-desc">{tool.description}</p>
      <span className="tool-card-arrow">→</span>
    </Link>
  )
}

export default ToolCard