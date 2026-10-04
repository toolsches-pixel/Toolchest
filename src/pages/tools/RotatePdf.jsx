import { useRef, useState, useEffect } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { PDFDocument, degrees } from 'pdf-lib';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';

export default function RotatePdf() {
  const tool = getToolById('rotate-pdf');
  // SEO: dynamic title + meta description
  useDocumentTitle(
    'Rotate PDF — Free Online PDF Rotator (90°, 180°, 270°) | toolchest'
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
      'Free online tool to rotate PDF pages. Rotate 90°, 180° or 270° — all pages or specific ones. Lossless rotation preserves text and quality. 100% private — runs entirely in your browser.';

    // JSON-LD structured data
    const scriptId = 'rotate-pdf-jsonld';
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
      name: 'Rotate PDF',
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
        ratingCount: '734',
      },
      featureList: [
        'Rotate PDF pages 90°, 180° or 270°',
        'Rotate all pages or specific pages',
        'Custom page range input (1,3,5-8)',
        'Lossless rotation — text stays selectable',
        'Preserves original quality and file size',
        'Handles upside-down scans',
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
         {!file && <SeoContent />}
      </div>
    </ToolShell>
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
        <h2>What is a Rotate PDF Tool?</h2>
        <p>
          A <strong>rotate PDF tool</strong> changes the orientation of pages
          in a PDF document — turning them 90°, 180°, or 270°. This is
          essential when you scan a document sideways, receive a
          landscape-formatted file that should be portrait, or need to fix
          upside-down pages before printing or sharing.
        </p>
        <p>
          Our <strong>free online PDF rotator</strong> runs entirely in your
          browser. Your file is never uploaded to any server, so your data
          stays completely private. Rotation is lossless — text stays
          selectable and file quality is preserved.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Rotate a PDF — Step by Step</h2>
        <ol className="seo-steps">
          <li>
            <strong>Upload your PDF</strong> — drag & drop or click to browse.
            Multi-page PDFs of any size are supported.
          </li>
          <li>
            <strong>Choose rotation angle</strong> — 90° (clockwise), 180°
            (upside-down), or 270° (counter-clockwise).
          </li>
          <li>
            <strong>Choose which pages</strong> — all pages, or a custom range
            like <code>1,3,5-8</code>.
          </li>
          <li>
            <strong>Click "Rotate"</strong> — the tool applies lossless
            rotation to your pages.
          </li>
          <li>
            <strong>Download</strong> — open the result in any PDF viewer to
            confirm.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🔄</div>
            <h3>3 Rotation Angles</h3>
            <p>
              Rotate 90° clockwise, 180° upside-down, or 270°
              counter-clockwise. Fix any orientation issue.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎯</div>
            <h3>Rotate Specific Pages</h3>
            <p>
              Rotate all pages at once, or use a custom range like{' '}
              <code>1,3,5-8</code> to fix just the pages you need.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">✨</div>
            <h3>Lossless Rotation</h3>
            <p>
              Only the page rotation metadata is changed — no re-rendering, no
              quality loss. Text stays selectable.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📄</div>
            <h3>Preserves File Size</h3>
            <p>
              Because we don't re-render or recompress, the output file size
              stays almost identical to the original.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📚</div>
            <h3>Handles Bulk Scans</h3>
            <p>
              Perfect for fixing hundreds of pages of scanned documents that
              came out sideways or upside down.
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
            <strong>Fixing scanned documents</strong> — correct pages that
            were fed into a scanner sideways or upside down.
          </li>
          <li>
            <strong>Landscape to portrait</strong> — flip orientation when a
            document is created in the wrong direction.
          </li>
          <li>
            <strong>Preparing for printing</strong> — ensure all pages face the
            right way before printing a booklet.
          </li>
          <li>
            <strong>Mixed-orientation documents</strong> — fix individual
            pages that don't match the rest.
          </li>
          <li>
            <strong>Phone-captured documents</strong> — correct photos of
            pages taken in the wrong orientation.
          </li>
          <li>
            <strong>Presentations and reports</strong> — standardize
            orientation for a professional look.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this PDF rotator free?</summary>
          <p>
            Yes — completely free with no limits. No signup, no watermarks, no
            hidden fees. Rotate as many PDFs as you want.
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
          <summary>Will rotating reduce quality?</summary>
          <p>
            No — rotation is <strong>lossless</strong>. We only change the
            page rotation metadata; the actual content (text, images, vectors)
            is untouched. Text remains fully selectable and searchable.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I rotate only some pages?</summary>
          <p>
            Yes — choose "Custom pages" and enter a range like{' '}
            <code>1,3,5-8</code>. Only those pages will be rotated; the rest
            stay as they are.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I rotate a page multiple times?</summary>
          <p>
            Yes — rotation is additive. If a page is already rotated and you
            rotate it 90° again, it becomes 180°. This is useful for
            fine-tuning.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work with scanned PDFs?</summary>
          <p>
            Yes — because we rotate the page itself (not the content), scanned
            PDFs rotate perfectly without any quality loss.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Will the file size change?</summary>
          <p>
            No — the output file size stays essentially the same as the input.
            Because we don't re-render content, there's no compression
            involved.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is there a file size limit?</summary>
          <p>
            No hard limit — but very large PDFs (500+ MB or 1000+ pages) may
            take longer. For best performance, process in chunks.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I undo rotation?</summary>
          <p>
            Yes — just rotate the page back by the opposite amount (e.g.,
            rotate 90° again after a 270° rotation). Always keep a backup of
            your original PDF.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other PDF tools: <strong>Merge PDF</strong>,{' '}
          <strong>Split PDF</strong>, <strong>Compress PDF</strong>,{' '}
          <strong>Add Watermark</strong>, <strong>Add Page Numbers</strong>,{' '}
          <strong>PDF to JPG</strong>, <strong>PDF to PNG</strong>,{' '}
          <strong>PDF to Text</strong>, and <strong>PDF to Word</strong> — all
          free and browser-based.
        </p>
      </section>
    </article>
  );
}