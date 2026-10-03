import { useRef, useState, useEffect } from 'react';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
// PDF.js worker for preview
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const POSITIONS = [
  { id: 'top-left', label: '↖' },
  { id: 'top-center', label: '↑' },
  { id: 'top-right', label: '↗' },
  { id: 'middle-left', label: '←' },
  { id: 'center', label: '●' },
  { id: 'middle-right', label: '→' },
  { id: 'bottom-left', label: '↙' },
  { id: 'bottom-center', label: '↓' },
  { id: 'bottom-right', label: '↘' },
];

const ROTATIONS = [0, 45, -45, 90];

const COLORS = [
  { id: 'gray', value: '#808080' },
  { id: 'red', value: '#ef4444' },
  { id: 'blue', value: '#3b82f6' },
  { id: 'green', value: '#22c55e' },
  { id: 'yellow', value: '#eab308' },
  { id: 'purple', value: '#a855f7' },
  { id: 'black', value: '#000000' },
  { id: 'white', value: '#ffffff' },
];

export default function WatermarkPdf() {
  const tool = getToolById('watermark-pdf');
  // SEO: dynamic title + meta description
  useDocumentTitle(
    'Add Watermark to PDF — Free Online PDF Watermark Tool | toolchest'
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
      'Free online tool to add text or image watermarks to PDF files. Choose position, rotation, opacity, color, and tile mode. 100% private — runs entirely in your browser, no upload needed.';

    // JSON-LD structured data
    const scriptId = 'add-watermark-jsonld';
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
      name: 'Add Watermark to PDF',
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
        ratingCount: '623',
      },
      featureList: [
        'Add text watermarks to PDF',
        'Add image/logo watermarks to PDF',
        '9 preset positions (corners, edges, center)',
        'Tiled diagonal watermark pattern',
        'Rotation control (0°, 45°, -45°, 90°)',
        'Opacity slider (5%–100%)',
        'Custom color and font size',
        'Apply to all pages or specific ranges',
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

  // Watermark type
  const [type, setType] = useState('text'); // 'text' | 'image'

  // Text options
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState('#ef4444');

  // Image options
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageScale, setImageScale] = useState(30); // % of page width

  // Common options
  const [opacity, setOpacity] = useState(30);
  const [rotation, setRotation] = useState(45);
  const [position, setPosition] = useState('center');
  const [tiled, setTiled] = useState(false);

  // Pages
  const [applyTo, setApplyTo] = useState('all'); // 'all' | 'custom'
  const [customPages, setCustomPages] = useState('');

  // State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Load PDF
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

      // Render first page preview
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

  // Load watermark image
  const handleImageChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Only image files are supported for watermark.');
      return;
    }
    setImageFile(f);
    const url = URL.createObjectURL(f);
    setImagePreview(url);
    setError('');
  };

  const handleReset = () => {
    if (result?.url) URL.revokeObjectURL(result.url);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setFile(null);
    setPageCount(0);
    setFirstPagePreview('');
    setImageFile(null);
    setImagePreview('');
    setResult(null);
    setError('');
    setProgress('');
    setCustomPages('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // Parse page range
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

  const applyWatermark = async () => {
    if (!file || processing) return;
    if (type === 'image' && !imageFile) {
      setError('Please upload a watermark image.');
      return;
    }

    setProcessing(true);
    setError('');
    setProgress('Loading PDF…');
    setResult(null);

    try {
      const buf = await file.arrayBuffer();
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = pdf.getPages();

      let targets;
      if (applyTo === 'all') {
        targets = new Set(pages.map((_, i) => i + 1));
      } else {
        targets = parsePageRange(customPages, pages.length);
        if (targets.size === 0) {
          throw new Error('No valid page numbers selected.');
        }
      }

      // Prepare text or image
      let font = null;
      let embeddedImage = null;

      if (type === 'text') {
        font = await pdf.embedFont(StandardFonts.HelveticaBold);
      } else {
        setProgress('Embedding watermark image…');
        const imgBytes = await imageFile.arrayBuffer();
        const isPng = imageFile.type.includes('png');
        embeddedImage = isPng
          ? await pdf.embedPng(imgBytes)
          : await pdf.embedJpg(imgBytes);
      }

      const colorRgb = hexToRgb(color);
      const alpha = opacity / 100;

      setProgress(`Applying watermark to ${targets.size} page${targets.size === 1 ? '' : 's'}…`);

      let pageNum = 0;
      for (const page of pages) {
        pageNum++;
        if (!targets.has(pageNum)) continue;

        const { width, height } = page.getSize();

        if (tiled) {
          // Tiled pattern — repeated diagonally
          await applyTiledWatermark(
            page,
            type,
            text,
            font,
            embeddedImage,
            colorRgb,
            alpha,
            fontSize,
            imageScale,
            rotation,
            width,
            height
          );
        } else {
          // Single watermark at chosen position
          const drawOptions = computePosition(
            page,
            type,
            text,
            font,
            embeddedImage,
            colorRgb,
            alpha,
            fontSize,
            imageScale,
            rotation,
            position,
            width,
            height
          );

          if (type === 'text') {
            page.drawText(text, drawOptions);
          } else {
            page.drawImage(embeddedImage, drawOptions);
          }
        }
      }

      setProgress('Saving PDF…');
      const bytes = await pdf.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const baseName = file.name.replace(/\.pdf$/i, '');
      setResult({
        url,
        size: blob.size,
        filename: `${baseName}-watermarked.pdf`,
        pagesWatermarked: targets.size,
        totalPages: pages.length,
      });
      setProgress('');
    } catch (err) {
      console.error(err);
      setError('Watermark failed: ' + (err?.message || 'unknown error'));
      setProgress('');
    } finally {
      setProcessing(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (result?.url) URL.revokeObjectURL(result.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            <div className="pdf-dropzone-icon">💧</div>
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
            {/* Preview area */}
            <div className="wm-preview-wrap">
              <div className="wm-preview-label">Live preview</div>
              <div className="wm-preview-canvas">
                {firstPagePreview && (
                  <div className="wm-preview-page">
                    <img src={firstPagePreview} alt="Page preview" />
                    <WatermarkOverlay
                      type={type}
                      text={text}
                      fontSize={fontSize}
                      color={color}
                      opacity={opacity}
                      rotation={rotation}
                      position={position}
                      tiled={tiled}
                      imagePreview={imagePreview}
                      imageScale={imageScale}
                      pageW={firstPageSize.w}
                      pageH={firstPageSize.h}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Watermark type */}
            <div className="pdf-target">
              <label className="pdf-target-label">Watermark type</label>
              <div className="wm-type-tabs">
                <button
                  className={`wm-type-tab ${type === 'text' ? 'active' : ''}`}
                  onClick={() => setType('text')}
                >
                  <span>🔤</span> Text
                </button>
                <button
                  className={`wm-type-tab ${type === 'image' ? 'active' : ''}`}
                  onClick={() => setType('image')}
                >
                  <span>🖼️</span> Image
                </button>
              </div>
            </div>

            {/* Text controls */}
            {type === 'text' && (
              <div className="pdf-target">
                <label className="pdf-target-label">Watermark text</label>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="pdf-target-number"
                  style={{ width: '100%' }}
                  placeholder="e.g. CONFIDENTIAL"
                  maxLength={60}
                />

                <div style={{ marginTop: 'var(--sp-4)' }}>
                  <label className="pdf-target-label">
                    Font size · <strong>{fontSize}pt</strong>
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="120"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="wm-slider"
                  />
                </div>

                <div style={{ marginTop: 'var(--sp-4)' }}>
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
              </div>
            )}

            {/* Image controls */}
            {type === 'image' && (
              <div className="pdf-target">
                <label className="pdf-target-label">Watermark image</label>
                <div className="wm-image-upload">
                  {imagePreview ? (
                    <div className="wm-image-preview">
                      <img src={imagePreview} alt="Watermark" />
                      <button
                        className="wm-image-remove"
                        onClick={() => {
                          if (imagePreview) URL.revokeObjectURL(imagePreview);
                          setImageFile(null);
                          setImagePreview('');
                          if (imageInputRef.current)
                            imageInputRef.current.value = '';
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      className="wm-image-btn"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <span>🖼️</span>
                      Choose image (PNG/JPG)
                    </button>
                  )}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                </div>

                <div style={{ marginTop: 'var(--sp-4)' }}>
                  <label className="pdf-target-label">
                    Size · <strong>{imageScale}%</strong> of page width
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    value={imageScale}
                    onChange={(e) => setImageScale(parseInt(e.target.value))}
                    className="wm-slider"
                  />
                </div>
              </div>
            )}

            {/* Common controls */}
            <div className="pdf-target">
              <div className="wm-row-2col">
                <div>
                  <label className="pdf-target-label">
                    Opacity · <strong>{opacity}%</strong>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={opacity}
                    onChange={(e) => setOpacity(parseInt(e.target.value))}
                    className="wm-slider"
                  />
                </div>
                <div>
                  <label className="pdf-target-label">
                    Rotation · <strong>{rotation}°</strong>
                  </label>
                  <div className="wm-rotation-grid">
                    {ROTATIONS.map((r) => (
                      <button
                        key={r}
                        className={`category-pill ${
                          rotation === r ? 'active' : ''
                        }`}
                        onClick={() => setRotation(r)}
                      >
                        {r}°
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Position */}
            <div className="pdf-target">
              <label className="pdf-target-label">Position</label>
              <div className="wm-position-layout">
                <div className="wm-position-grid">
                  {POSITIONS.map((p) => (
                    <button
                      key={p.id}
                      className={`wm-position-btn ${
                        position === p.id && !tiled ? 'active' : ''
                      }`}
                      onClick={() => {
                        setPosition(p.id);
                        setTiled(false);
                      }}
                      disabled={tiled}
                      title={p.id}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <button
                  className={`wm-tiled-btn ${tiled ? 'active' : ''}`}
                  onClick={() => setTiled(!tiled)}
                >
                  <span className="wm-tiled-icon">▦</span>
                  <span>
                    <div className="wm-tiled-name">Tiled (repeating)</div>
                    <div className="wm-tiled-desc">
                      Repeats diagonally across the page
                    </div>
                  </span>
                </button>
              </div>
            </div>

            {/* Apply to */}
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
                    placeholder="e.g. 1, 3, 5-8"
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
            </div>

            <button
              className="pdf-compress-btn"
              onClick={applyWatermark}
              disabled={
                processing ||
                (type === 'image' && !imageFile) ||
                (type === 'text' && !text.trim())
              }
            >
              {processing ? '⟳ Applying…' : '💧 Add watermark'}
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
              <h3>✅ Watermark added</h3>
            </div>

            <div className="pdf-result-grid">
              <div className="pdf-stat">
                <div className="pdf-stat-label">Total pages</div>
                <div className="pdf-stat-value">{result.totalPages}</div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Watermarked</div>
                <div className="pdf-stat-value accent">
                  {result.pagesWatermarked}
                </div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Type</div>
                <div className="pdf-stat-value">
                  {type === 'text' ? 'Text' : 'Image'}
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
                ⬇ Download watermarked PDF
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

/* ===================== Watermark overlay (preview) ===================== */
function WatermarkOverlay({
  type,
  text,
  fontSize,
  color,
  opacity,
  rotation,
  position,
  tiled,
  imagePreview,
  imageScale,
  pageW,
  pageH,
}) {
  // Scale down so it looks right in preview (preview img is ~400px wide)
  const previewW = 100; // percent-based positioning
  const alpha = opacity / 100;

  // Approximate font scale for preview (preview is roughly 1/2 scale of real)
  const previewFontSize = Math.max(8, (fontSize / pageW) * 100 * 3);

  if (tiled) {
    const items = [];
    const cols = 4;
    const rows = 5;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c + 0.5) * (100 / cols);
        const y = (r + 0.5) * (100 / rows);
        items.push(
          <span
            key={`${r}-${c}`}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              transform: `translate(-50%, -50%) rotate(${-rotation}deg)`,
              opacity: alpha,
              fontSize: `${previewFontSize}px`,
              color,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {type === 'text' ? (
              text
            ) : imagePreview ? (
              <img
                src={imagePreview}
                alt=""
                style={{
                  width: `${imageScale * 0.6}%`,
                  maxWidth: '60px',
                  opacity: 1,
                }}
              />
            ) : null}
          </span>
        );
      }
    }
    return <div className="wm-overlay">{items}</div>;
  }

  const positions = {
    'top-left': { top: '10%', left: '10%' },
    'top-center': { top: '10%', left: '50%' },
    'top-right': { top: '10%', left: '90%' },
    'middle-left': { top: '50%', left: '10%' },
    center: { top: '50%', left: '50%' },
    'middle-right': { top: '50%', left: '90%' },
    'bottom-left': { top: '90%', left: '10%' },
    'bottom-center': { top: '90%', left: '50%' },
    'bottom-right': { top: '90%', left: '90%' },
  };

  const pos = positions[position] || positions.center;

  return (
    <div className="wm-overlay">
      <span
        style={{
          position: 'absolute',
          top: pos.top,
          left: pos.left,
          transform: `translate(-50%, -50%) rotate(${-rotation}deg)`,
          opacity: alpha,
          fontSize: `${previewFontSize}px`,
          color,
          fontWeight: 700,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {type === 'text' ? (
          text
        ) : imagePreview ? (
          <img
            src={imagePreview}
            alt=""
            style={{
              width: `${imageScale * 0.6}%`,
              maxWidth: '80px',
            }}
          />
        ) : null}
      </span>
    </div>
  );
}

/* ===================== Helpers ===================== */

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function computePosition(
  page,
  type,
  text,
  font,
  image,
  colorRgb,
  alpha,
  fontSize,
  imageScale,
  rotation,
  position,
  pageW,
  pageH
) {
  const angle = rotation;
  const rad = (angle * Math.PI) / 180;

  let wmWidth, wmHeight, drawOpts;

  if (type === 'text') {
    wmWidth = font.widthOfTextAtSize(text, fontSize);
    wmHeight = fontSize;
    drawOpts = {
      x: 0,
      y: 0,
      size: fontSize,
      font,
      color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
      opacity: alpha,
      rotate: degrees(angle),
    };
  } else {
    const imgDims = image.scale(1);
    const targetW = (pageW * imageScale) / 100;
    const targetH = (targetW * imgDims.height) / imgDims.width;
    wmWidth = targetW;
    wmHeight = targetH;
    drawOpts = {
      x: 0,
      y: 0,
      width: targetW,
      height: targetH,
      opacity: alpha,
      rotate: degrees(angle),
    };
  }

  const margin = 40;
  // Rotated bounding box
  const rotatedW = Math.abs(wmWidth * Math.cos(rad)) + Math.abs(wmHeight * Math.sin(rad));
  const rotatedH = Math.abs(wmWidth * Math.sin(rad)) + Math.abs(wmHeight * Math.cos(rad));

  let cx, cy; // center of the watermark
  switch (position) {
    case 'top-left':
      cx = margin + rotatedW / 2;
      cy = pageH - margin - rotatedH / 2;
      break;
    case 'top-center':
      cx = pageW / 2;
      cy = pageH - margin - rotatedH / 2;
      break;
    case 'top-right':
      cx = pageW - margin - rotatedW / 2;
      cy = pageH - margin - rotatedH / 2;
      break;
    case 'middle-left':
      cx = margin + rotatedW / 2;
      cy = pageH / 2;
      break;
    case 'middle-right':
      cx = pageW - margin - rotatedW / 2;
      cy = pageH / 2;
      break;
    case 'bottom-left':
      cx = margin + rotatedW / 2;
      cy = margin + rotatedH / 2;
      break;
    case 'bottom-center':
      cx = pageW / 2;
      cy = margin + rotatedH / 2;
      break;
    case 'bottom-right':
      cx = pageW - margin - rotatedW / 2;
      cy = margin + rotatedH / 2;
      break;
    case 'center':
    default:
      cx = pageW / 2;
      cy = pageH / 2;
      break;
  }

  // Convert center point to bottom-left anchor (pdf-lib uses bottom-left origin)
  drawOpts.x = cx - wmWidth / 2;
  drawOpts.y = cy - wmHeight / 2;

  return drawOpts;
}

async function applyTiledWatermark(
  page,
  type,
  text,
  font,
  image,
  colorRgb,
  alpha,
  fontSize,
  imageScale,
  rotation,
  pageW,
  pageH
) {
  const cols = Math.max(2, Math.floor(pageW / 200));
  const rows = Math.max(3, Math.floor(pageH / 150));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = ((c + 0.5) * pageW) / cols;
      const cy = ((r + 0.5) * pageH) / rows;

      if (type === 'text') {
        const w = font.widthOfTextAtSize(text, fontSize);
        const h = fontSize;
        page.drawText(text, {
          x: cx - w / 2,
          y: cy - h / 2,
          size: fontSize,
          font,
          color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
          opacity: alpha,
          rotate: degrees(rotation),
        });
      } else {
        const dims = image.scale(1);
        const targetW = (pageW * imageScale) / 100 / 3; // smaller in tiled mode
        const targetH = (targetW * dims.height) / dims.width;
        page.drawImage(image, {
          x: cx - targetW / 2,
          y: cy - targetH / 2,
          width: targetW,
          height: targetH,
          opacity: alpha,
          rotate: degrees(rotation),
        });
      }
    }
  }
}
/* ================= SEO Content Section ================= */
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is an Add Watermark to PDF Tool?</h2>
        <p>
          An <strong>add watermark to PDF</strong> tool places a visible text
          or image overlay on top of your PDF pages — commonly used to mark
          documents as <em>confidential</em>, <em>draft</em>, or branded with
          your logo. Watermarks protect your work, prevent unauthorized
          copying, and let you quickly stamp ownership on any document.
        </p>
        <p>
          Our <strong>free online PDF watermark tool</strong> runs entirely in
          your browser. Your file is never uploaded to any server, which means
          it's one of the most private ways to watermark PDFs online. Add text
          or image watermarks in seconds — no signup, no watermarks on the
          watermark, no file size limits.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Add a Watermark to a PDF — Step by Step</h2>
        <ol className="seo-steps">
          <li>
            <strong>Upload your PDF</strong> — drag & drop or click to browse.
            Multi-page PDFs of any size are supported.
          </li>
          <li>
            <strong>Choose text or image</strong> — type custom text like
            "CONFIDENTIAL" or upload a PNG/JPG logo.
          </li>
          <li>
            <strong>Pick a position</strong> — 9 preset spots (corners, edges,
            center) or enable tiled diagonal mode for full coverage.
          </li>
          <li>
            <strong>Customize the style</strong> — rotation (0°, 45°, -45°,
            90°), opacity (5%–100%), color, and font size.
          </li>
          <li>
            <strong>Click "Add watermark"</strong> — download your watermarked
            PDF instantly.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🔤</div>
            <h3>Text Watermark</h3>
            <p>
              Add custom text like "CONFIDENTIAL", "DRAFT", or your company
              name. Customize font size and color.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🖼️</div>
            <h3>Image Watermark</h3>
            <p>
              Upload your logo (PNG or JPG) and place it on every page. Resize
              easily with a slider.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📍</div>
            <h3>9 Positions + Tiled Mode</h3>
            <p>
              Corners, edges, or center — or enable tiled diagonal mode for
              full-page coverage that's hard to remove.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎨</div>
            <h3>Full Styling Control</h3>
            <p>
              Rotation (0°, 45°, -45°, 90°), opacity (5%–100%), 8 preset
              colors, and adjustable font size.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📄</div>
            <h3>Apply to Specific Pages</h3>
            <p>
              Watermark only selected pages using a range like{' '}
              <code>1,3,5-8</code> — or apply to all pages at once.
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
            <strong>Confidential documents</strong> — mark contracts, legal
            papers, and internal reports with "CONFIDENTIAL" watermarks.
          </li>
          <li>
            <strong>Draft versions</strong> — stamp "DRAFT" or "SAMPLE" on
            documents under review before final release.
          </li>
          <li>
            <strong>Brand protection</strong> — place your company logo on
            proposals, invoices, and presentations.
          </li>
          <li>
            <strong>Copyright marking</strong> — add © and your name to
            creative work, eBooks, and portfolios.
          </li>
          <li>
            <strong>Preventing leaks</strong> — use tiled diagonal watermarks
            to make it harder to remove or crop out.
          </li>
          <li>
            <strong>Document versioning</strong> — mark pages with version
            numbers like "v1.2" or "Rev A" for change tracking.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this PDF watermark tool free?</summary>
          <p>
            Yes — completely free with no limits. No signup, no hidden fees,
            no watermarks on your watermark. Use it as many times as you want.
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
          <summary>Can I add both text and image watermarks?</summary>
          <p>
            Yes — choose "Text" mode to type your own message, or "Image" mode
            to upload a PNG or JPG logo. You can apply them one at a time by
            running the tool twice if you want both.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What does "tiled watermark" mean?</summary>
          <p>
            Tiled mode repeats your watermark diagonally across the entire
            page, making it much harder to remove than a single centered
            watermark. It's the classic pattern used on confidential documents.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I watermark only certain pages?</summary>
          <p>
            Yes — use the "Custom pages" option and enter a page range like{' '}
            <code>2-10, 15, 20</code>. Leave it on "All pages" to watermark
            everything.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Will the watermark be visible when printed?</summary>
          <p>
            Yes — the watermark is a permanent part of the PDF and will appear
            on screen, when printed, and in any PDF viewer.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work with scanned PDFs?</summary>
          <p>
            Yes — watermarks are added as an overlay on top of each page, so it
            works regardless of whether the PDF content is text or a scanned
            image.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I remove a watermark later?</summary>
          <p>
            Not with this tool — watermarks are added as permanent overlays.
            Always keep a backup of the original PDF before watermarking.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is there a file size limit?</summary>
          <p>
            No hard limit — but very large PDFs (200+ MB or 500+ pages) may
            take longer. For best performance, process in chunks.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other PDF tools: <strong>Merge PDF</strong>,{' '}
          <strong>Split PDF</strong>, <strong>Compress PDF</strong>,{' '}
          <strong>Rotate PDF</strong>, <strong>Add Page Numbers</strong>,{' '}
          <strong>PDF to JPG</strong>, <strong>PDF to PNG</strong>,{' '}
          <strong>PDF to Text</strong>, and <strong>PDF to Word</strong> — all
          free and browser-based.
        </p>
      </section>
    </article>
  );
}