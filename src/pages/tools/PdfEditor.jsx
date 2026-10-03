import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';

export default function PdfEditor() {
  const tool = getToolById('pdf-editor');
  return (
    <ToolShell tool={tool}>
      <p style={{ color: 'var(--text-muted)' }}>
        PDF editor coming soon. This page uses <code>ToolShell</code> — breadcrumbs,
        title, description and padding are already handled.
      </p>
    </ToolShell>
  );
}