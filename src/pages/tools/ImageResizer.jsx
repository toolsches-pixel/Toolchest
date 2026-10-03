import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';

export default function ImageResizer() {
  const tool = getToolById('image-resizer');
  return (
    <ToolShell tool={tool}>
      <p style={{ color: 'var(--text-muted)' }}>Image resizer coming soon.</p>
    </ToolShell>
  );
}