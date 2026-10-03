import { Link } from 'react-router-dom';

export default function ToolCard({ tool }) {
  return (
    <Link
      to={tool.path}
      className="tool-card"
      style={{ '--card-accent': tool.color }}
    >
      <div className="tool-card-header">
        <span className="tool-card-icon">{tool.icon}</span>
        <span className="tool-card-category">{tool.category}</span>
      </div>
      <h3 className="tool-card-name">{tool.name}</h3>
      <p className="tool-card-desc">{tool.description}</p>
      <div className="tool-card-footer">
        <div className="tool-card-tags">
          {tool.tags?.slice(0, 3).map((tag) => (
            <span key={tag} className="tool-card-tag">
              {tag}
            </span>
          ))}
        </div>
        <span className="tool-card-arrow">→</span>
      </div>
    </Link>
  );
}