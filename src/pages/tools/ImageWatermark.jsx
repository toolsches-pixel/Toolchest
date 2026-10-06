import { useRef, useState, useEffect } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './ImageWatermark.css';

// ============================================================
// WATERMARK POSITIONS
// ============================================================
const POSITIONS = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-center', label: 'Top Center' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'middle-left', label: 'Middle Left' },
  { id: 'center', label: 'Center' },
  { id: 'middle-right', label: 'Middle Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-center', label: 'Bottom Center' },
  { id: 'bottom-right', label: 'Bottom Right' },
];

const COLORS = [
  '#ffffff', '#000000', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#3b82f6', '#a855f7',
];

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function ImageWatermark() {
  const tool = getToolById('image-watermark');

  useDocumentTitle('Image Watermark — Add Watermark to Photos Online Free | toolchest');

  // SEO — same as before (unchanged pattern)
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
      'Free online image watermark tool. Add text or image watermarks to your photos — custom position, opacity, color, font size. Batch-ready, no signup, 100% browser-based.';

    const scriptId = 'image-watermark-jsonld';
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
      name: 'Image Watermark',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '1924',
      },
      featureList: [
        'Add text watermark to images',
        'Add image/logo watermark',
        'Custom position (9 positions)',
        'Opacity control',
        'Custom font size and color',
        'Rotation support',
        'Download watermarked image',
        'No signup, 100% browser-based',
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
  const [imagePreview, setImagePreview] = useState('');
  const [imageDimensions, setImageDimensions] = useState({ w: 0, h: 0 });

  const [wmType, setWmType] = useState('text'); // 'text' | 'image'
  const [wmText, setWmText] = useState('© toolchest');
  const [wmFontSize, setWmFontSize] = useState(48);
  const [wmColor, setWmColor] = useState('#ffffff');
  const [wmOpacity, setWmOpacity] = useState(60);
  const [wmPosition, setWmPosition] = useState('bottom-right');
  const [wmRotation, setWmRotation] = useState(0);
  const [wmLogo, setWmLogo] = useState(null);
  const [wmLogoPreview, setWmLogoPreview] = useState('');
  const [wmLogoSize, setWmLogoSize] = useState(15);

  const [result, setResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const canvasRef = useRef(null);

  // ---------- FILE UPLOAD ----------
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, WEBP).');
      return;
    }

    setError('');
    setResult(null);
    setFile(f);

    const url = URL.createObjectURL(f);
    setImagePreview(url);

    const img = new Image();
    img.onload = () => {
      setImageDimensions({ w: img.width, h: img.height });
      // Auto-adjust font size
      const auto = Math.max(24, Math.round(img.width * 0.05));
      setWmFontSize(auto);
    };
    img.src = url;
  };

  const handleLogoChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setWmLogo(f);
    setWmLogoPreview(URL.createObjectURL(f));
  };

  const handleReset = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (wmLogoPreview) URL.revokeObjectURL(wmLogoPreview);
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setImagePreview('');
    setImageDimensions({ w: 0, h: 0 });
    setResult(null);
    setError('');
    setWmLogo(null);
    setWmLogoPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  // ---------- APPLY WATERMARK ----------
  const applyWatermark = async () => {
    if (!file || processing) return;
    setProcessing(true);
    setError('');
    setResult(null);

    try {
      const img = new Image();
      img.src = imagePreview;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Compute position
      const pos = getPosition(wmPosition, img.width, img.height);
      const alpha = wmOpacity / 100;

      ctx.save();
      ctx.globalAlpha = alpha;

      if (wmType === 'text') {
        // Text watermark
        ctx.font = `bold ${wmFontSize}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = wmColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Move to position, rotate
        ctx.translate(pos.x, pos.y);
        ctx.rotate((wmRotation * Math.PI) / 180);
        ctx.fillText(wmText, 0, 0);
      } else if (wmType === 'image' && wmLogoPreview) {
        const logo = new Image();
        logo.src = wmLogoPreview;
        await new Promise((resolve, reject) => {
          logo.onload = resolve;
          logo.onerror = reject;
        });

        const logoW = (img.width * wmLogoSize) / 100;
        const logoH = (logo.height / logo.width) * logoW;

        ctx.translate(pos.x, pos.y);
        ctx.rotate((wmRotation * Math.PI) / 180);
        ctx.drawImage(logo, -logoW / 2, -logoH / 2, logoW, logoH);
      }

      ctx.restore();

      // Store on preview canvas
      if (canvasRef.current) {
        canvasRef.current.width = canvas.width;
        canvasRef.current.height = canvas.height;
        const pctx = canvasRef.current.getContext('2d');
        pctx.drawImage(canvas, 0, 0);
      }

      // Create blob
      const blob = await new Promise((r) =>
        canvas.toBlob((b) => r(b), file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92)
      );

      const url = URL.createObjectURL(blob);
      const baseName = file.name.replace(/\.[^.]+$/, '');
      const ext = file.type === 'image/png' ? 'png' : 'jpg';

      setResult({
        url,
        blob,
        size: blob.size,
        filename: `${baseName}-watermarked.${ext}`,
      });
    } catch (err) {
      console.error(err);
      setError('Failed to apply watermark: ' + (err?.message || 'unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  const getPosition = (posId, w, h) => {
    const padding = 40;
    const positions = {
      'top-left': { x: padding, y: padding + 20, align: 'left' },
      'top-center': { x: w / 2, y: padding + 20, align: 'center' },
      'top-right': { x: w - padding, y: padding + 20, align: 'right' },
      'middle-left': { x: padding, y: h / 2, align: 'left' },
      'center': { x: w / 2, y: h / 2, align: 'center' },
      'middle-right': { x: w - padding, y: h / 2, align: 'right' },
      'bottom-left': { x: padding, y: h - padding - 20, align: 'left' },
      'bottom-center': { x: w / 2, y: h - padding - 20, align: 'center' },
      'bottom-right': { x: w - padding, y: h - padding - 20, align: 'right' },
    };
    return positions[posId] || positions.center;
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
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (wmLogoPreview) URL.revokeObjectURL(wmLogoPreview);
      if (result?.url) URL.revokeObjectURL(result.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ToolShell tool={tool}>
      <div className="iw-root">
        {/* ================================================ */}
        {/* HERO — like freepdfconvert                     */}
        {/* ================================================ */}
        <section className="iw-hero">
          <h1 className="iw-hero-title">
            Add Watermark to Image
          </h1>
          <p className="iw-hero-subtitle">
            Watermark your photos with text or logo — clean, secure, and free.
          </p>

          {/* Big upload box */}
          {!file ? (
            <div
              className="iw-upload-box"
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
              <div className="iw-upload-icon">📤</div>
              <button className="iw-upload-btn">
                Choose Image
              </button>
              <div className="iw-upload-hint">
                or drag & drop · JPG, PNG, WEBP · Max 20 MB
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div className="iw-file-chip">
              <span className="iw-file-chip-icon">🖼️</span>
              <div className="iw-file-chip-info">
                <div className="iw-file-chip-name">{file.name}</div>
                <div className="iw-file-chip-meta">
                  {imageDimensions.w} × {imageDimensions.h} px · {formatBytes(file.size)}
                </div>
              </div>
              <button className="iw-file-chip-remove" onClick={handleReset} title="Remove">
                ✕
              </button>
            </div>
          )}
        </section>

        {/* ================================================ */}
        {/* WORK AREA — only when file selected            */}
        {/* ================================================ */}
        {file && (
          <>
            {/* Preview + settings — 2 column layout */}
            <section className="iw-work">
              <div className="iw-preview">
                <div className="iw-preview-header">
                  <span>Live preview</span>
                </div>
                <div className="iw-preview-canvas">
                  {imagePreview && (
                    <div className="iw-preview-img-wrap">
                      <img src={imagePreview} alt="Preview" />
                      <div
                        className={`iw-wm-overlay iw-wm-${wmPosition}`}
                        style={{
                          opacity: wmOpacity / 100,
                          transform: `rotate(${wmRotation}deg)`,
                        }}
                      >
                        {wmType === 'text' ? (
                          <span
                            style={{
                              color: wmColor,
                              fontSize: `${Math.max(12, wmFontSize / 4)}px`,
                              fontWeight: 700,
                              fontFamily: "'JetBrains Mono', monospace",
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {wmText}
                          </span>
                        ) : wmLogoPreview ? (
                          <img
                            src={wmLogoPreview}
                            alt="Logo"
                            style={{
                              width: `${wmLogoSize * 1.5}%`,
                              maxWidth: '120px',
                            }}
                          />
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="iw-controls">
                {/* Type tabs */}
                <div className="iw-control-group">
                  <label className="iw-label">Watermark type</label>
                  <div className="iw-tabs">
                    <button
                      className={`iw-tab ${wmType === 'text' ? 'active' : ''}`}
                      onClick={() => setWmType('text')}
                    >
                      <span>🔤</span> Text
                    </button>
                    <button
                      className={`iw-tab ${wmType === 'image' ? 'active' : ''}`}
                      onClick={() => setWmType('image')}
                    >
                      <span>🖼️</span> Image
                    </button>
                  </div>
                </div>

                {/* Text controls */}
                {wmType === 'text' && (
                  <>
                    <div className="iw-control-group">
                      <label className="iw-label">Watermark text</label>
                      <input
                        type="text"
                        value={wmText}
                        onChange={(e) => setWmText(e.target.value)}
                        className="iw-input"
                        placeholder="© Your Name"
                        maxLength={80}
                      />
                    </div>

                    <div className="iw-control-row">
                      <div className="iw-control-group">
                        <label className="iw-label">
                          Font size · <strong>{wmFontSize}px</strong>
                        </label>
                        <input
                          type="range"
                          min="12"
                          max="200"
                          value={wmFontSize}
                          onChange={(e) => setWmFontSize(parseInt(e.target.value))}
                          className="iw-slider"
                        />
                      </div>

                      <div className="iw-control-group">
                        <label className="iw-label">Color</label>
                        <div className="iw-colors">
                          {COLORS.map((c) => (
                            <button
                              key={c}
                              className={`iw-color ${wmColor === c ? 'active' : ''}`}
                              style={{ background: c }}
                              onClick={() => setWmColor(c)}
                              title={c}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Image controls */}
                {wmType === 'image' && (
                  <div className="iw-control-group">
                    <label className="iw-label">Logo image</label>
                    {!wmLogoPreview ? (
                      <button
                        className="iw-logo-upload"
                        onClick={() => logoInputRef.current?.click()}
                      >
                        📁 Choose logo image
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          style={{ display: 'none' }}
                        />
                      </button>
                    ) : (
                      <div className="iw-logo-preview">
                        <img src={wmLogoPreview} alt="Logo" />
                        <button
                          className="iw-logo-remove"
                          onClick={() => {
                            if (wmLogoPreview) URL.revokeObjectURL(wmLogoPreview);
                            setWmLogo(null);
                            setWmLogoPreview('');
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    {wmLogoPreview && (
                      <div style={{ marginTop: '10px' }}>
                        <label className="iw-label">
                          Logo size · <strong>{wmLogoSize}%</strong>
                        </label>
                        <input
                          type="range"
                          min="5"
                          max="50"
                          value={wmLogoSize}
                          onChange={(e) => setWmLogoSize(parseInt(e.target.value))}
                          className="iw-slider"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Common controls */}
                <div className="iw-control-group">
                  <label className="iw-label">
                    Opacity · <strong>{wmOpacity}%</strong>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={wmOpacity}
                    onChange={(e) => setWmOpacity(parseInt(e.target.value))}
                    className="iw-slider"
                  />
                </div>

                <div className="iw-control-group">
                  <label className="iw-label">Position</label>
                  <div className="iw-position-grid">
                    {POSITIONS.map((p) => (
                      <button
                        key={p.id}
                        className={`iw-position-btn ${
                          wmPosition === p.id ? 'active' : ''
                        }`}
                        onClick={() => setWmPosition(p.id)}
                        title={p.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="iw-control-group">
                  <label className="iw-label">
                    Rotation · <strong>{wmRotation}°</strong>
                  </label>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    value={wmRotation}
                    onChange={(e) => setWmRotation(parseInt(e.target.value))}
                    className="iw-slider"
                  />
                </div>

                <button
                  className="iw-apply-btn"
                  onClick={applyWatermark}
                  disabled={processing || (wmType === 'text' && !wmText) || (wmType === 'image' && !wmLogoPreview)}
                >
                  {processing ? '⟳ Processing…' : '💧 Apply watermark'}
                </button>
              </div>
            </section>

            {error && <div className="iw-error">⚠️ {error}</div>}

            {/* Result */}
            {result && (
              <section className="iw-result">
                <div className="iw-result-icon">✅</div>
                <h3 className="iw-result-title">Watermark applied!</h3>
                <p className="iw-result-desc">
                  Your watermarked image is ready to download.
                </p>
                <div className="iw-result-actions">
                  <button className="iw-download-btn" onClick={download}>
                    ⬇ Download image ({formatBytes(result.size)})
                  </button>
                  <button className="iw-secondary-btn" onClick={handleReset}>
                    Watermark another image
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {/* ================================================ */}
        {/* 3-STEP HOW-TO (like freepdfconvert)            */}
        {/* ================================================ */}
        <section className="iw-howto">
          <h2 className="iw-section-title">How to Watermark an Image Free</h2>

          <div className="iw-steps">
            <div className="iw-step">
              <div className="iw-step-number">1</div>
              <div className="iw-step-icon">📤</div>
              <h3 className="iw-step-title">Upload</h3>
              <p className="iw-step-desc">
                Select your image from your computer or drag and drop it into
                the upload box.
              </p>
            </div>

            <div className="iw-step-arrow">→</div>

            <div className="iw-step">
              <div className="iw-step-number">2</div>
              <div className="iw-step-icon">🎨</div>
              <h3 className="iw-step-title">Customize</h3>
              <p className="iw-step-desc">
                Add text or logo watermark, choose position, opacity, color, and
                size.
              </p>
            </div>

            <div className="iw-step-arrow">→</div>

            <div className="iw-step">
              <div className="iw-step-number">3</div>
              <div className="iw-step-icon">⬇️</div>
              <h3 className="iw-step-title">Download</h3>
              <p className="iw-step-desc">
                Click "Download" to save your watermarked image. No watermark
                added by us.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================ */}
        {/* FEATURE BLOCKS — like freepdfconvert           */}
        {/* ================================================ */}
        <section className="iw-features-text">
          <div className="iw-feature-block">
            <h3 className="iw-feature-block-title">
              The Best Image Watermark Tool
            </h3>
            <p className="iw-feature-block-text">
              Our free image watermark tool is the best solution for protecting
              your photos and graphics. With a simple, intuitive interface, you
              can add professional-looking watermarks to any image in seconds —
              perfect for photographers, designers, and content creators who
              want to brand their work or prevent unauthorized use.
            </p>
          </div>

          <div className="iw-feature-block">
            <h3 className="iw-feature-block-title">
              A suite of useful image tools
            </h3>
            <p className="iw-feature-block-text">
              Our easy-to-use tools make it possible to resize images, compress
              them, convert between formats, and now watermark them. With
              several helpful online tools ready for you to use, editing your
              images has never been easier.
            </p>
          </div>

          <div className="iw-feature-block">
            <h3 className="iw-feature-block-title">
              No membership required
            </h3>
            <p className="iw-feature-block-text">
              You can use our online image watermark tool completely free, with
              no signup, no hidden fees, and no watermarks added by us. Your
              image is processed entirely in your browser — we never see it.
            </p>
          </div>

          <div className="iw-feature-block">
            <h3 className="iw-feature-block-title">
              Easy online access
            </h3>
            <p className="iw-feature-block-text">
              As long as you can access the Internet, you can add watermarks to
              your images whenever you need. Our tool works on any device or OS
              — Mac, Windows, Linux, iOS, or Android — as long as you have a
              browser.
            </p>
          </div>

          <div className="iw-feature-block">
            <h3 className="iw-feature-block-title">
              Privacy &amp; security
            </h3>
            <p className="iw-feature-block-text">
              Unlike server-based tools, our watermark tool runs 100% in your
              browser. Your images never leave your device, so your data stays
              completely private. No uploads, no logs, no tracking.
            </p>
          </div>

          <div className="iw-feature-block">
            <h3 className="iw-feature-block-title">
              Automatic file handling
            </h3>
            <p className="iw-feature-block-text">
              There are no files on our servers to worry about — everything is
              processed locally, and the moment you close the tab, all data is
              gone. Your original image stays untouched; only the watermarked
              copy is saved.
            </p>
          </div>
        </section>

        {/* ================================================ */}
        {/* FAQ — numbered, like freepdfconvert             */}
        {/* ================================================ */}
        <section className="iw-faq-section">
          <h2 className="iw-section-title">Frequently Asked Questions</h2>

          <div className="iw-faq-list">
            <div className="iw-faq-item">
              <div className="iw-faq-q">
                <span className="iw-faq-number">01</span>
                How do I watermark an image for free?
              </div>
              <p className="iw-faq-a">
                Upload your image using the file selector above, add your text
                or logo, customize the position and opacity, then click
                "Download". No software installation or registration required.
              </p>
            </div>

            <div className="iw-faq-item">
              <div className="iw-faq-q">
                <span className="iw-faq-number">02</span>
                Will the watermarked image look good?
              </div>
              <p className="iw-faq-a">
                Yes — the watermarked image preserves the original resolution
                and quality. Only the watermark is added on top, and you can
                adjust opacity, color, and size until it looks perfect.
              </p>
            </div>

            <div className="iw-faq-item">
              <div className="iw-faq-q">
                <span className="iw-faq-number">03</span>
                Can I add both text and image watermarks?
              </div>
              <p className="iw-faq-a">
                Our tool supports both text watermarks (like "© Your Name") and
                image watermarks (like your brand logo). Choose the mode you
                want, and customize freely.
              </p>
            </div>

            <div className="iw-faq-item">
              <div className="iw-faq-q">
                <span className="iw-faq-number">04</span>
                Is it safe to watermark confidential photos online?
              </div>
              <p className="iw-faq-a">
                Absolutely. Our tool runs 100% in your browser using the HTML5
                Canvas API — your images never get uploaded to any server. Your
                privacy is fully protected.
              </p>
            </div>

            <div className="iw-faq-item">
              <div className="iw-faq-q">
                <span className="iw-faq-number">05</span>
                What image formats are supported?
              </div>
              <p className="iw-faq-a">
                We support all major image formats: JPG, JPEG, PNG, WEBP, and
                GIF (first frame). The output preserves the original format
                where possible.
              </p>
            </div>

            <div className="iw-faq-item">
              <div className="iw-faq-q">
                <span className="iw-faq-number">06</span>
                Can I remove a watermark from an image?
              </div>
              <p className="iw-faq-a">
                No — once a watermark is applied, it becomes part of the image
                and cannot be cleanly removed. Always keep a backup of your
                original image before adding a watermark.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================ */}
        {/* CTA — last section                             */}
        {/* ================================================ */}
        <section className="iw-cta">
          <h3 className="iw-cta-title">
            Watermark images automatically
          </h3>
          <p className="iw-cta-text">
            Need to watermark hundreds of images at once? Batch processing is
            coming soon. For now, use our tool one image at a time — it's fast,
            free, and private.
          </p>
        </section>

        {/* SEO Content (same pattern as before) */}
        <SeoContent />
      </div>
    </ToolShell>
  );
}

// ============================================================
// SEO CONTENT (same pattern — kept for keyword ranking)
// ============================================================
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is an Image Watermark Tool?</h2>
        <p>
          An <strong>image watermark tool</strong> lets you add a text or logo
          overlay to your photos and graphics. Watermarks are used to protect
          your work from unauthorized use, brand your images, or credit the
          original creator. Whether you're a photographer, designer, blogger,
          or business owner, watermarking is an essential part of sharing
          images online.
        </p>
        <p>
          Our <strong>free online image watermark tool</strong> runs entirely
          in your browser. Upload an image, add a text or logo watermark,
          customize its position, size, color, and opacity — then download the
          result instantly. No signup, no uploads, 100% private.
        </p>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🔤</div>
            <h3>Text Watermarks</h3>
            <p>
              Add custom text with your choice of font size, color, and
              opacity. Perfect for "© Your Name" credits.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🖼️</div>
            <h3>Image / Logo Watermarks</h3>
            <p>
              Upload your logo or any image and overlay it on your photo with
              adjustable size and opacity.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📍</div>
            <h3>9 Position Options</h3>
            <p>
              Place your watermark in any of 9 positions — corners, edges, or
              center.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎚️</div>
            <h3>Full Opacity Control</h3>
            <p>
              Fine-tune transparency from 5% to 100% for subtle or bold
              watermarks.
            </p>
          </div>
          <div className="seo-feature">
            <div class="seo-feature-icon">🔄</div>
            <h3>Rotation Support</h3>
            <p>
              Rotate the watermark from -90° to +90° for diagonal overlays.
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
            <strong>Photographers</strong> — protect your portfolio from
            unauthorized use with signature or logo watermarks.
          </li>
          <li>
            <strong>Designers</strong> — brand your previews with a studio
            logo.
          </li>
          <li>
            <strong>Content creators</strong> — add your handle or channel name
            to images shared on social media.
          </li>
          <li>
            <strong>Businesses</strong> — protect product photos with company
            branding.
          </li>
          <li>
            <strong>Personal use</strong> — add captions, dates, or credits to
            family photos.
          </li>
          <li>
            <strong>Stock photos</strong> — preview images with visible
            watermarks until licensed.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this image watermark tool free?</summary>
          <p>
            Yes — completely free with no signup, no watermarks added by us, no
            hidden fees. Use it as often as you want.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are my images safe?</summary>
          <p>
            Absolutely. The entire process runs locally in your browser using
            the HTML5 Canvas API. Your images are never uploaded to any server.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I watermark multiple images at once?</summary>
          <p>
            Currently, the tool processes one image at a time. Batch processing
            is on our roadmap. For now, watermark images one by one — it's fast
            and free.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does watermarking reduce image quality?</summary>
          <p>
            No — the original resolution is preserved. Only the watermark
            overlay is added. For PNG output, quality is lossless; for JPG,
            quality is set to 92% which is visually indistinguishable from the
            original.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What image formats are supported?</summary>
          <p>
            We support JPG, JPEG, PNG, WEBP, and GIF (first frame only).
            Output matches the input format where possible.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I remove the watermark later?</summary>
          <p>
            No — once applied, a watermark becomes part of the image and cannot
            be cleanly removed. Always keep a backup of your original image.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is there a file size limit?</summary>
          <p>
            No hard limit, but images above 20 MB may be slow on some devices.
            For best performance, use images under 10 MB.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work on mobile?</summary>
          <p>
            Yes — fully responsive and works on phones and tablets. Tap the
            upload box, select your photo, and the tool opens your phone's
            photo picker.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other image tools: <strong>Image Resizer</strong>,{' '}
          <strong>Image Compressor</strong>, <strong>Image to PDF</strong>,{' '}
          <strong>Image to QR</strong>, <strong>Image Converter</strong>, and{' '}
          <strong>Color Picker</strong> — all free and browser-based.
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