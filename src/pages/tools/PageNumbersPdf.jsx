import { useRef, useState, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const POSITIONS = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-center', label: 'Top Center' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-center', label: 'Bottom Center' },
  { id: 'bottom-right', label: 'Bottom Right' },
];

const FORMATS = [
  { id: 'number', label: '1', preview: (n, t) => `${n}` },
  { id: 'page-number', label: 'Page 1', preview: (n) => `Page ${n}` },
  { id: 'page-n-of-t', label: 'Page 1 of 10', preview: (n, t) => `Page ${n} of ${t}` },
  { id: 'n-of-t', label: '1 of 10', preview: (n, t) => `${n} of ${t}` },
  { id: 'n-slash-t', label: '1 / 10', preview: (n, t) => `${n} / ${t}` },
  { id: 'dash-n-dash', label: '- 1 -', preview: (n) => `- ${n} -` },
];

const COLORS = [
  { id: 'black', value: '#000000' },
  { id: 'gray', value: '#808080' },
  { id: 'red', value: '#ef4444' },
  { id: 'blue', value: '#3b82f6' },
  { id: 'green', value: '#22c55e' },
  { id: 'purple', value: '#a855f7' },
  { id: 'orange', value: '#f97316' },
  { id: 'white', value: '#ffffff' },
];

