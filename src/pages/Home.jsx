import React from 'react'
import { tools } from '../data/tools'
import ToolCard from '../components/ToolCard'

function Home() {
  return (
    <div className="home">
      <header className="home-header">
        <h1>toolchest</h1>
        <p>Free online tools — no signup, no ads, just tools.</p>
      </header>

      <div className="tools-grid">
        {tools.map(tool => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  )
}

export default Home