import { useRef, useState } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';

export default function RotatePdf() {
  const tool = getToolById('rotate-pdf');

  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [rotation, setRotation] = useState(90); // default 90
  const [applyTo, setApplyTo] = useState('all'); // 'all' | 'custom'
  const [customPages, setCustomPages] = useState(''); // "1,3,5-8"
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null); // { url, size, filename, pagesRotated }
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

    // Get page count
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
    setRotation(90);
    setApplyTo('all');
    setCustomPages('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /** Parse "1,3,5-8" into a Set of 1-based page numbers */
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
    return set;
  };

  const rotate = async () => {
    if (!file || processing) return;
    setProcessing(true);
    setError('');
    setProgress('Loading PDF…');
    setResult(null);

    try {
      const buf = await file.arrayBuffer();
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = pdf.getPages();
      const total = pages.length;

      let targets;
      if (applyTo === 'all') {
        targets = new Set(Array.from({ length: total }, (_, i) => i + 1));
      } else {
        targets = parsePageRange(customPages, total);
        if (targets.size === 0) {
          throw new Error(
            'No valid page numbers in "' + customPages + '". Try e.g. 1,3,5-8'
          );
        }
      }

      setProgress(`Rotating ${targets.size} page${targets.size === 1 ? '' : 's'}…`);

      for (let i = 0; i < total; i++) {
        const pageNum = i + 1;
        if (!targets.has(pageNum)) continue;
        const page = pages[i];
        const current = page.getRotation().angle || 0;
        const next = (current + rotation) % 360;
        page.setRotation(degrees(next));
      }

      setProgress('Saving…');
      const bytes = await pdf.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const baseName = file.name.replace(/\.pdf$/i, '');
      setResult({
        url,
        size: blob.size,
        filename: `${baseName}-rotated.pdf`,
        pagesRotated: targets.size,
        totalPages: total,
      });
      setProgress('');
    } catch (err) {
      console.error(err);
      setError('Rotation failed: ' + (err?.message || 'unknown error'));
      setProgress('');
    } finally {
      setProcessing(false);
    }
  };

  const targetPagesCount =
    applyTo === 'all'
      ? pageCount
      : parsePageRange(customPages, pageCount).size;

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
            <div className="pdf-dropzone-icon">🔄</div>
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

        {/* Options */}
        {file && !result && (
          <>
            <div className="pdf-target">
              <label className="pdf-target-label">Rotation angle</label>
              <div className="rotate-angle-row">
                {[90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    className={`rotate-angle-btn ${rotation === deg ? 'active' : ''}`}
                    onClick={() => setRotation(deg)}
                  >
                    <span className="rotate-angle-arrow">
                      {deg === 90 ? '↻' : deg === 180 ? '⟳' : '↺'}
                    </span>
                    <span className="rotate-angle-label">{deg}°</span>
                  </button>
                ))}
              </div>

              <label
                className="pdf-target-label"
                style={{ marginTop: 'var(--sp-5)' }}
              >
                Apply to
              </label>
              <div className="jpg-scale-options">
                <button
                  className={`category-pill ${applyTo === 'all' ? 'active' : ''}`}
                  onClick={() => setApplyTo('all')}
                >
                  All pages
                </button>
                <button
                  className={`category-pill ${applyTo === 'custom' ? 'active' : ''}`}
                  onClick={() => setApplyTo('custom')}
                >
                  Custom pages
                </button>
              </div>

              {applyTo === 'custom' && (
                <div style={{ marginTop: 'var(--sp-4)' }}>
                  <input
                    type="text"
                    placeholder="e.g. 1, 3, 5-8"
                    value={customPages}
                    onChange={(e) => setCustomPages(e.target.value)}
                    className="pdf-target-number"
                    style={{ width: '100%' }}
                  />
                  <p className="pdf-target-hint">
                    Comma separated · use <code>5-8</code> for a range.
                    {customPages && (
                      <>
                        {' '}
                        → <strong>{targetPagesCount}</strong> page
                        {targetPagesCount === 1 ? '' : 's'} selected
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>

            <button
              className="pdf-compress-btn"
              onClick={rotate}
              disabled={processing || targetPagesCount === 0}
            >
              {processing
                ? '⟳ Rotating…'
                : `🔄 Rotate ${applyTo === 'all' ? 'all' : targetPagesCount} page${
                    targetPagesCount === 1 ? '' : 's'
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
              <h3>✅ PDF rotated</h3>
            </div>

            <div className="pdf-result-grid">
              <div className="pdf-stat">
                <div className="pdf-stat-label">Total pages</div>
                <div className="pdf-stat-value">{result.totalPages}</div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Rotated</div>
                <div className="pdf-stat-value accent">
                  {result.pagesRotated}
                </div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Angle</div>
                <div className="pdf-stat-value">{rotation}°</div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Size</div>
                <div className="pdf-stat-value">{formatBytes(result.size)}</div>
              </div>
            </div>

            <div className="pdf-result-actions">
              <a
                href={result.url}
                download={result.filename}
                className="pdf-download"
              >
                ⬇ Download rotated PDF
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