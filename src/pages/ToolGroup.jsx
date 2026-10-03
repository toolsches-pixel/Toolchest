import { useParams, Link, Navigate } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import { getGroupById } from '../data/tools';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function ToolGroup() {
  const { groupId } = useParams();
  const group = getGroupById(groupId);

  useDocumentTitle(group ? `${group.name} · toolchest` : 'not found · toolchest');

  if (!group) return <Navigate to="/404" replace />;

  // Single-tool group → redirect directly to that tool
  if (group.tools.length === 1) {
    return <Navigate to={group.tools[0].path} replace />;
  }

  return (
    <div className="tool-shell">
      <div className="tool-shell-container">
        <Breadcrumbs
          items={[
            { label: 'home', to: '/' },
            { label: group.name },
          ]}
        />

        <header className="tool-header">
          <div className="tool-header-top">
            <span className="tool-header-icon">{group.icon}</span>
            <h1 className="tool-header-title">{group.name}</h1>
          </div>
          <p className="tool-header-desc">{group.description}</p>
          <span className="tool-header-category">{group.category}</span>
        </header>

        <div className="tool-content">
          <div className="subtools-grid">
            {group.tools.map((tool) => (
              <Link
                key={tool.id}
                to={tool.path}
                className="subtool-card"
                style={{ '--card-accent': group.color }}
              >
                <span className="subtool-icon">{tool.icon}</span>
                <div className="subtool-body">
                  <h3 className="subtool-name">{tool.name}</h3>
                  <p className="subtool-desc">{tool.description}</p>
                </div>
                <span className="subtool-arrow">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}