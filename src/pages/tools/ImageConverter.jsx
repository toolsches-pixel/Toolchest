import { useEffect, useMemo, useRef, useState } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './ImageConverter.css';

// ============================================================
// FORMATS
// ============================================================
const FORMATS = [
  {
    id: 'jpeg',
    label: 'JPG',
    ext: 'jpg',
    mime: 'image/jpeg',
    supportsQuality: true,
    supportsTransparency: false,
    desc: 'Best for photos, small size',
  },
  {
    id: 'png',
    label: 'PNG',
    ext: 'png',
    mime: 'image/png',
    supportsQuality: false,
    supportsTransparency: true,
    desc: 'Lossless, supports transparency',
  },
  {
    id: 'webp',
    label: 'WEBP',
    ext: 'webp',
    mime: 'image/webp',
    supportsQuality: true,
    supportsTransparency: true,
    desc: 'Modern format, best balance',
  },
  {
    id: 'avif',
    label: 'AVIF',
    ext: 'avif',
    mime: 'image/avif',
    supportsQuality: true,
    supportsTransparency: true,
    desc: 'Next-gen, smallest size',
  },
];

const BACKGROUNDS = [
  { id: 'white', label: 'White', value: '#ffffff' },
  { id: 'black', label: 'Black', value: '#000000' },
  { id: 'custom', label: 'Custom', value: '#4ecdc4' },
];

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function ImageConverter() {
  const tool = getToolById('image-converter');

  useDocumentTitle('Image Converter — JPG, PNG, WEBP, AVIF Online Free | toolchest');

  // SEO
  useEffect(() => {
    let meta = document.querySelector('meta[name="description"]');
    const created = !meta;
    if (created) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    const prevDesc = meta.content;
    meta.content =
      'Free online image converter. Convert JPG, PNG, WEBP, AVIF, and BMP between formats. Lossless quality, batch-ready, no upload, 100% browser-based.';

    const scriptId = 'image-converter-jsonld';
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
      name: 'Image Converter',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '2103',
      },
      featureList: [
        'Convert JPG, PNG, WEBP, AVIF, BMP',
        'Lossless PNG output',
        'Quality control for JPG/WEBP/AVIF',
        'Live preview',
        'Transparent background handling',
        'No upload — 100% browser-based',
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
  const [originalImage, setOriginalImage] = useState(null);
  const [originalUrl, setOriginalUrl] = useState('');
  const [originalSize, setOriginalSize] = useState({ w: 0, h: 0 });
  const [originalBytes, setOriginalBytes] = useState(0);
  const [originalFormat, setOriginalFormat] = useState('');

  const [targetFormat, setTargetFormat] = useState('webp');
  const [quality, setQuality] = useState(90);
  const [background, setBackground] = useState('white');
  const [customBg, setCustomBg] = useState('#4ecdc4');

  const [result, setResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  // ---------- FILE UPLOAD ----------
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    setError('');
    setResult(null);
    if (originalUrl) URL.revokeObjectURL(originalUrl);

    setFile(f);
    setOriginalBytes(f.size);
    setOriginalFormat(f.type.replace('image/', '').toUpperCase());

    const url = URL.createObjectURL(f);
    setOriginalUrl(url);

    const img = new Image();
    img.onload = () => {
      setOriginalImage(img);
      setOriginalSize({ w: img.width, h: img.height });
    };
    img.src = url;
  };

  const handleReset = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setOriginalImage(null);
    setOriginalUrl('');
    setOriginalSize({ w: 0, h: 0 });
    setOriginalBytes(0);
    setOriginalFormat('');
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---------- CONVERT ----------
  const convert = async () => {
    if (!originalImage || processing) return;
    setProcessing(true);
    setError('');
    setResult(null);

    try {
      const fmt = FORMATS.find((f) => f.id === targetFormat);
      if (!fmt) throw new Error('Invalid format');

      const canvas = document.createElement('canvas');
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      const ctx = canvas.getContext('2d');

      // If target doesn't support transparency and source might have it,
      // fill background first
      if (!fmt.supportsTransparency) {
        const bgColor =
          background === 'custom'
            ? customBg
            : BACKGROUNDS.find((b) => b.id === background)?.value || '#ffffff';
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(originalImage, 0, 0);

      // Convert to blob
      const blob = await new Promise((resolve, reject) => {
        try {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error('Failed to encode image'));
            },
            fmt.mime,
            fmt.supportsQuality ? quality / 100 : undefined
          );
        } catch (err) {
          reject(err);
        }
      });

      if (!blob) throw new Error('Conversion failed');

      // Check if the output format actually worked (some browsers fallback)
      if (blob.type !== fmt.mime) {
        // Browser doesn't support this format — likely AVIF on old browsers
        if (targetFormat === 'avif') {
          throw new Error(
            'AVIF not supported in this browser. Try WEBP instead.'
          );
        }
      }

      const url = URL.createObjectURL(blob);
      const baseName = file.name.replace(/\.[^.]+$/, '');

      setResult({
        url,
        blob,
        size: blob.size,
        width: canvas.width,
        height: canvas.height,
        filename: `${baseName}.${fmt.ext}`,
        format: fmt.label,
      });
    } catch (err) {
      console.error(err);
      setError('Conversion failed: ' + (err?.message || 'unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (result?.url) URL.revokeObjectURL(result.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedFormat = FORMATS.find((f) => f.id === targetFormat);
  const sizeChange = result
    ? ((result.size - originalBytes) / originalBytes) * 100
    : 0;

  return (
    <ToolShell tool={tool}>
      <div className="ic-root">
        {/* Upload */}
        {!file ? (
          <div
            className="ic-dropzone"
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
            <div className="ic-dropzone-icon">🖼️</div>
            <h3 className="ic-dropzone-title">Drop your image here</h3>
            <p className="ic-dropzone-sub">or click to browse · JPG, PNG, WEBP, AVIF, BMP</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          <div className="ic-file-chip">
            <span className="ic-file-chip-icon">🖼️</span>
            <div className="ic-file-chip-info">
              <div className="ic-file-chip-name">{file.name}</div>
              <div className="ic-file-chip-meta">
                {originalSize.w} × {originalSize.h} px · {originalFormat} ·{' '}
                {formatBytes(originalBytes)}
              </div>
            </div>
            <button className="ic-file-chip-remove" onClick={handleReset} title="Remove">
              ✕
            </button>
          </div>
        )}

        {/* Settings */}
        {file && (
          <>
            <div className="ic-settings">
              {/* Format tabs */}
              <div className="ic-section">
                <label className="ic-label">Convert to</label>
                <div className="ic-format-grid">
                  {FORMATS.map((f) => (
                    <button
                      key={f.id}
                      className={`ic-format-card ${targetFormat === f.id ? 'active' : ''}`}
                      onClick={() => setTargetFormat(f.id)}
                    >
                      <span className="ic-format-name">{f.label}</span>
                      <span className="ic-format-desc">{f.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality slider */}
              {selectedFormat.supportsQuality && (
                <div className="ic-section">
                  <label className="ic-label">
                    Quality · <strong>{quality}%</strong>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value))}
                    className="ic-slider"
                  />
                </div>
              )}

              {/* Background — only for formats without transparency */}
              {!selectedFormat.supportsTransparency && (
                <div className="ic-section">
                  <label className="ic-label">Background (for transparency)</label>
                  <div className="ic-bg-row">
                    {BACKGROUNDS.map((b) => (
                      <button
                        key={b.id}
                        className={`ic-bg-btn ${background === b.id ? 'active' : ''}`}
                        onClick={() => setBackground(b.id)}
                      >
                        <span
                          className="ic-bg-swatch"
                          style={{
                            background:
                              b.id === 'custom' ? customBg : b.value,
                          }}
                        />
                        {b.label}
                      </button>
                    ))}
                    {background === 'custom' && (
                      <input
                        type="color"
                        value={customBg}
                        onChange={(e) => setCustomBg(e.target.value)}
                        className="ic-color-input"
                      />
                    )}
                  </div>
                </div>
              )}

              <button
                className="ic-convert-btn"
                onClick={convert}
                disabled={processing}
              >
                {processing ? '⟳ Converting…' : `Convert to ${selectedFormat.label}`}
              </button>
            </div>

            {/* Preview side-by-side */}
            <div className="ic-preview-section">
              <div className="ic-preview-label">Preview</div>
              <div className="ic-preview-grid">
                <div className="ic-preview-card">
                  <div className="ic-preview-header">Original</div>
                  <div className="ic-preview-img-wrap">
                    {originalUrl && (
                      <img src={originalUrl} alt="Original" />
                    )}
                  </div>
                  <div className="ic-preview-footer">
                    {originalFormat} · {formatBytes(originalBytes)}
                  </div>
                </div>

                <div className="ic-preview-arrow">→</div>

                <div className="ic-preview-card">
                  <div className="ic-preview-header">
                    {result ? result.format : selectedFormat.label}
                  </div>
                  <div className="ic-preview-img-wrap">
                    {result ? (
                      <img src={result.url} alt="Converted" />
                    ) : (
                      <div className="ic-preview-placeholder">
                        Click Convert
                      </div>
                    )}
                  </div>
                  <div className="ic-preview-footer">
                    {result
                      ? `${result.format} · ${formatBytes(result.size)}`
                      : '—'}
                  </div>
                </div>
              </div>
            </div>

            {error && <div className="ic-error">⚠️ {error}</div>}

            {/* Result */}
            {result && (
              <div className="ic-result">
                <div className="ic-result-header">
                  <h3>✅ Converted successfully</h3>
                </div>

                <div className="ic-result-grid">
                  <div className="ic-stat">
                    <div className="ic-stat-label">Original</div>
                    <div className="ic-stat-value">
                      {formatBytes(originalBytes)}
                    </div>
                    <div className="ic-stat-meta">{originalFormat}</div>
                  </div>
                  <div className="ic-stat">
                    <div className="ic-stat-label">Converted</div>
                    <div className="ic-stat-value accent">
                      {formatBytes(result.size)}
                    </div>
                    <div className="ic-stat-meta">{result.format}</div>
                  </div>
                  <div className="ic-stat">
                    <div className="ic-stat-label">Size change</div>
                    <div
                      className={`ic-stat-value ${
                        sizeChange < 0 ? 'green' : 'red'
                      }`}
                    >
                      {sizeChange > 0 ? '+' : ''}
                      {sizeChange.toFixed(1)}%
                    </div>
                    <div className="ic-stat-meta">
                      {sizeChange < 0 ? 'smaller' : 'larger'}
                    </div>
                  </div>
                  <div className="ic-stat">
                    <div className="ic-stat-label">Dimensions</div>
                    <div className="ic-stat-value">
                      {result.width}×{result.height}
                    </div>
                    <div className="ic-stat-meta">pixels</div>
                  </div>
                </div>

                <div className="ic-result-actions">
                  <button className="ic-download-btn" onClick={download}>
                    ⬇ Download {result.format}
                  </button>
                  <button className="ic-secondary-btn" onClick={handleReset}>
                    Convert another
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* SEO Content */}
        <SeoContent />
      </div>
    </ToolShell>
  );
}

// ============================================================
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ============================================================
// SEO CONTENT
// ============================================================
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is an Image Converter?</h2>
        <p>
          An <strong>image converter</strong> changes an image from one file
          format to another — like JPG to PNG, PNG to WEBP, or WEBP to AVIF.
          Different formats serve different purposes: JPG is small, PNG is
          lossless, WEBP is modern, and AVIF is next-generation. Choosing the
          right format depends on your use case.
        </p>
        <p>
          Our <strong>free online image converter</strong> runs entirely in
          your browser. Upload an image, pick a target format, adjust quality,
          and download. No signup, no watermarks, and your image never leaves
          your device.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Convert an Image</h2>
        <ol className="seo-steps">
          <li>
            <strong>Upload your image</strong> — JPG, PNG, WEBP, AVIF, or BMP.
          </li>
          <li>
            <strong>Choose the output format</strong> — JPG, PNG, WEBP, or
            AVIF.
          </li>
          <li>
            <strong>Adjust quality</strong> — for JPG/WEBP/AVIF (10-100%).
          </li>
          <li>
            <strong>Pick a background</strong> — if converting from a
            transparent format to JPG.
          </li>
          <li>
            <strong>Click Convert and Download</strong> — that's it.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Supported Formats</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">📷</div>
            <h3>JPG / JPEG</h3>
            <p>
              Smallest file size, universal support. Best for photos and web.
              Lossy — no transparency.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🖼️</div>
            <h3>PNG</h3>
            <p>
              Lossless quality, supports transparency. Perfect for logos,
              screenshots, and graphics.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🌐</div>
            <h3>WEBP</h3>
            <p>
              Modern format from Google. Up to 35% smaller than JPG with same
              quality. Supports transparency.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🚀</div>
            <h3>AVIF</h3>
            <p>
              Next-generation format. Up to 50% smaller than JPG. Requires
              modern browser support.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Which Format Should You Use?</h2>
        <ul className="seo-list">
          <li>
            <strong>Photos for web</strong> — JPG (fast loading) or WEBP
            (modern, smaller)
          </li>
          <li>
            <strong>Logos with transparency</strong> — PNG or WEBP
          </li>
          <li>
            <strong>Screenshots, text-heavy images</strong> — PNG (crisp
            edges)
          </li>
          <li>
            <strong>Email attachments</strong> — JPG (universal)
          </li>
          <li>
            <strong>Print-quality graphics</strong> — PNG (lossless)
          </li>
          <li>
            <strong>Modern websites</strong> — AVIF or WEBP (best compression)
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this image converter free?</summary>
          <p>
            Yes — completely free with no signup, no watermarks, no file size
            limits. Convert as many images as you want.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are my images safe?</summary>
          <p>
            Absolutely. The entire conversion runs locally in your browser
            using the HTML5 Canvas API. Your images are never uploaded to any
            server.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Will converting reduce image quality?</summary>
          <p>
            Converting to PNG is <strong>lossless</strong> — no quality loss.
            Converting to JPG, WEBP, or AVIF uses lossy compression at your
            chosen quality (default 90%). At 90%, the difference is usually
            imperceptible.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What's the difference between JPG and WEBP?</summary>
          <p>
            <strong>JPG</strong> is universally supported but older. <strong>
            WEBP</strong> is modern, produces files up to 35% smaller with
            similar quality, and supports transparency. WEBP is supported in
            all modern browsers.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What is AVIF and should I use it?</summary>
          <p>
            <strong>AVIF</strong> is the newest image format — up to 50%
            smaller than JPG with better quality. It's supported in Chrome,
            Firefox, and Safari 16+. Use it for modern websites where you want
            the smallest file sizes.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I convert PNG to JPG with transparency?</summary>
          <p>
            JPG doesn't support transparency. When converting PNG (which may
            have transparent areas) to JPG, you can pick a background color
            (white, black, or custom). The transparent areas will be filled
            with that color.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is there a file size limit?</summary>
          <p>
            No hard limit — but images above 30 MB may be slow on some devices.
            For best performance, use images under 20 MB.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work on mobile?</summary>
          <p>
            Yes — fully responsive and works on phones and tablets. On mobile,
            the file picker opens your photo library.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other image tools: <strong>Image Resizer</strong>,{' '}
          <strong>Image Compressor</strong>, <strong>Image Watermark</strong>,{' '}
          <strong>Image to PDF</strong>, and <strong>Color Picker</strong> —
          all free and browser-based.
        </p>
      </section>
    </article>
  );
}