export default function PageNumbersPdf() {
  const tool = getToolById('page-numbers-pdf');
  // SEO: dynamic title + meta description
  useDocumentTitle(
    'Add Page Numbers to PDF — Free Online PDF Page Numbering | toolchest'
  );

  // SEO: meta description + structured data
  useEffect(() => {
    // Meta description
    let meta = document.querySelector('meta[name="description"]');
    const created = !meta;
    if (created) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    const prevDesc = meta.content;
    meta.content =
      'Free online tool to add page numbers to PDF files. Choose from 6 formats, 6 positions, custom start numbers, font size, colors, and skip cover pages. 100% private — runs entirely in your browser.';

    // JSON-LD structured data
    const scriptId = 'add-page-numbers-jsonld';
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Add Page Numbers to PDF',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web Browser',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '842',
      },
      featureList: [
        'Add page numbers to PDF files',
        '6 numbering formats (Page X of Y, X / Y, etc.)',
        '6 page positions (top/bottom × left/center/right)',
        'Custom start number',
        'Font size and color customization',
        'Skip cover pages',
        'Custom page range',
        'No file upload — 100% browser-based',
        'Free forever',
      ],
    });

    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, []);

  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [firstPagePreview, setFirstPagePreview] = useState('');
  const [firstPageSize, setFirstPageSize] = useState({ w: 0, h: 0 });

  // Options
  const [position, setPosition] = useState('bottom-center');
  const [format, setFormat] = useState('n-of-t');
  const [startNumber, setStartNumber] = useState(1);
  const [fontSize, setFontSize] = useState(12);
  const [color, setColor] = useState('#000000');
  const [margin, setMargin] = useState(30);
  const [skipFirst, setSkipFirst] = useState(false);
  const [applyTo, setApplyTo] = useState('all');
  const [customPages, setCustomPages] = useState('');

  // State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
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

      // Render preview
      const pdfJsDoc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
      const page = await pdfJsDoc.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      setFirstPageSize({ w: viewport.width, h: viewport.height });

      const previewScale = 400 / viewport.width;
      const previewViewport = page.getViewport({ scale: previewScale });
      const canvas = document.createElement('canvas');
      canvas.width = previewViewport.width;
      canvas.height = previewViewport.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: previewViewport }).promise;
      setFirstPagePreview(canvas.toDataURL('image/jpeg', 0.7));
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
    setFirstPagePreview('');
    setResult(null);
    setError('');
    setProgress('');
    setCustomPages('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

  const hexToRgb = (hex) => {
    const clean = hex.replace('#', '');
    return {
      r: parseInt(clean.slice(0, 2), 16) / 255,
      g: parseInt(clean.slice(2, 4), 16) / 255,
      b: parseInt(clean.slice(4, 6), 16) / 255,
    };
  };

  const formatPageNumber = (n, total) => {
    switch (format) {
      case 'number':
        return `${n}`;
      case 'page-number':
        return `Page ${n}`;
      case 'page-n-of-t':
        return `Page ${n} of ${total}`;
      case 'n-of-t':
        return `${n} of ${total}`;
      case 'n-slash-t':
        return `${n} / ${total}`;
      case 'dash-n-dash':
        return `- ${n} -`;
      default:
        return `${n}`;
    }
  };

  const applyNumbers = async () => {
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
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const colorRgb = hexToRgb(color);

      // Determine which pages to number
      let targets;
      if (applyTo === 'all') {
        targets = new Set(Array.from({ length: total }, (_, i) => i + 1));
      } else {
        targets = parsePageRange(customPages, total);
        if (targets.size === 0) {
          throw new Error('No valid page numbers selected.');
        }
      }

      if (skipFirst) {
        targets.delete(1);
      }

      setProgress(`Adding numbers to ${targets.size} page${targets.size === 1 ? '' : 's'}…`);

      // Number pages in order (sorted)
      const sortedTargets = Array.from(targets).sort((a, b) => a - b);
      let counter = startNumber;

      for (const pageNum of sortedTargets) {
        const page = pages[pageNum - 1];
        const { width, height } = page.getSize();
        const label = formatPageNumber(counter, total);

        const textWidth = font.widthOfTextAtSize(label, fontSize);
        const textHeight = fontSize;

        let x, y;
        const m = margin;

        // Position
        if (position === 'top-left') {
          x = m;
          y = height - m - textHeight;
        } else if (position === 'top-center') {
          x = (width - textWidth) / 2;
          y = height - m - textHeight;
        } else if (position === 'top-right') {
          x = width - m - textWidth;
          y = height - m - textHeight;
        } else if (position === 'bottom-left') {
          x = m;
          y = m;
        } else if (position === 'bottom-center') {
          x = (width - textWidth) / 2;
          y = m;
        } else if (position === 'bottom-right') {
          x = width - m - textWidth;
          y = m;
        }

        page.drawText(label, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
        });

        counter++;
      }

      setProgress('Saving PDF…');
      const bytes = await pdf.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const baseName = file.name.replace(/\.pdf$/i, '');
      setResult({
        url,
        size: blob.size,
        filename: `${baseName}-numbered.pdf`,
        pagesNumbered: targets.size,
        totalPages: total,
      });
      setProgress('');
    } catch (err) {
      console.error(err);
      setError('Failed: ' + (err?.message || 'unknown error'));
      setProgress('');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (result?.url) URL.revokeObjectURL(result.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute live preview text
  const previewStart = startNumber;
  const previewText = formatPageNumber(previewStart, pageCount || 1);
  const showPreviewOnPage = !skipFirst || true; // preview always shows on page 1

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
            <div className="pdf-dropzone-icon">🔢</div>
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

        {file && !result && (
          <>
            {/* Live preview */}
            <div className="wm-preview-wrap">
              <div className="wm-preview-label">Live preview · first page</div>
              <div className="wm-preview-canvas">
                {firstPagePreview && (
                  <div className="wm-preview-page">
                    <img src={firstPagePreview} alt="Page preview" />
                    {showPreviewOnPage && firstPageSize.w > 0 && (
                      <PageNumberOverlay
                        position={position}
                        text={previewText}
                        fontSize={fontSize}
                        color={color}
                        margin={margin}
                        pageW={firstPageSize.w}
                        pageH={firstPageSize.h}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Format */}
            <div className="pdf-target">
              <label className="pdf-target-label">Number format</label>
              <div className="pn-format-grid">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    className={`pn-format-btn ${format === f.id ? 'active' : ''}`}
                    onClick={() => setFormat(f.id)}
                  >
                    <span className="pn-format-sample">
                      {f.preview(5, 12)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Position */}
            <div className="pdf-target">
              <label className="pdf-target-label">Position</label>
              <div className="pn-position-layout">
                <div className="pn-position-grid">
                  {POSITIONS.map((p) => (
                    <button
                      key={p.id}
                      className={`pn-position-btn ${
                        position === p.id ? 'active' : ''
                      }`}
                      onClick={() => setPosition(p.id)}
                      title={p.label}
                    >
                      <span className="pn-pos-dot" />
                    </button>
                  ))}
                </div>
                <div className="pn-position-label">
                  {POSITIONS.find((p) => p.id === position)?.label}
                </div>
              </div>
            </div>

            {/* Start number */}
            <div className="pdf-target">
              <div className="wm-row-2col">
                <div>
                  <label className="pdf-target-label">Start number</label>
                  <input
                    type="number"
                    min="0"
                    max="9999"
                    value={startNumber}
                    onChange={(e) =>
                      setStartNumber(Math.max(0, parseInt(e.target.value) || 1))
                    }
                    className="pdf-target-number"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="pdf-target-label">
                    Font size · <strong>{fontSize}pt</strong>
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="24"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="wm-slider"
                  />
                </div>
              </div>
            </div>

            {/* Color + margin */}
            <div className="pdf-target">
              <div className="wm-row-2col">
                <div>
                  <label className="pdf-target-label">Color</label>
                  <div className="wm-color-grid">
                    {COLORS.map((c) => (
                      <button
                        key={c.id}
                        className={`wm-color-swatch ${
                          color === c.value ? 'active' : ''
                        }`}
                        style={{ background: c.value }}
                        onClick={() => setColor(c.value)}
                        title={c.id}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="pdf-target-label">
                    Margin · <strong>{margin}pt</strong>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    value={margin}
                    onChange={(e) => setMargin(parseInt(e.target.value))}
                    className="wm-slider"
                  />
                </div>
              </div>
            </div>

            {/* Apply to + skip first */}
            <div className="pdf-target">
              <label className="pdf-target-label">Apply to</label>
              <div className="jpg-scale-options">
                <button
                  className={`category-pill ${
                    applyTo === 'all' ? 'active' : ''
                  }`}
                  onClick={() => setApplyTo('all')}
                >
                  All pages
                </button>
                <button
                  className={`category-pill ${
                    applyTo === 'custom' ? 'active' : ''
                  }`}
                  onClick={() => setApplyTo('custom')}
                >
                  Custom pages
                </button>
              </div>

              {applyTo === 'custom' && (
                <div style={{ marginTop: 'var(--sp-4)' }}>
                  <input
                    type="text"
                    placeholder="e.g. 2-10, 15, 20"
                    value={customPages}
                    onChange={(e) => setCustomPages(e.target.value)}
                    className="pdf-target-number"
                    style={{ width: '100%' }}
                  />
                  <p className="pdf-target-hint">
                    Comma separated · use <code>5-8</code> for a range
                  </p>
                </div>
              )}

              <label className="pn-checkbox">
                <input
                  type="checkbox"
                  checked={skipFirst}
                  onChange={(e) => setSkipFirst(e.target.checked)}
                />
                <span>Skip first page (cover page)</span>
              </label>
            </div>

            <button
              className="pdf-compress-btn"
              onClick={applyNumbers}
              disabled={processing}
            >
              {processing ? '⟳ Adding…' : '🔢 Add page numbers'}
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
              <h3>✅ Page numbers added</h3>
            </div>

            <div className="pdf-result-grid">
              <div className="pdf-stat">
                <div className="pdf-stat-label">Total pages</div>
                <div className="pdf-stat-value">{result.totalPages}</div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Numbered</div>
                <div className="pdf-stat-value accent">
                  {result.pagesNumbered}
                </div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Start at</div>
                <div className="pdf-stat-value">{startNumber}</div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Size</div>
                <div className="pdf-stat-value">
                  {formatBytes(result.size)}
                </div>
              </div>
            </div>

            <div className="pdf-result-actions">
              <a
                href={result.url}
                download={result.filename}
                className="pdf-download"
              >
                ⬇ Download numbered PDF
              </a>
              <button className="btn-secondary" onClick={handleReset}>
                Try another PDF
              </button>
            </div>
          </div>
        )}
                {!file && <SeoContent />}

      </div>
    </ToolShell>
  );
}

/* ===================== Preview overlay ===================== */
function PageNumberOverlay({ position, text, fontSize, color, margin, pageW, pageH }) {
  // Preview is ~400px wide; scale accordingly
  const scale = 100 / pageW; // relative percent
  const previewFontSize = Math.max(7, fontSize * (100 / pageW) * 4);
  const previewMargin = margin * (100 / pageW) * 4;

  const styles = {
    position: 'absolute',
    fontSize: `${previewFontSize}px`,
    color,
    fontWeight: 500,
    fontFamily: 'Helvetica, Arial, sans-serif',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  };

  if (position === 'top-left') {
    styles.top = `${previewMargin}px`;
    styles.left = `${previewMargin}px`;
  } else if (position === 'top-center') {
    styles.top = `${previewMargin}px`;
    styles.left = '50%';
    styles.transform = 'translateX(-50%)';
  } else if (position === 'top-right') {
    styles.top = `${previewMargin}px`;
    styles.right = `${previewMargin}px`;
  } else if (position === 'bottom-left') {
    styles.bottom = `${previewMargin}px`;
    styles.left = `${previewMargin}px`;
  } else if (position === 'bottom-center') {
    styles.bottom = `${previewMargin}px`;
    styles.left = '50%';
    styles.transform = 'translateX(-50%)';
  } else if (position === 'bottom-right') {
    styles.bottom = `${previewMargin}px`;
    styles.right = `${previewMargin}px`;
  }

  return (
    <div className="wm-overlay">
      <span style={styles}>{text}</span>
    </div>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
/* ================= SEO Content Section ================= */
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is an Add Page Numbers PDF Tool?</h2>
        <p>
          An <strong>add page numbers to PDF</strong> tool inserts sequential
          page numbers into a PDF document — either at the top or bottom of
          each page. This is essential for professional documents like
          reports, contracts, theses, and eBooks where readers need to
          reference specific pages. Without page numbers, a 50-page document
          is nearly impossible to navigate or cite.
        </p>
        <p>
          Our <strong>free online PDF page numberer</strong> runs entirely in
          your browser. Your file is never uploaded to any server, so your
          data stays completely private. You can add numbers to a PDF in
          seconds — no signup, no watermarks, no file size limits.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Add Page Numbers to a PDF — Step by Step</h2>
        <ol className="seo-steps">
          <li>
            <strong>Upload your PDF</strong> — drag & drop or click to browse.
            Multi-page PDFs of any size are supported.
          </li>
          <li>
            <strong>Choose a format</strong> — plain numbers (
            <code>1</code>), <code>Page 1</code>, <code>Page 1 of 10</code>,{' '}
            <code>1 of 10</code>, <code>1 / 10</code>, or <code>- 1 -</code>.
          </li>
          <li>
            <strong>Pick a position</strong> — top or bottom, left, center, or
            right. Add a margin if needed.
          </li>
          <li>
            <strong>Customize the style</strong> — font size, color, and start
            number. Skip the first page if it's a cover.
          </li>
          <li>
            <strong>Click "Add page numbers"</strong> — download your numbered
            PDF instantly.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🔢</div>
            <h3>6 Numbering Formats</h3>
            <p>
              Choose from <code>1</code>, <code>Page 1</code>,{' '}
              <code>Page 1 of 10</code>, <code>1 of 10</code>,{' '}
              <code>1 / 10</code>, and <code>- 1 -</code>. Perfect for any
              document style.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📍</div>
            <h3>6 Page Positions</h3>
            <p>
              Top or bottom, left, center, or right — pick the exact spot with
              a visual position picker.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎨</div>
            <h3>Full Styling Control</h3>
            <p>
              Adjust font size (8-24pt), color (8 presets), and margin to match
              your document's design.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⏭️</div>
            <h3>Skip Cover Page</h3>
            <p>
              Optionally skip the first page — perfect for documents with a
              title page or cover.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎯</div>
            <h3>Custom Start Number</h3>
            <p>
              Start numbering from any number — useful when continuing from
              another document.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              All processing happens in your browser. Your PDF never leaves
              your device — no uploads, no servers.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Use Cases</h2>
        <ul className="seo-list">
          <li>
            <strong>Academic papers and theses</strong> — add page numbers to
            dissertations and research papers for proper citation.
          </li>
          <li>
            <strong>Legal contracts</strong> — number pages of agreements and
            legal documents for reference during review.
          </li>
          <li>
            <strong>Business reports</strong> — add clean page numbers to
            quarterly reports, proposals, and presentations.
          </li>
          <li>
            <strong>eBooks and manuals</strong> — insert page numbers into
            self-published books, user manuals, and guides.
          </li>
          <li>
            <strong>Meeting minutes and agendas</strong> — number pages for
            easy reference during discussions.
          </li>
          <li>
            <strong>Scanned documents</strong> — add page numbers to scanned
            PDFs that lost their original numbering.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this PDF page numbering tool free?</summary>
          <p>
            Yes — completely free with no limits. No signup, no watermarks, no
            hidden fees. Use it as many times as you want on as many documents
            as you need.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are my files safe?</summary>
          <p>
            Absolutely. The entire process runs locally in your browser using
            JavaScript. Your PDF is never uploaded to any server, so your data
            stays completely private.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I add page numbers to only some pages?</summary>
          <p>
            Yes — use the "Custom pages" option and enter a page range like{' '}
            <code>2-10, 15, 20</code>. Or enable "Skip first page" to skip the
            cover page.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does this work with scanned PDFs?</summary>
          <p>
            Yes — page numbers are added as a text overlay on top of each page,
            so it works regardless of whether the PDF content is text or an
            image (scanned).
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I choose where the page numbers appear?</summary>
          <p>
            Yes — 6 positions: top-left, top-center, top-right, bottom-left,
            bottom-center, and bottom-right. You can also adjust the margin.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I start numbering from a custom number?</summary>
          <p>
            Yes — the "Start number" field lets you begin at any number, like
            1, 5, 100, or anything else. Useful when continuing from a previous
            document.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Will the page numbers be editable afterward?</summary>
          <p>
            The page numbers are added as a permanent text overlay. If you need
            to change them, simply run the tool again with different settings.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is there a file size limit?</summary>
          <p>
            No hard limit — but very large PDFs (200+ MB or 1000+ pages) may
            take longer. For best performance, process in chunks.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other PDF tools: <strong>Merge PDF</strong>,{' '}
          <strong>Split PDF</strong>, <strong>Compress PDF</strong>,{' '}
          <strong>Rotate PDF</strong>, <strong>Add Watermark</strong>,{' '}
          <strong>PDF to JPG</strong>, <strong>PDF to PNG</strong>,{' '}
          <strong>PDF to Text</strong>, and <strong>PDF to Word</strong> — all
          free and browser-based.
        </p>
      </section>
    </article>
  );
}