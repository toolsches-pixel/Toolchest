import { useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';

const MODES = [
  {
    id: 'extract',
    name: 'Extract pages',
    desc: 'Keep only selected pages',
    icon: '✂️',
  },
  {
    id: 'remove',
    name: 'Remove pages',
    desc: 'Delete selected pages',
    icon: '🗑️',
  },
  {
    id: 'range',
    name: 'Split by range',
    desc: 'Every N pages → new PDF',
    icon: '📚',
  },
  {
    id: 'every',
    name: 'Split every page',
    desc: 'One PDF per page (ZIP)',
    icon: '📄',
  },
  {
    id: 'half',
    name: 'Split in half',
    desc: 'Two equal parts',
    icon: '⚖️',
  },
];

export default function SplitPdf() {
  const tool = getToolById('split-pdf');

  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState('extract');
  const [pageInput, setPageInput] = useState(''); // for extract / remove
  const [rangeSize, setRangeSize] = useState(2); // for range mode
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null); // { url, size, filename, isZip, outputCount, pages }
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are supported.');
      return;
    }

    setError('');
    setResult(null);
    setProgress('');
    setFile(f);

    try {
      const buf = await f.arrayBuffer();
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
      setPageCount(pdf.getPageCount());
    } catch (err) {
      console.error(err);
      setError('Could not read PDF: ' + (err?.message || 'unknown error'));
      setFile(null);
      setPageCount(0);
    }
  };

  const handleReset = () => {
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setPageCount(0);
    setResult(null);
    setError('');
    setProgress('');
    setPageInput('');
    setRangeSize(2);
    setMode('extract');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /** Parse "1,3,5-8" into sorted array of 1-based page numbers */
  const parsePageRange = (str, total) => {
    const set = new Set();
    const parts = str.split(',').map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes('-')) {
        const [a, b] = part.split('-').map((n) => parseInt(n, 10));
        if (!isNaN(a) && !isNaN(b)) {
          const start = Math.max(1, Math.min(a, b));
          const end = Math.min(total, Math.max(a, b));
          for (let i = start; i <= end; i++) set.add(i);
        }
      } else {
        const n = parseInt(part, 10);
        if (!isNaN(n) && n >= 1 && n <= total) set.add(n);
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  };

  const split = async () => {
    if (!file || processing) return;
    setProcessing(true);
    setError('');
    setProgress('Loading PDF…');
    setResult(null);

    try {
      const buf = await file.arrayBuffer();
      const srcPdf = await PDFDocument.load(buf, { ignoreEncryption: true });
      const total = srcPdf.getPageCount();
      const baseName = file.name.replace(/\.pdf$/i, '');

      // ============ EXTRACT ============
      if (mode === 'extract') {
        const pages = parsePageRange(pageInput, total);
        if (pages.length === 0)
          throw new Error('No valid page numbers selected.');

        setProgress(`Extracting ${pages.length} page${pages.length === 1 ? '' : 's'}…`);
        const out = await PDFDocument.create();
        const copied = await out.copyPages(
          srcPdf,
          pages.map((p) => p - 1)
        );
        copied.forEach((p) => out.addPage(p));

        const bytes = await out.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        setResult({
          url,
          size: blob.size,
          filename: `${baseName}-extracted.pdf`,
          isZip: false,
          outputCount: 1,
          totalPages: pages.length,
          detail: `Pages: ${pages.join(', ')}`,
        });
      }

      // ============ REMOVE ============
      else if (mode === 'remove') {
        const toRemove = new Set(parsePageRange(pageInput, total));
        if (toRemove.size === 0)
          throw new Error('No valid page numbers to remove.');
        if (toRemove.size >= total)
          throw new Error('Cannot remove all pages.');

        const keep = [];
        for (let i = 1; i <= total; i++) if (!toRemove.has(i)) keep.push(i);

        setProgress(`Removing ${toRemove.size} page${toRemove.size === 1 ? '' : 's'}…`);
        const out = await PDFDocument.create();
        const copied = await out.copyPages(
          srcPdf,
          keep.map((p) => p - 1)
        );
        copied.forEach((p) => out.addPage(p));

        const bytes = await out.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        setResult({
          url,
          size: blob.size,
          filename: `${baseName}-cleaned.pdf`,
          isZip: false,
          outputCount: 1,
          totalPages: keep.length,
          detail: `Removed pages: ${Array.from(toRemove).sort((a, b) => a - b).join(', ')}`,
        });
      }

      // ============ RANGE ============
      else if (mode === 'range') {
        const n = Math.max(1, Math.min(rangeSize, total));
        const chunks = [];
        for (let i = 0; i < total; i += n) {
          chunks.push(
            Array.from({ length: Math.min(n, total - i) }, (_, k) => i + k)
          );
        }

        if (chunks.length === 1) {
          throw new Error(
            `Split size (${n}) is ≥ total pages (${total}). Choose a smaller size.`
          );
        }

        setProgress(`Creating ${chunks.length} PDFs…`);
        const outFiles = [];
        for (let i = 0; i < chunks.length; i++) {
          setProgress(`Creating part ${i + 1} of ${chunks.length}…`);
          const out = await PDFDocument.create();
          const copied = await out.copyPages(srcPdf, chunks[i]);
          copied.forEach((p) => out.addPage(p));
          const bytes = await out.save();
          outFiles.push({
            name: `${baseName}-part-${String(i + 1).padStart(2, '0')}.pdf`,
            bytes,
          });
        }

        // ZIP them
        setProgress('Building ZIP…');
        const zip = new JSZip();
        outFiles.forEach((f) => zip.file(f.name, f.bytes));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);

        setResult({
          url,
          size: zipBlob.size,
          filename: `${baseName}-split.zip`,
          isZip: true,
          outputCount: outFiles.length,
          totalPages: total,
          detail: `${outFiles.length} PDFs · every ${n} page${n === 1 ? '' : 's'}`,
        });
      }

      // ============ EVERY PAGE ============
      else if (mode === 'every') {
        if (total < 2)
          throw new Error('PDF has only 1 page. Nothing to split.');

        setProgress(`Splitting into ${total} PDFs…`);
        const outFiles = [];
        for (let i = 0; i < total; i++) {
          setProgress(`Creating page ${i + 1} of ${total}…`);
          const out = await PDFDocument.create();
          const [copied] = await out.copyPages(srcPdf, [i]);
          out.addPage(copied);
          const bytes = await out.save();
          outFiles.push({
            name: `${baseName}-page-${String(i + 1).padStart(3, '0')}.pdf`,
            bytes,
          });
        }

        setProgress('Building ZIP…');
        const zip = new JSZip();
        outFiles.forEach((f) => zip.file(f.name, f.bytes));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);

        setResult({
          url,
          size: zipBlob.size,
          filename: `${baseName}-pages.zip`,
          isZip: true,
          outputCount: outFiles.length,
          totalPages: total,
          detail: `${outFiles.length} single-page PDFs`,
        });
      }

      // ============ HALF ============
      else if (mode === 'half') {
        if (total < 2)
          throw new Error('PDF needs at least 2 pages to split.');

        const mid = Math.ceil(total / 2);
        const firstHalf = Array.from({ length: mid }, (_, i) => i);
        const secondHalf = Array.from(
          { length: total - mid },
          (_, i) => mid + i
        );

        setProgress('Creating 2 parts…');
        const outFiles = [];

        const p1 = await PDFDocument.create();
        const c1 = await p1.copyPages(srcPdf, firstHalf);
        c1.forEach((p) => p1.addPage(p));
        outFiles.push({
          name: `${baseName}-part-1.pdf`,
          bytes: await p1.save(),
        });

        const p2 = await PDFDocument.create();
        const c2 = await p2.copyPages(srcPdf, secondHalf);
        c2.forEach((p) => p2.addPage(p));
        outFiles.push({
          name: `${baseName}-part-2.pdf`,
          bytes: await p2.save(),
        });

        setProgress('Building ZIP…');
        const zip = new JSZip();
        outFiles.forEach((f) => zip.file(f.name, f.bytes));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);

        setResult({
          url,
          size: zipBlob.size,
          filename: `${baseName}-halves.zip`,
          isZip: true,
          outputCount: 2,
          totalPages: total,
          detail: `Part 1: pages 1-${mid} · Part 2: pages ${mid + 1}-${total}`,
        });
      }

      setProgress('');
    } catch (err) {
      console.error(err);
      setError('Split failed: ' + (err?.message || 'unknown error'));
      setProgress('');
    } finally {
      setProcessing(false);
    }
  };

  // Compute preview for current mode
  const preview = (() => {
    if (!file) return null;
    if (mode === 'extract') {
      const pages = parsePageRange(pageInput, pageCount);
      return {
        valid: pages.length > 0,
        text:
          pages.length > 0
            ? `Will extract ${pages.length} page${pages.length === 1 ? '' : 's'} → 1 PDF`
            : 'Enter page numbers (e.g. 1,3,5-8)',
      };
    }
    if (mode === 'remove') {
      const pages = parsePageRange(pageInput, pageCount);
      const remaining = pageCount - pages.length;
      if (pages.length === 0)
        return { valid: false, text: 'Enter pages to remove (e.g. 1,3,5-8)' };
      if (remaining <= 0)
        return { valid: false, text: '❌ Cannot remove all pages' };
      return {
        valid: true,
        text: `Will remove ${pages.length} page${pages.length === 1 ? '' : 's'}, keep ${remaining} → 1 PDF`,
      };
    }
    if (mode === 'range') {
      const n = Math.max(1, Math.min(rangeSize, pageCount));
      const count = Math.ceil(pageCount / n);
      if (count === 1)
        return { valid: false, text: `Split size ≥ total pages. Use smaller.` };
      return {
        valid: true,
        text: `Will create ${count} PDFs · every ${n} page${n === 1 ? '' : 's'}`,
      };
    }
    if (mode === 'every') {
      if (pageCount < 2)
        return { valid: false, text: 'PDF has only 1 page' };
      return { valid: true, text: `Will create ${pageCount} single-page PDFs` };
    }
    if (mode === 'half') {
      if (pageCount < 2)
        return { valid: false, text: 'PDF needs ≥ 2 pages' };
      const mid = Math.ceil(pageCount / 2);
      return {
        valid: true,
        text: `Will create 2 PDFs · Part 1: 1-${mid} · Part 2: ${mid + 1}-${pageCount}`,
      };
    }
    return null;
  })();

  const canSplit =
    file &&
    preview?.valid &&
    !processing &&
    (mode !== 'extract' && mode !== 'remove'
      ? true
      : pageInput.trim().length > 0);

  return (
    <ToolShell tool={tool}>
      <div className="pdf-tool">
        {/* Upload */}
        {!file ? (
          <div
            className="pdf-dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('dragging');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('dragging');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('dragging');
              const f = e.dataTransfer.files?.[0];
              if (f) handleFileChange({ target: { files: [f] } });
            }}
          >
            <div className="pdf-dropzone-icon">✂️</div>
            <h3>Drop your PDF here</h3>
            <p>or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          <div className="pdf-file-info">
            <div className="pdf-file-left">
              <span className="pdf-file-icon">📄</span>
              <div>
                <div className="pdf-file-name">{file.name}</div>
                <div className="pdf-file-size">
                  {formatBytes(file.size)} · {pageCount}{' '}
                  {pageCount === 1 ? 'page' : 'pages'}
                </div>
              </div>
            </div>
            <button className="pdf-file-remove" onClick={handleReset} title="Remove">
              ✕
            </button>
          </div>
        )}

        {/* Mode picker */}
        {file && !result && (
          <>
            <div className="pdf-target">
              <label className="pdf-target-label">Split mode</label>
              <div className="split-mode-grid">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    className={`split-mode-card ${
                      mode === m.id ? 'active' : ''
                    }`}
                    onClick={() => {
                      setMode(m.id);
                      setPageInput('');
                    }}
                  >
                    <span className="split-mode-icon">{m.icon}</span>
                    <span className="split-mode-name">{m.name}</span>
                    <span className="split-mode-desc">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode-specific inputs */}
            {(mode === 'extract' || mode === 'remove') && (
              <div className="pdf-target">
                <label className="pdf-target-label">
                  {mode === 'extract' ? 'Pages to extract' : 'Pages to remove'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1, 3, 5-8, 12"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  className="pdf-target-number"
                  style={{ width: '100%' }}
                  autoFocus
                />
                <p className="pdf-target-hint">
                  Comma separated · use <code>5-8</code> for a range · up to{' '}
                  <strong>{pageCount}</strong> pages
                </p>
              </div>
            )}

            {mode === 'range' && (
              <div className="pdf-target">
                <label className="pdf-target-label">Pages per PDF</label>
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, pageCount - 1)}
                  value={rangeSize}
                  onChange={(e) =>
                    setRangeSize(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="pdf-target-number"
                  style={{ width: '100%' }}
                />
                <p className="pdf-target-hint">
                  Every <strong>{rangeSize}</strong> page
                  {rangeSize === 1 ? '' : 's'} → new PDF
                </p>
              </div>
            )}

            {preview && (
              <div
                className={`split-preview ${
                  preview.valid ? 'valid' : 'invalid'
                }`}
              >
                <span className="split-preview-icon">
                  {preview.valid ? '✓' : '⚠'}
                </span>
                {preview.text}
              </div>
            )}

            <button
              className="pdf-compress-btn"
              onClick={split}
              disabled={!canSplit}
            >
              {processing
                ? '⟳ Splitting…'
                : `✂️ ${
                    MODES.find((m) => m.id === mode)?.name || 'Split'
                  }`}
            </button>
          </>
        )}

        {/* Progress */}
        {processing && progress && (
          <div className="pdf-progress">
            <span className="spinner" />
            {progress}
          </div>
        )}

        {/* Error */}
        {error && <div className="pdf-error">⚠️ {error}</div>}

        {/* Result */}
        {result && (
          <div className="pdf-result">
            <div className="pdf-result-header">
              <h3>
                ✅ Split complete
                {result.isZip && ' · ZIP ready'}
              </h3>
            </div>

            <div className="pdf-result-grid">
              <div className="pdf-stat">
                <div className="pdf-stat-label">Input</div>
                <div className="pdf-stat-value">{pageCount} pages</div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Output</div>
                <div className="pdf-stat-value accent">
                  {result.outputCount} PDF{result.outputCount === 1 ? '' : 's'}
                </div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Pages kept</div>
                <div className="pdf-stat-value">{result.totalPages}</div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Size</div>
                <div className="pdf-stat-value">
                  {formatBytes(result.size)}
                </div>
              </div>
            </div>

            {result.detail && (
              <p className="split-result-detail">{result.detail}</p>
            )}

            <div className="pdf-result-actions">
              <a
                href={result.url}
                download={result.filename}
                className="pdf-download"
              >
                ⬇ Download {result.isZip ? 'ZIP' : 'PDF'} (
                {formatBytes(result.size)})
              </a>
              <button className="btn-secondary" onClick={handleReset}>
                Try another PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}