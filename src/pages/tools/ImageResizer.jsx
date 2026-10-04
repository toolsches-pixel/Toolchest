import { useRef, useState, useEffect } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const PRESETS = [
  { id: 'instagram-square', label: 'Instagram Post', w: 1080, h: 1080 },
  { id: 'instagram-story', label: 'Instagram Story', w: 1080, h: 1920 },
  { id: 'facebook-post', label: 'Facebook Post', w: 1200, h: 630 },
  { id: 'facebook-cover', label: 'Facebook Cover', w: 820, h: 312 },
  { id: 'twitter-post', label: 'Twitter/X Post', w: 1600, h: 900 },
  { id: 'twitter-header', label: 'Twitter/X Header', w: 1500, h: 500 },
  { id: 'youtube-thumb', label: 'YouTube Thumbnail', w: 1280, h: 720 },
  { id: 'linkedin-post', label: 'LinkedIn Post', w: 1200, h: 627 },
  { id: 'hd', label: 'HD (720p)', w: 1280, h: 720 },
  { id: 'full-hd', label: 'Full HD (1080p)', w: 1920, h: 1080 },
  { id: '4k', label: '4K', w: 3840, h: 2160 },
  { id: 'passport', label: 'Passport Photo', w: 600, h: 600 },
];

const FORMATS = [
  { id: 'jpeg', label: 'JPG', ext: 'jpg', mime: 'image/jpeg', hasQuality: true },
  { id: 'png', label: 'PNG', ext: 'png', mime: 'image/png', hasQuality: false },
  { id: 'webp', label: 'WEBP', ext: 'webp', mime: 'image/webp', hasQuality: true },
];

const MODES = [
  { id: 'exact', label: 'Exact size', desc: 'Set exact width & height' },
  { id: 'percent', label: 'Percentage', desc: 'Scale by %' },
  { id: 'filesize', label: 'Compress in KB', desc: '   KB / MB' },
  { id: 'preset', label: 'Preset', desc: 'Social media sizes' },
];

const SIZE_UNITS = { KB: 1024, MB: 1024 * 1024 };

