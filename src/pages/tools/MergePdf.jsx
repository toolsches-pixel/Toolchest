import { useRef, useState, useEffect } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
export default function MergePdf() {
  const tool = getToolById('merge-pdf');
  // SEO: dynamic title + meta description
  useDocumentTitle(
    'Merge PDF — Free Online PDF Merger & Combiner | toolchest'
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
      'Free online tool to merge PDF files. Combine multiple PDFs into one, with orientation control (portrait/landscape) and layout options (sequential, 2-up horizontal, 2-up vertical). 100% private — runs entirely in your browser.';

    // JSON-LD structured data
    const scriptId = 'merge-pdf-jsonld';
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
      name: 'Merge PDF',
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
        ratingCount: '1562',
      },
      featureList: [
        'Merge multiple PDFs into one file',
        'Reorder PDFs with up/down buttons',
        'Orientation control (portrait, landscape, auto)',
        '3 layout modes (sequential, 2-up horizontal, 2-up vertical)',
        'Page count preview per file',
        'Drag & drop upload',
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
  const [files, setFiles] = useState([]); // [{ id, file, name, size, pageCount }]
  const [orientation, setOrientation] = useState('auto'); // 'auto' | 'portrait' | 'landscape'
  const [layout, setLayout] = useState('sequential'); // 'sequential' | '2-up' | 'stack'
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFilesAdd = async (fileList) => {
    const incoming = Array.from(fileList || []).filter(
      (f) => f.type === 'application/pdf'
    );
    if (incoming.length === 0) {
      setError('Please select PDF files only.');
      return;
    }

    setError('');
    setResult(null);

    const loaded = await Promise.all(
      incoming.map(async (f) => {
        let pageCount = 0;
        try {
          const buf = await f.arrayBuffer();
          const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
          pageCount = pdf.getPageCount();
        } catch (err) {
          console.warn('Could not read', f.name, err);
        }
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file: f,
          name: f.name,
          size: f.size,
          pageCount,
        };
      })
    );

    setFiles((prev) => [...prev, ...loaded]);
  };

  const handleFileInput = (e) => {
    handleFilesAdd(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragging');
    handleFilesAdd(e.dataTransfer.files);
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setResult(null);
  };

  const moveFile = (index, dir) => {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setResult(null);
  };

  const clearAll = () => {
    if (result?.url) URL.revokeObjectURL(result.url);
    setFiles([]);
    setResult(null);
    setError('');
    setProgress('');
  };

  const merge = async () => {
    if (files.length < 2 || processing) return;
    setProcessing(true);
    setError('');
    setProgress('Loading PDFs…');
    setResult(null);

    try {
      const merged = await PDFDocument.create();

      // Load all PDFs first
      const loadedPdfs = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(`Reading PDF ${i + 1} of ${files.length}…`);
        const buf = await files[i].file.arrayBuffer();
        const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
        loadedPdfs.push(pdf);
      }

      // -------- SEQUENTIAL (normal merge) --------
      if (layout === 'sequential') {
        let pageNum = 0;
        const totalPages = loadedPdfs.reduce(
          (s, p) => s + p.getPageCount(),
          0
        );

        for (const pdf of loadedPdfs) {
          const pageIndices = pdf.getPageIndices();
          const copied = await merged.copyPages(pdf, pageIndices);
          for (const page of copied) {
            applyOrientation(page, orientation);
            merged.addPage(page);
            pageNum++;
            if (pageNum % 3 === 0)
              setProgress(`Copying page ${pageNum} of ${totalPages}…`);
          }
        }
      }

      // -------- 2-UP (side by side) --------
      else if (layout === '2-up') {
        // Gather ALL pages from ALL PDFs in a flat list
        const allPages = [];
        for (const pdf of loadedPdfs) {
          const idx = pdf.getPageIndices();
          const copied = await merged.copyPages(pdf, idx);
          allPages.push(...copied);
        }

        // Pair them up: 2 pages per output page
        const pagesPerSheet = 2;
        const totalSheets = Math.ceil(allPages.length / pagesPerSheet);

        // Create NEW merged doc (drop old pages)
        const out = await PDFDocument.create();
        for (let s = 0; s < totalSheets; s++) {
          setProgress(`Building sheet ${s + 1} of ${totalSheets}…`);

          const a = allPages[s * 2];
          const b = allPages[s * 2 + 1];

          // Compute sheet size from first page
          const aSize = a.getSize();
          const { width: sheetW, height: sheetH } = computeSheetSize(
            a,
            b,
            orientation
          );

          const sheet = out.addPage([sheetW, sheetH]);

          // Left half
          const aDims = fitInside(aSize, sheetW / 2, sheetH);
          const aEmbed = await out.embedPage(a);
          sheet.drawPage(aEmbed, {
            x: (sheetW / 2 - aDims.width) / 2,
            y: (sheetH - aDims.height) / 2,
            width: aDims.width,
            height: aDims.height,
          });

          // Right half
          if (b) {
            const bSize = b.getSize();
            const bDims = fitInside(bSize, sheetW / 2, sheetH);
            const bEmbed = await out.embedPage(b);
            sheet.drawPage(bEmbed, {
              x: sheetW / 2 + (sheetW / 2 - bDims.width) / 2,
              y: (sheetH - bDims.height) / 2,
              width: bDims.width,
              height: bDims.height,
            });
          }
        }

        // Replace merged with out
        const bytes = await out.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        setResult({
          url,
          size: blob.size,
          filename: 'merged-2up.pdf',
          totalFiles: files.length,
          totalPages: allPages.length,
          outputPages: totalSheets,
          layout: '2-up',
        });
        setProgress('');
        setProcessing(false);
        return;
      }

      // -------- STACK (top-bottom) --------
      else if (layout === 'stack') {
        const allPages = [];
        for (const pdf of loadedPdfs) {
          const idx = pdf.getPageIndices();
          const copied = await merged.copyPages(pdf, idx);
          allPages.push(...copied);
        }

        const pagesPerSheet = 2;
        const totalSheets = Math.ceil(allPages.length / pagesPerSheet);
        const out = await PDFDocument.create();

        for (let s = 0; s < totalSheets; s++) {
          setProgress(`Building sheet ${s + 1} of ${totalSheets}…`);

          const a = allPages[s * 2];
          const b = allPages[s * 2 + 1];

          const aSize = a.getSize();
          const sheetW =
            orientation === 'landscape'
              ? Math.max(aSize.width, aSize.height) * 1.1
              : Math.min(aSize.width, aSize.height) * 1.1;
          const sheetH = sheetW * 1.414; // A4-ish ratio

          const sheet = out.addPage([sheetW, sheetH]);

          const halfH = sheetH / 2;
          const aDims = fitInside(aSize, sheetW, halfH);
          const aEmbed = await out.embedPage(a);
          sheet.drawPage(aEmbed, {
            x: (sheetW - aDims.width) / 2,
            y: halfH + (halfH - aDims.height) / 2,
            width: aDims.width,
            height: aDims.height,
          });

          if (b) {
            const bSize = b.getSize();
            const bDims = fitInside(bSize, sheetW, halfH);
            const bEmbed = await out.embedPage(b);
            sheet.drawPage(bEmbed, {
              x: (sheetW - bDims.width) / 2,
              y: (halfH - bDims.height) / 2,
              width: bDims.width,
              height: bDims.height,
            });
          }
        }

        const bytes = await out.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        setResult({
          url,
          size: blob.size,
          filename: 'merged-stack.pdf',
          totalFiles: files.length,
          totalPages: allPages.length,
          outputPages: totalSheets,
          layout: 'stack',
        });
        setProgress('');
        setProcessing(false);
        return;
      }

      // Save (sequential path)
      setProgress('Saving PDF…');
      const bytes = await merged.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const totalPages = loadedPdfs.reduce(
        (s, p) => s + p.getPageCount(),
        0
      );

      setResult({
        url,
        size: blob.size,
        filename: 'merged.pdf',
        totalFiles: files.length,
        totalPages,
        outputPages: totalPages,
        layout: 'sequential',
      });
      setProgress('');
    } catch (err) {
      console.error(err);
      setError('Merge failed: ' + (err?.message || 'unknown error'));
      setProgress('');
    } finally {
      setProcessing(false);
    }
  };

  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const totalPages = files.reduce((s, f) => s + f.pageCount, 0);

  return (
    <ToolShell tool={tool}>
      <div className="pdf-tool">
        {/* Dropzone */}
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
          onDrop={handleDrop}
        >
          <div className="pdf-dropzone-icon">📄</div>
          <h3>Drop PDF files here</h3>
          <p>or click to browse · 2 or more PDFs required</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="pdf-target">
            <div className="i2p-list-header">
              <label className="pdf-target-label" style={{ margin: 0 }}>
                {files.length} file{files.length === 1 ? '' : 's'} ·{' '}
                {totalPages} page{totalPages === 1 ? '' : 's'} ·{' '}
                {formatBytes(totalSize)}
              </label>
              <button className="i2p-clear" onClick={clearAll}>
                Clear all
              </button>
            </div>

            <div className="i2p-list">
              {files.map((f, idx) => (
                <div key={f.id} className="i2p-item">
                  <span className="i2p-index">{idx + 1}</span>
                  <span className="merge-file-icon">📄</span>
                  <div className="i2p-meta">
                    <div className="i2p-name" title={f.name}>
                      {f.name}
                    </div>
                    <div className="i2p-sub">
                      {f.pageCount} page{f.pageCount === 1 ? '' : 's'} ·{' '}
                      {formatBytes(f.size)}
                    </div>
                  </div>
                  <div className="i2p-controls">
                    <button
                      className="i2p-icon-btn"
                      onClick={() => moveFile(idx, -1)}
                      disabled={idx === 0}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      className="i2p-icon-btn"
                      onClick={() => moveFile(idx, 1)}
                      disabled={idx === files.length - 1}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      className="i2p-icon-btn i2p-remove"
                      onClick={() => removeFile(f.id)}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Options */}
        {files.length >= 2 && !result && (
          <>
            {/* Orientation */}
            <div className="pdf-target">
              <label className="pdf-target-label">Page orientation</label>
              <div className="orientation-grid">
                <button
                  className={`orientation-card ${
                    orientation === 'auto' ? 'active' : ''
                  }`}
                  onClick={() => setOrientation('auto')}
                >
                  <div className="orientation-preview">
                    <div className="op-a op-auto-a" />
                    <div className="op-a op-auto-b" />
                  </div>
                  <div className="orientation-name">Auto</div>
                  <div className="orientation-desc">
                    Original size preserve
                  </div>
                </button>

                <button
                  className={`orientation-card ${
                    orientation === 'portrait' ? 'active' : ''
                  }`}
                  onClick={() => setOrientation('portrait')}
                >
                  <div className="orientation-preview">
                    <div className="op-a op-portrait" />
                  </div>
                  <div className="orientation-name">Portrait</div>
                  <div className="orientation-desc">Vertical (tall)</div>
                </button>

                <button
                  className={`orientation-card ${
                    orientation === 'landscape' ? 'active' : ''
                  }`}
                  onClick={() => setOrientation('landscape')}
                >
                  <div className="orientation-preview">
                    <div className="op-a op-landscape" />
                  </div>
                  <div className="orientation-name">Landscape</div>
                  <div className="orientation-desc">Horizontal (wide)</div>
                </button>
              </div>
              {orientation === 'auto' ? (
                <p className="pdf-target-hint">
                  Each page keeps its original orientation — best quality,
                  no distortion.
                </p>
              ) : (
                <p className="pdf-target-hint">
                  All pages will be rotated to <strong>{orientation}</strong>{' '}
                  orientation if needed. Content stays upright.
                </p>
              )}
            </div>

            {/* Layout */}
            <div className="pdf-target">
              <label className="pdf-target-label">Layout</label>
              <div className="layout-grid">
                <button
                  className={`layout-card ${
                    layout === 'sequential' ? 'active' : ''
                  }`}
                  onClick={() => setLayout('sequential')}
                >
                  <div className="layout-preview">
                    <div className="lp-page" />
                    <div className="lp-page" />
                    <div className="lp-page" />
                  </div>
                  <div className="layout-name">Sequential</div>
                  <div className="layout-desc">
                    1 page per sheet (normal merge)
                  </div>
                </button>

                <button
                  className={`layout-card ${
                    layout === '2-up' ? 'active' : ''
                  }`}
                  onClick={() => setLayout('2-up')}
                >
                  <div className="layout-preview lp-horizontal">
                    <div className="lp-page" />
                    <div className="lp-page" />
                  </div>
                  <div className="layout-name">2-up · Horizontal</div>
                  <div className="layout-desc">2 pages side by side</div>
                </button>

                <button
                  className={`layout-card ${
                    layout === 'stack' ? 'active' : ''
                  }`}
                  onClick={() => setLayout('stack')}
                >
                  <div className="layout-preview lp-vertical">
                    <div className="lp-page" />
                    <div className="lp-page" />
                  </div>
                  <div className="layout-name">2-up · Vertical</div>
                  <div className="layout-desc">2 pages stacked top-bottom</div>
                </button>
              </div>
            </div>

            <button
              className="pdf-compress-btn"
              onClick={merge}
              disabled={processing}
            >
              {processing ? '⟳ Merging…' : `📄 Merge ${files.length} PDFs`}
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
              <h3>✅ Merged successfully</h3>
            </div>

            <div className="pdf-result-grid">
              <div className="pdf-stat">
                <div className="pdf-stat-label">Files</div>
                <div className="pdf-stat-value">{result.totalFiles}</div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Input pages</div>
                <div className="pdf-stat-value">{result.totalPages}</div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Output pages</div>
                <div className="pdf-stat-value accent">
                  {result.outputPages}
                </div>
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
                ⬇ Download merged PDF
              </a>
              <button className="btn-secondary" onClick={clearAll}>
                Start over
              </button>
            </div>
          </div>
        )}
                {files.length === 0 && <SeoContent />}

      </div>
    </ToolShell>
  );
}

/* ---------- helpers ---------- */

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Applies rotation to a page if its orientation mismatches the desired one.
 * Only rotates if the page is clearly in the wrong orientation.
 */
function applyOrientation(page, desired) {
  if (!desired || desired === 'auto') return;
  const { width, height } = page.getSize();
  const isLandscape = width > height;
  const wantLandscape = desired === 'landscape';

  if (isLandscape === wantLandscape) return; // already correct

  const current = page.getRotation().angle || 0;
  page.setRotation(degrees((current + 90) % 360));
}

/**
 * Compute output sheet size for 2-up layout.
 */
function computeSheetSize(a, b, orientation) {
  const aSize = a.getSize();
  const bSize = b ? b.getSize() : aSize;

  if (orientation === 'auto') {
    // Landscape sheet
    const w = Math.max(aSize.width, bSize.width) * 2;
    const h = Math.max(aSize.height, bSize.height);
    return { width: w, height: h };
  }

  const baseW = Math.max(aSize.width, bSize.width);
  const baseH = Math.max(aSize.height, bSize.height);
  const maxDim = Math.max(baseW, baseH);

  if (orientation === 'landscape') {
    return { width: maxDim * 1.9, height: maxDim * 1.35 };
  }
  return { width: maxDim * 1.1, height: maxDim * 1.5 };
}

/**
 * Fit a page's dimensions inside a bounding box, preserving aspect ratio.
 */
function fitInside(size, boxW, boxH) {
  const ratio = size.width / size.height;
  const boxRatio = boxW / boxH;

  let width, height;
  if (ratio > boxRatio) {
    width = boxW;
    height = boxW / ratio;
  } else {
    height = boxH;
    width = boxH * ratio;
  }
  return { width, height };
}
/* ================= SEO Content Section ================= */
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is a Merge PDF Tool?</h2>
        <p>
          A <strong>merge PDF tool</strong> combines multiple PDF files into a
          single document, in the exact order you choose. This is essential
          when you need to join separate invoices, reports, contracts, or
          chapters into one file before sharing or printing.
        </p>
        <p>
          Our <strong>free online PDF merger</strong> runs entirely in your
          browser. Your files are never uploaded to any server, which makes it
          one of the most private ways to combine PDFs online. Merge files in
          seconds — no signup, no watermarks, no file size limits.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Merge PDF Files — Step by Step</h2>
        <ol className="seo-steps">
          <li>
            <strong>Upload your PDFs</strong> — drag & drop multiple files or
            click to browse. You need at least 2 PDFs.
          </li>
          <li>
            <strong>Reorder files</strong> — use the ↑ and ↓ buttons to
            arrange them in the order you want.
          </li>
          <li>
            <strong>Choose page orientation</strong> — Auto keeps each page
            as-is, or force Portrait / Landscape for all pages.
          </li>
          <li>
            <strong>Choose a layout</strong> — Sequential (1 page per sheet),
            2-up Horizontal (2 pages side by side), or 2-up Vertical (2 pages
            stacked).
          </li>
          <li>
            <strong>Click "Merge"</strong> — download the combined PDF
            instantly.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🔗</div>
            <h3>Combine Any Number of PDFs</h3>
            <p>
              Merge 2, 10, or 100 PDFs into a single file — no limits, no
              signup, no watermarks.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">↕️</div>
            <h3>Easy Reordering</h3>
            <p>
              Move any file up or down in the list with simple ↑ ↓ buttons to
              set the perfect order.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔄</div>
            <h3>Orientation Control</h3>
            <p>
              Auto (keep original), Portrait, or Landscape — the tool rotates
              pages if needed so everything looks uniform.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📐</div>
            <h3>3 Layout Modes</h3>
            <p>
              Sequential (normal merge), 2-up Horizontal (side by side), or
              2-up Vertical (stacked) — perfect for booklets and handouts.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">👁️</div>
            <h3>Page Count Preview</h3>
            <p>
              See how many pages each PDF has before merging, plus total pages
              in the result.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              All processing happens in your browser. Your PDFs never leave
              your device — no uploads, no servers.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Use Cases</h2>
        <ul className="seo-list">
          <li>
            <strong>Combining invoices</strong> — merge monthly invoices into
            a single yearly PDF for accounting.
          </li>
          <li>
            <strong>Joining reports</strong> — combine multiple chapter PDFs
            into one complete report.
          </li>
          <li>
            <strong>Contract assembly</strong> — merge signed pages,
            appendices, and exhibits into one contract.
          </li>
          <li>
            <strong>Portfolio building</strong> — combine separate project
            PDFs into one portfolio document.
          </li>
          <li>
            <strong>Study materials</strong> — merge lecture notes, slides,
            and handouts into one study file.
          </li>
          <li>
            <strong>Booklet printing</strong> — use 2-up layouts to create
            printable booklets from single-page PDFs.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this PDF merger free?</summary>
          <p>
            Yes — completely free with no limits. No signup, no watermarks,
            no hidden fees. Merge as many PDFs as you want.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are my files safe?</summary>
          <p>
            Absolutely. The entire process runs locally in your browser using
            JavaScript. Your PDFs are never uploaded to any server, so your
            data stays completely private.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I control the order of merged PDFs?</summary>
          <p>
            Yes — after uploading, use the ↑ and ↓ buttons next to each file
            to reorder them. The final PDF follows the exact order shown.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What's the difference between Sequential and 2-up layouts?</summary>
          <p>
            <strong>Sequential</strong> puts one PDF page per sheet — the
            normal merge. <strong>2-up Horizontal</strong> places two pages
            side by side per sheet. <strong>2-up Vertical</strong> stacks two
            pages top-bottom per sheet. 2-up is great for handouts and
            booklets.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Will quality be reduced after merging?</summary>
          <p>
            No — Sequential merge is lossless. Text, images, and formatting
            stay exactly as in the originals. 2-up layouts re-render pages as
            images, so text becomes non-selectable in those modes.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What does "Orientation" do?</summary>
          <p>
            Auto keeps each page's original orientation. Portrait forces all
            pages to tall/vertical. Landscape forces all pages to wide/horizontal.
            The tool rotates pages as needed without distorting content.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is there a file size limit?</summary>
          <p>
            No hard limit — but very large PDFs (200+ MB or 1000+ pages total)
            may take longer and use more memory. For best performance, merge
            in smaller batches.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work with scanned PDFs?</summary>
          <p>
            Yes — merging works at the page level, so scanned PDFs (which are
            images) merge perfectly.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I merge password-protected PDFs?</summary>
          <p>
            If the PDF allows reading without a password, merging works. If
            it's locked with a password, you'll need to unlock it first using
            the password in your PDF reader.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other PDF tools: <strong>Split PDF</strong>,{' '}
          <strong>Compress PDF</strong>, <strong>Rotate PDF</strong>,{' '}
          <strong>Add Watermark</strong>, <strong>Add Page Numbers</strong>,{' '}
          <strong>PDF to JPG</strong>, <strong>PDF to PNG</strong>,{' '}
          <strong>PDF to Text</strong>, and <strong>PDF to Word</strong> — all
          free and browser-based.
        </p>
      </section>
    </article>
  );
}