import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';

export default function ImageCompressor() {
  const tool = getToolById('image-compressor');
  return (
    <ToolShell tool={tool}>
      <p style={{ color: 'var(--text-muted)' }}>Image compressor coming soon.</p>
    </ToolShell>
  );
}