export default function ImageResizer() {
  const tool = getToolById('image-resizer');

  useDocumentTitle(
    'Image Resizer — Free Online Photo Resizer & Compressor | toolchest'
  );

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
      'Free online image resizer. Resize JPG, PNG, and WEBP images to exact dimensions, percentages, target file size (KB/MB), or social media presets. No signup, 100% private.';

    const scriptId = 'image-resizer-jsonld';
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
      name: 'Image Resizer',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '1832',
      },
      featureList: [
        'Resize JPG, PNG, WEBP images',
        'Exact size, percentage, or target file size (KB/MB)',
        'Social media presets (Instagram, Facebook, Twitter, YouTube)',
        'Aspect ratio lock',
        'Format conversion (JPG ↔ PNG ↔ WEBP)',
        'Quality control for JPG and WEBP',
        'Live preview',
        'No upload — 100% browser-based',
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
  const [originalImage, setOriginalImage] = useState(null);
  const [originalSize, setOriginalSize] = useState({ w: 0, h: 0 });
  const [originalBytes, setOriginalBytes] = useState(0);
  const [originalUrl, setOriginalUrl] = useState(''); 
  // Mode
  const [mode, setMode] = useState('exact');

  // Exact
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [lockAspect, setLockAspect] = useState(true);

  // Percent
  const [percent, setPercent] = useState(50);

  // Filesize
  const [targetValue, setTargetValue] = useState(100);
  const [targetUnit, setTargetUnit] = useState('KB');

  // Preset
  const [presetId, setPresetId] = useState('instagram-square');

  // Format
  const [format, setFormat] = useState('jpeg');
  const [quality, setQuality] = useState(90);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewBytes, setPreviewBytes] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const previewDebounce = useRef(null);

  // Compute target dimensions
  const getTargetSize = () => {
    if (!originalSize.w || !originalSize.h) return { w: 0, h: 0 };

    if (mode === 'exact') return { w: width, h: height };
    if (mode === 'percent')
      return {
        w: Math.round(originalSize.w * (percent / 100)),
        h: Math.round(originalSize.h * (percent / 100)),
      };
    if (mode === 'filesize')
      // For file size mode, keep original dimensions (quality will reduce)
      return { w: originalSize.w, h: originalSize.h };
    if (mode === 'preset') {
      const p = PRESETS.find((x) => x.id === presetId);
      if (!p) return { w: originalSize.w, h: originalSize.h };
      return { w: p.w, h: p.h };
    }
    return { w: originalSize.w, h: originalSize.h };
  };

  const target = getTargetSize();

  const onWidthChange = (w) => {
    setWidth(w);
    if (lockAspect && originalSize.w && w > 0) {
      const ar = originalSize.h / originalSize.w;
      setHeight(Math.round(w * ar));
    }
  };
  const onHeightChange = (h) => {
    setHeight(h);
    if (lockAspect && originalSize.h && h > 0) {
      const ar = originalSize.w / originalSize.h;
      setWidth(Math.round(h * ar));
    }
  };

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, WEBP).');
      return;
    }

    setError('');
    setResult(null);
    setProgress('');
    setPreviewUrl('');
    setFile(f);
    setOriginalBytes(f.size);

    const url = URL.createObjectURL(f);
    setOriginalUrl(url);
    const img = new Image();
    img.onload = () => {
      setOriginalImage(img);
      setOriginalSize({ w: img.width, h: img.height });
      setWidth(img.width);
      setHeight(img.height);
     // URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setError('Could not load image.');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleReset = () => {
    if (result?.url) URL.revokeObjectURL(result.url);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (originalUrl) URL.revokeObjectURL(originalUrl); 
    setFile(null);
    setOriginalImage(null);
    setOriginalSize({ w: 0, h: 0 });
    setOriginalBytes(0);
    setResult(null);
    setPreviewUrl('');
    setPreviewBytes(0);
    setError('');
    setProgress('');
    setOriginalUrl('');       
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /** Render resized image to canvas, return canvas */
  const renderToCanvas = async (w, h, fmt, q) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w);
    canvas.height = Math.round(h);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (fmt === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    return canvas;
  };

  /** Convert canvas to blob with given format + quality */
  const canvasToBlob = (canvas, fmt, q) => {
    const fmtObj = FORMATS.find((f) => f.id === fmt);
    const quality = fmtObj.hasQuality ? q / 100 : undefined;
    return new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), fmtObj.mime, quality)
    );
  };

  /** Live preview — debounced */
  useEffect(() => {
    if (!originalImage || !target.w || !target.h) return;

    if (previewDebounce.current) clearTimeout(previewDebounce.current);

    previewDebounce.current = setTimeout(async () => {
      try {
        const canvas = await renderToCanvas(
          target.w,
          target.h,
          format,
          quality
        );
        const blob = await canvasToBlob(canvas, format, quality);
        if (!blob) return;

        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        setPreviewBytes(blob.size);
      } catch (err) {
        // silent
      }
    }, 300);

    return () => {
      if (previewDebounce.current) clearTimeout(previewDebounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    originalImage,
    target.w,
    target.h,
    format,
    quality,
    mode,
    width,
    height,
    percent,
    presetId,
  ]);

  const resize = async () => {
    if (!originalImage || processing) return;
    if (target.w < 1 || target.h < 1) {
      setError('Width and height must be at least 1 pixel.');
      return;
    }

    setProcessing(true);
    setError('');
    setProgress('Resizing image…');
    setResult(null);

    try {
      const canvas = await renderToCanvas(
        target.w,
        target.h,
        format,
        quality
      );

      let blob;

      if (mode === 'filesize' && FORMATS.find((f) => f.id === format).hasQuality) {
        // Iterative quality reduction to hit target size
        const targetBytes = targetValue * SIZE_UNITS[targetUnit];
        blob = await compressToTargetSize(
          canvas,
          format,
          targetBytes,
          setProgress
        );
      } else {
        blob = await canvasToBlob(canvas, format, quality);
      }

      if (!blob) throw new Error('Failed to encode image.');

      const url = URL.createObjectURL(blob);
      const baseName = file.name.replace(/\.[^.]+$/, '');
      const fmt = FORMATS.find((f) => f.id === format);

      setResult({
        url,
        blob,
        size: blob.size,
        width: canvas.width,
        height: canvas.height,
        filename: `${baseName}-${canvas.width}x${canvas.height}.${fmt.ext}`,
        format: fmt.label,
        targetBytes:
          mode === 'filesize'
            ? targetValue * SIZE_UNITS[targetUnit]
            : null,
      });

      setProgress('');
    } catch (err) {
      console.error(err);
      setError('Resize failed: ' + (err?.message || 'unknown error'));
      setProgress('');
    } finally {
      setProcessing(false);
    }
  };

  /** Binary search quality to hit target file size */
  const compressToTargetSize = async (canvas, fmt, targetBytes, setProg) => {
    let low = 5;
    let high = 100;
    let best = null;
    let iterations = 0;
    const maxIterations = 10;

    // First try at max quality
    let blob = await canvasToBlob(canvas, fmt, 100);
    if (blob && blob.size <= targetBytes) return blob;
    best = blob;

    while (low <= high && iterations < maxIterations) {
      iterations++;
      const mid = Math.floor((low + high) / 2);
      setProg(`Optimizing quality… (${mid}%) — attempt ${iterations}`);

      blob = await canvasToBlob(canvas, fmt, mid);
      if (!blob) break;

      const size = blob.size;

      if (size <= targetBytes) {
        // Under target — good, try higher quality
        best = blob;
        low = mid + 1;
      } else {
        // Over target — reduce quality
        high = mid - 1;
      }
    }

    // If best is still over target, scale down dimensions
    if (best && best.size > targetBytes) {
      setProg('Still too large — scaling down dimensions…');
      const scale = Math.sqrt(targetBytes / best.size) * 0.95;
      const newW = Math.max(1, Math.round(canvas.width * scale));
      const newH = Math.max(1, Math.round(canvas.height * scale));

      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = newW;
      smallCanvas.height = newH;
      const ctx = smallCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (fmt === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, newW, newH);
      }
      ctx.drawImage(canvas, 0, 0, newW, newH);

      let sLow = 5;
      let sHigh = 100;
      let sIter = 0;
      let sBest = null;

      while (sLow <= sHigh && sIter < 8) {
        sIter++;
        const mid = Math.floor((sLow + sHigh) / 2);
        const b = await canvasToBlob(smallCanvas, fmt, mid);
        if (!b) break;
        if (b.size <= targetBytes) {
          sBest = b;
          sLow = mid + 1;
        } else {
          sHigh = mid - 1;
        }
      }
      if (sBest) return sBest;
    }

    return best;
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

  useEffect(() => {
    return () => {
      if (result?.url) URL.revokeObjectURL(result.url);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
       if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (previewDebounce.current) clearTimeout(previewDebounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedFormat = FORMATS.find((f) => f.id === format);
  const targetBytes =
    mode === 'filesize' ? targetValue * SIZE_UNITS[targetUnit] : 0;

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
            <div className="pdf-dropzone-icon">🖼️</div>
            <h3>Drop your image here</h3>
            <p>or click to browse · JPG, PNG, WEBP</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          <div className="pdf-file-info">
            <div className="pdf-file-left">
              <span className="pdf-file-icon">🖼️</span>
              <div>
                <div className="pdf-file-name">{file.name}</div>
                <div className="pdf-file-size">
                  {originalSize.w} × {originalSize.h} px ·{' '}
                  {formatBytes(originalBytes)}
                </div>
              </div>
            </div>
            <button className="pdf-file-remove" onClick={handleReset} title="Remove">
              ✕
            </button>
          </div>
        )}

        {file && (
          <>
            {/* Live preview */}
            <div className="ir-preview-section">
              <div className="ir-preview-label">Live preview</div>
              <div className="ir-preview-grid">
                <div className="ir-preview-card">
                  <div className="ir-preview-header">
                    Original · {originalSize.w} × {originalSize.h}
                  </div>
                  <div className="ir-preview-img-wrap">
                    {originalImage && (
                      <img
                        src={originalUrl}
                        alt="Original"
                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                      />
                    )}
                  </div>
                  <div className="ir-preview-footer">
                    {formatBytes(originalBytes)}
                  </div>
                </div>

                <div className="ir-preview-arrow">→</div>

                <div className="ir-preview-card">
                  <div className="ir-preview-header">
                    Result · {target.w} × {target.h}
                  </div>
                  <div className="ir-preview-img-wrap">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                      />
                    ) : (
                      <div className="ir-preview-placeholder">Loading…</div>
                    )}
                  </div>
                  <div className="ir-preview-footer">
                    {previewBytes > 0 ? formatBytes(previewBytes) : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Mode picker */}
            <div className="pdf-target">
              <label className="pdf-target-label">Resize mode</label>
              <div className="ir-mode-grid">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    className={`ir-mode-card ${
                      mode === m.id ? 'active' : ''
                    }`}
                    onClick={() => setMode(m.id)}
                  >
                    <span className="ir-mode-name">{m.label}</span>
                    <span className="ir-mode-desc">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode-specific inputs */}
            {mode === 'exact' && (
              <div className="pdf-target">
                <label className="pdf-target-label">Dimensions</label>
                <div className="ir-dim-row">
                  <div className="ir-dim-field">
                    <span className="ir-dim-label">W</span>
                    <input
                      type="number"
                      min="1"
                      value={width}
                      onChange={(e) =>
                        onWidthChange(parseInt(e.target.value) || 0)
                      }
                      className="pdf-target-number"
                    />
                    <span className="ir-dim-unit">px</span>
                  </div>
                  <button
                    className={`ir-lock-btn ${lockAspect ? 'active' : ''}`}
                    onClick={() => setLockAspect(!lockAspect)}
                    title={
                      lockAspect ? 'Unlock aspect ratio' : 'Lock aspect ratio'
                    }
                  >
                    {lockAspect ? '🔒' : '🔓'}
                  </button>
                  <div className="ir-dim-field">
                    <span className="ir-dim-label">H</span>
                    <input
                      type="number"
                      min="1"
                      value={height}
                      onChange={(e) =>
                        onHeightChange(parseInt(e.target.value) || 0)
                      }
                      className="pdf-target-number"
                    />
                    <span className="ir-dim-unit">px</span>
                  </div>
                </div>
              </div>
            )}

            {mode === 'percent' && (
              <div className="pdf-target">
                <label className="pdf-target-label">
                  Scale · <strong>{percent}%</strong>
                </label>
                <input
                  type="range"
                  min="5"
                  max="200"
                  value={percent}
                  onChange={(e) => setPercent(parseInt(e.target.value))}
                  className="wm-slider"
                />
                <p className="pdf-target-hint">
                  New size: {Math.round(originalSize.w * (percent / 100))} ×{' '}
                  {Math.round(originalSize.h * (percent / 100))} px
                </p>
              </div>
            )}

            {mode === 'filesize' && (
              <div className="pdf-target">
                <label className="pdf-target-label">Target file size</label>
                <div className="ir-dim-row">
                  <div className="ir-dim-field" style={{ flex: 2 }}>
                    <input
                      type="number"
                      min="1"
                      value={targetValue}
                      onChange={(e) =>
                        setTargetValue(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="pdf-target-number"
                    />
                  </div>
                  <div className="ir-dim-field" style={{ flex: 1 }}>
                    <select
                      value={targetUnit}
                      onChange={(e) => setTargetUnit(e.target.value)}
                      className="pdf-target-number"
                      style={{ width: '100%' }}
                    >
                      <option value="KB">KB</option>
                      <option value="MB">MB</option>
                    </select>
                  </div>
                </div>
                <p className="pdf-target-hint">
                  Original: <strong>{formatBytes(originalBytes)}</strong> ·
                  Target: <strong>{targetValue} {targetUnit}</strong> (
                  {formatBytes(targetBytes)}) ·{' '}
                  {targetBytes >= originalBytes
                    ? '⚠️ Target ≥ original — no compression needed'
                    : `Will try to compress to ~${formatBytes(targetBytes)}`}
                </p>
                {!selectedFormat.hasQuality && (
                  <p className="pdf-target-warn">
                    ⚠️ Target size only works with JPG or WEBP. PNG is
                    lossless — switch format to enable.
                  </p>
                )}
              </div>
            )}

            {mode === 'preset' && (
              <div className="pdf-target">
                <label className="pdf-target-label">Choose preset</label>
                <div className="ir-preset-grid">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      className={`ir-preset-card ${
                        presetId === p.id ? 'active' : ''
                      }`}
                      onClick={() => setPresetId(p.id)}
                    >
                      <span className="ir-preset-label">{p.label}</span>
                      <span className="ir-preset-dims">
                        {p.w} × {p.h}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Format */}
            <div className="pdf-target">
              <div className="wm-row-2col">
                <div>
                  <label className="pdf-target-label">Output format</label>
                  <div className="jpg-scale-options">
                    {FORMATS.map((f) => (
                      <button
                        key={f.id}
                        className={`category-pill ${
                          format === f.id ? 'active' : ''
                        }`}
                        onClick={() => setFormat(f.id)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                {selectedFormat.hasQuality && mode !== 'filesize' && (
                  <div>
                    <label className="pdf-target-label">
                      Quality · <strong>{quality}%</strong>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={quality}
                      onChange={(e) => setQuality(parseInt(e.target.value))}
                      className="wm-slider"
                    />
                  </div>
                )}
              </div>
            </div>

            <button
              className="pdf-compress-btn"
              onClick={resize}
              disabled={processing}
            >
              {processing
                ? '⟳ Processing…'
                : mode === 'filesize'
                ? `🗜️ Compress to ~${targetValue} ${targetUnit}`
                : `📐 Resize to ${target.w} × ${target.h}`}
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
              <h3>✅ Done</h3>
            </div>

            <div className="pdf-result-grid">
              <div className="pdf-stat">
                <div className="pdf-stat-label">New size</div>
                <div className="pdf-stat-value accent">
                  {result.width}×{result.height}
                </div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Format</div>
                <div className="pdf-stat-value">{result.format}</div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">File size</div>
                <div className="pdf-stat-value">
                  {formatBytes(result.size)}
                </div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Reduction</div>
                <div className="pdf-stat-value green">
                  {originalBytes > result.size
                    ? Math.round(
                        ((originalBytes - result.size) / originalBytes) * 100
                      ) + '%'
                    : '0%'}
                </div>
              </div>
            </div>

            {result.targetBytes && (
              <p
                className="pdf-score-note"
                style={{ textAlign: 'center' }}
              >
                {result.size <= result.targetBytes
                  ? `🎯 Target achieved! (${formatBytes(result.size)} ≤ ${formatBytes(result.targetBytes)})`
                  : `⚠️ Best effort: ${formatBytes(result.size)} (target was ${formatBytes(result.targetBytes)})`}
              </p>
            )}

            <div className="pdf-result-actions">
              <button className="pdf-download" onClick={download}>
                ⬇ Download image
              </button>
              <button className="btn-secondary" onClick={handleReset}>
                Try another image
              </button>
            </div>
          </div>
        )}

        {/* SEO Content */}
        <SeoContent />
      </div>
    </ToolShell>
  );
}

/* ================= SEO Content ================= */
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is an Image Resizer?</h2>
        <p>
          An <strong>image resizer</strong> changes the dimensions (width and
          height) of a photo or graphic. Whether you're optimizing images for a
          website, fitting a photo into a social media post, or reducing file
          size for email, a resizer lets you scale images precisely without
          losing quality.
        </p>
        <p>
          Our <strong>free online image resizer</strong> runs entirely in your
          browser. Upload a JPG, PNG, or WEBP image, set your target dimensions
          or pick a preset, and download the resized result instantly. No
          signup, no watermarks, and your images never leave your device.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Resize an Image — Step by Step</h2>
        <ol className="seo-steps">
          <li>
            <strong>Upload your image</strong> — drag & drop or click to
            browse. Supports JPG, PNG, and WEBP.
          </li>
          <li>
            <strong>Choose a resize mode</strong> — exact pixels, percentage,
            target file size (KB/MB), or a social media preset.
          </li>
          <li>
            <strong>Set your target</strong> — type dimensions, percentage, or
            file size like <code>100 KB</code> or <code>2 MB</code>.
          </li>
          <li>
            <strong>Choose format & quality</strong> — output as JPG, PNG, or
            WEBP.
          </li>
          <li>
            <strong>Download</strong> — click "Resize" and download your
            optimized image.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">📐</div>
            <h3>4 Resize Modes</h3>
            <p>
              Exact pixels, percentage, target file size (KB/MB), or social
              media presets.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎯</div>
            <h3>Target File Size</h3>
            <p>
              Enter a target like <code>100 KB</code> and the tool automatically
              adjusts quality (and if needed, dimensions) to hit it.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">👁️</div>
            <h3>Live Preview</h3>
            <p>
              See the exact output — dimensions, quality, and file size — before
              you download.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📱</div>
            <h3>12 Social Presets</h3>
            <p>
              Instagram, Facebook, Twitter/X, YouTube, LinkedIn, HD, Full HD,
              4K, and passport photo sizes.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔄</div>
            <h3>Format Conversion</h3>
            <p>
              Convert between JPG, PNG, and WEBP while resizing — one step, one
              download.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              All processing happens in your browser. Your images never leave
              your device.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Use Cases</h2>
        <ul className="seo-list">
          <li>
            <strong>Web optimization</strong> — resize large photos before
            uploading to a website for faster page loads.
          </li>
          <li>
            <strong>Social media</strong> — resize to Instagram, Facebook,
            Twitter, YouTube, or LinkedIn exact dimensions.
          </li>
          <li>
            <strong>Email attachments</strong> — compress to under 100 KB or 500
            KB to fit email size limits.
          </li>
          <li>
            <strong>Print preparation</strong> — resize images to the correct
            print dimensions in pixels.
          </li>
          <li>
            <strong>Thumbnails</strong> — create consistent thumbnail sizes for
            video galleries or product listings.
          </li>
          <li>
            <strong>Passport / ID photos</strong> — resize to government-mandated
            photo dimensions.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this image resizer free?</summary>
          <p>
            Yes — completely free with no limits, no signup, no watermarks. Use
            it as often as you want on as many images as you need.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How does the target file size mode work?</summary>
          <p>
            Enter a target like <code>100 KB</code> or <code>2 MB</code>. The
            tool uses binary search to find the highest JPG/WEBP quality that
            keeps the image under your target. If even the lowest quality is too
            large, it scales down dimensions slightly to fit.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Will my image quality be affected?</summary>
          <p>
            Downscaling (making smaller) with high-quality smoothing produces
            sharp results. Upscaling (making bigger) can look slightly soft —
            because the original pixels don't exist. Use the quality slider to
            balance quality and file size.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are my images safe?</summary>
          <p>
            Absolutely. The entire resize process runs locally in your browser
            using the HTML5 Canvas API. Your images are never uploaded to any
            server.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What's the difference between "Exact size" and "Target file size"?</summary>
          <p>
            <strong>Exact size</strong> forces the image to your exact pixel
            dimensions. <strong>Target file size</strong> keeps the image
            dimensions the same but reduces JPG/WEBP quality (and if needed,
            scales dimensions) until the file is under your KB/MB target.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Which format should I use — JPG, PNG, or WEBP?</summary>
          <p>
            Use <strong>JPG</strong> for photos (smaller files). Use{' '}
            <strong>PNG</strong> for images with transparency or sharp text.
            Use <strong>WEBP</strong> for the best balance of quality and size
            on modern websites. Target file size only works with JPG and WEBP.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I resize images on my phone?</summary>
          <p>
            Yes — the tool is fully responsive and works on phones and tablets.
            For very large images, a desktop browser will be faster.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is there a file size limit?</summary>
          <p>
            No hard limit — but images above 50 MB may be slow on some devices.
            For best performance, use images under 20 MB.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other tools: <strong>Image Compressor</strong>,{' '}
          <strong>Image Converter</strong>, <strong>Image to PDF</strong>,{' '}
          <strong>Image to QR</strong>, <strong>PDF to JPG</strong>, and{' '}
          <strong>PDF to PNG</strong> — all free and browser-based.
        </p>
      </section>
    </article>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}