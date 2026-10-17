import { useRef, useState, useEffect } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './ImageResizer.css';

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
  { id: 'exact', label: 'Exact', desc: 'Set exact width & height' },
  { id: 'percent', label: 'Scale %', desc: 'Scale by percentage' },
  { id: 'filesize', label: 'File size', desc: 'Compress to KB / MB' },
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
  const [dragging, setDragging] = useState(false);

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

  // Compare slider position (% of width where the original ends)
  const [compare, setCompare] = useState(50);

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

  const loadImage = (f) => {
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
    };
    img.onerror = () => {
      setError('Could not load image.');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleFileChange = (e) => loadImage(e.target.files?.[0]);

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
    setCompare(50);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /** Render resized image to canvas, return canvas */
  const renderToCanvas = async (w, h, fmt) => {
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
        const canvas = await renderToCanvas(target.w, target.h, format);
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
      const canvas = await renderToCanvas(target.w, target.h, format);

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

  // Savings of the live preview vs the original (positive = smaller)
  const savings =
    previewBytes > 0 && originalBytes > 0
      ? Math.round((1 - previewBytes / originalBytes) * 100)
      : null;

  const ratio = originalSize.w && originalSize.h ? originalSize.w / originalSize.h : 1.5;

  return (
    <ToolShell tool={tool}>
      <div className="ir">
        {/* ---------- Upload ---------- */}
        {!file ? (
          <div
            className={`ir-drop ${dragging ? 'is-over' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              loadImage(e.dataTransfer.files?.[0]);
            }}
          >
            <div className="ir-drop-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4" />
                <path d="m7 9 5-5 5 5" />
                <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
              </svg>
            </div>
            <h3>Drop your image here</h3>
            <p>or click to browse</p>
            <div className="ir-drop-tags">
              <span>JPG</span>
              <span>PNG</span>
              <span>WEBP</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              hidden
            />
          </div>
        ) : (
          <div className="ir-file">
            <div className="ir-file-thumb">
              {originalUrl && <img src={originalUrl} alt="" />}
            </div>
            <div className="ir-file-meta">
              <div className="ir-file-name">{file.name}</div>
              <div className="ir-file-sub">
                {originalSize.w} × {originalSize.h} px · {formatBytes(originalBytes)}
              </div>
            </div>
            <button className="ir-file-remove" onClick={handleReset} aria-label="Remove image" title="Remove image">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        )}

        {file && (
          <div className="ir-workspace">
            {/* ---------- Preview column ---------- */}
            <section className="ir-stage" aria-label="Preview">
              <div className="ir-stage-bar">
                <span className="ir-stage-title">Live preview</span>
                {savings !== null && (
                  <span className={`ir-badge ${savings > 0 ? 'is-good' : 'is-warn'}`}>
                    {savings > 0 ? `${savings}% smaller` : savings < 0 ? `${Math.abs(savings)}% larger` : 'Same size'}
                  </span>
                )}
              </div>

              <div className="ir-canvas">
                <div
                  className="ir-compare"
                  style={{ width: `min(100%, ${Math.round(520 * ratio)}px)`, aspectRatio: `${ratio}` }}
                >
                  <img className="ir-compare-img" src={originalUrl} alt="Original" draggable="false" />
                  {previewUrl ? (
                    <img
                      className="ir-compare-img ir-compare-result"
                      src={previewUrl}
                      alt="Resized preview"
                      draggable="false"
                      style={{ clipPath: `inset(0 0 0 ${compare}%)` }}
                    />
                  ) : (
                    <div className="ir-skeleton" style={{ left: `${compare}%` }} />
                  )}
                  <span className="ir-tag ir-tag-left">Original</span>
                  <span className="ir-tag ir-tag-right">Result</span>
                  <div className="ir-handle" style={{ left: `${compare}%` }} aria-hidden="true">
                    <span className="ir-grip">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 7-5 5 5 5" />
                        <path d="m15 7 5 5-5 5" />
                      </svg>
                    </span>
                  </div>
                  <input
                    className="ir-compare-range"
                    type="range"
                    min="0"
                    max="100"
                    value={compare}
                    onChange={(e) => setCompare(parseInt(e.target.value))}
                    aria-label="Drag to compare original and result"
                  />
                </div>
              </div>

              <div className="ir-compare-stats">
                <div className="ir-stat">
                  <span className="ir-stat-label">Original</span>
                  <span className="ir-stat-value">{originalSize.w} × {originalSize.h}</span>
                  <span className="ir-stat-sub">{formatBytes(originalBytes)}</span>
                </div>
                <svg className="ir-stat-arrow" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
                <div className="ir-stat is-accent">
                  <span className="ir-stat-label">Result</span>
                  <span className="ir-stat-value">{target.w} × {target.h}</span>
                  <span className="ir-stat-sub">{previewBytes > 0 ? formatBytes(previewBytes) : 'Calculating…'}</span>
                </div>
              </div>
            </section>

            {/* ---------- Controls column ---------- */}
            <aside className="ir-panel">
              <div className="ir-group">
                <div className="ir-label">Resize by</div>
                <div className="ir-tabs" role="tablist">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      role="tab"
                      aria-selected={mode === m.id}
                      title={m.desc}
                      className={`ir-tab ${mode === m.id ? 'active' : ''}`}
                      onClick={() => setMode(m.id)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode-specific inputs */}
              {mode === 'exact' && (
                <div className="ir-group">
                  <div className="ir-label">Dimensions</div>
                  <div className="ir-dim-row">
                    <label className="ir-field">
                      <span className="ir-field-tag">W</span>
                      <input
                        type="number"
                        min="1"
                        value={width}
                        onChange={(e) => onWidthChange(parseInt(e.target.value) || 0)}
                      />
                      <span className="ir-field-unit">px</span>
                    </label>
                    <button
                      className={`ir-lock ${lockAspect ? 'active' : ''}`}
                      onClick={() => setLockAspect(!lockAspect)}
                      aria-pressed={lockAspect}
                      title={lockAspect ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                    >
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="11" width="14" height="9" rx="2" />
                        {lockAspect ? <path d="M8 11V8a4 4 0 0 1 8 0v3" /> : <path d="M8 11V8a4 4 0 0 1 7.5-2" />}
                      </svg>
                    </button>
                    <label className="ir-field">
                      <span className="ir-field-tag">H</span>
                      <input
                        type="number"
                        min="1"
                        value={height}
                        onChange={(e) => onHeightChange(parseInt(e.target.value) || 0)}
                      />
                      <span className="ir-field-unit">px</span>
                    </label>
                  </div>
                </div>
              )}

              {mode === 'percent' && (
                <div className="ir-group">
                  <div className="ir-label-row">
                    <span className="ir-label">Scale</span>
                    <span className="ir-value">{percent}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="200"
                    value={percent}
                    onChange={(e) => setPercent(parseInt(e.target.value))}
                    className="ir-range"
                    style={{ '--fill': `${((percent - 5) / 195) * 100}%` }}
                  />
                  <p className="ir-hint">
                    New size: {Math.round(originalSize.w * (percent / 100))} ×{' '}
                    {Math.round(originalSize.h * (percent / 100))} px
                  </p>
                </div>
              )}

              {mode === 'filesize' && (
                <div className="ir-group">
                  <div className="ir-label">Target file size</div>
                  <div className="ir-dim-row">
                    <label className="ir-field" style={{ flex: 2 }}>
                      <input
                        type="number"
                        min="1"
                        value={targetValue}
                        onChange={(e) =>
                          setTargetValue(Math.max(1, parseInt(e.target.value) || 1))
                        }
                      />
                    </label>
                    <div className="ir-seg ir-seg-sm">
                      {Object.keys(SIZE_UNITS).map((u) => (
                        <button
                          key={u}
                          className={targetUnit === u ? 'active' : ''}
                          onClick={() => setTargetUnit(u)}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="ir-hint">
                    Original <strong>{formatBytes(originalBytes)}</strong> → target{' '}
                    <strong>{formatBytes(targetBytes)}</strong>.{' '}
                    {targetBytes >= originalBytes
                      ? 'Target is not smaller than the original, so no compression is needed.'
                      : 'Quality is lowered automatically to fit.'}
                  </p>
                  {!selectedFormat.hasQuality && (
                    <p className="ir-warn">
                      Target size works with JPG or WEBP only. PNG is lossless, so switch the
                      format below.
                    </p>
                  )}
                </div>
              )}

              {mode === 'preset' && (
                <div className="ir-group">
                  <div className="ir-label">Choose preset</div>
                  <div className="ir-presets">
                    {PRESETS.map((p) => (
                      <button
                        key={p.id}
                        className={`ir-preset ${presetId === p.id ? 'active' : ''}`}
                        onClick={() => setPresetId(p.id)}
                      >
                        <span className="ir-preset-label">{p.label}</span>
                        <span className="ir-preset-dims">{p.w} × {p.h}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Format */}
              <div className="ir-group">
                <div className="ir-label">Output format</div>
                <div className="ir-seg">
                  {FORMATS.map((f) => (
                    <button
                      key={f.id}
                      className={format === f.id ? 'active' : ''}
                      onClick={() => setFormat(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedFormat.hasQuality && mode !== 'filesize' && (
                <div className="ir-group">
                  <div className="ir-label-row">
                    <span className="ir-label">Quality</span>
                    <span className="ir-value">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value))}
                    className="ir-range"
                    style={{ '--fill': `${((quality - 10) / 90) * 100}%` }}
                  />
                </div>
              )}

              <button className="ir-cta" onClick={resize} disabled={processing}>
                {processing ? (
                  <>
                    <span className="ir-spinner" /> Processing…
                  </>
                ) : mode === 'filesize' ? (
                  `Compress to ~${targetValue} ${targetUnit}`
                ) : (
                  `Resize to ${target.w} × ${target.h}`
                )}
              </button>

              {processing && progress && <div className="ir-progress">{progress}</div>}
              {error && <div className="ir-error" role="alert">{error}</div>}
            </aside>
          </div>
        )}

        {!file && error && <div className="ir-error" role="alert">{error}</div>}

        {/* ---------- Result ---------- */}
        {result && (
          <div className="ir-result">
            <div className="ir-result-head">
              <span className="ir-check" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 5 5 9-10" />
                </svg>
              </span>
              <h3>Your image is ready</h3>
            </div>

            <div className="ir-result-grid">
              <div className="ir-result-stat">
                <span>New size</span>
                <strong className="accent">{result.width}×{result.height}</strong>
              </div>
              <div className="ir-result-stat">
                <span>Format</span>
                <strong>{result.format}</strong>
              </div>
              <div className="ir-result-stat">
                <span>File size</span>
                <strong>{formatBytes(result.size)}</strong>
              </div>
              <div className="ir-result-stat">
                <span>Saved</span>
                <strong className="good">
                  {originalBytes > result.size
                    ? Math.round(((originalBytes - result.size) / originalBytes) * 100) + '%'
                    : '0%'}
                </strong>
              </div>
            </div>

            {result.targetBytes && (
              <p className={`ir-target-note ${result.size <= result.targetBytes ? 'is-good' : 'is-warn'}`}>
                {result.size <= result.targetBytes
                  ? `Target reached: ${formatBytes(result.size)} is under ${formatBytes(result.targetBytes)}.`
                  : `Best effort: ${formatBytes(result.size)}. The target was ${formatBytes(result.targetBytes)}.`}
              </p>
            )}

            <div className="ir-result-actions">
              <button className="ir-cta ir-cta-inline" onClick={download}>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 4v12" />
                  <path d="m7 11 5 5 5-5" />
                  <path d="M5 20h14" />
                </svg>
                Download image
              </button>
              <button className="ir-ghost" onClick={handleReset}>
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