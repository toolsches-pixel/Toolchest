import Breadcrumbs from '../layout/Breadcrumbs';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function ToolShell({ tool, children }) {
  useDocumentTitle(`${tool.name} · toolchest`);

  return (
    <div className="tool-shell">
      <div className="tool-shell-container">
        <Breadcrumbs
          items={[
            { label: 'home', to: '/' },
            { label: tool.category, to: '/' },
            { label: tool.name },
          ]}
        />

        <header className="tool-header">
          <div className="tool-header-top">
            <span className="tool-header-icon">{tool.icon}</span>
            <h1 className="tool-header-title">{tool.name}</h1>
          </div>
          <p className="tool-header-desc">{tool.description}</p>
          <span className="tool-header-category">{tool.category}</span>
        </header>

        <div className="tool-content">{children}</div>
      </div>
    </div>
  );
}