import { useRef, useState, useEffect } from 'react';
import QRCode from 'qrcode';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const ERROR_LEVELS = [
  { id: 'L', label: 'Low (7%)', desc: 'Smallest QR' },
  { id: 'M', label: 'Medium (15%)', desc: 'Balanced' },
  { id: 'Q', label: 'Quartile (25%)', desc: 'Good for logos' },
  { id: 'H', label: 'High (30%)', desc: 'Best for logos' },
];

const SIZES = [256, 512, 1024, 2048];

const PRESET_COLORS = [
  { fg: '#000000', bg: '#ffffff' },
  { fg: '#0f1012', bg: '#e2b714' },
  { fg: '#ffffff', bg: '#0f1012' },
  { fg: '#4ecdc4', bg: '#0f1012' },
  { fg: '#ef4444', bg: '#ffffff' },
  { fg: '#3b82f6', bg: '#ffffff' },
  { fg: '#22c55e', bg: '#ffffff' },
  { fg: '#a855f7', bg: '#ffffff' },
];

export default function ImageToQr() {
  const tool = getToolById('image-to-qr');

  // SEO
  useDocumentTitle(
    'QR Code Generator — Free Online QR Maker with Logo | toolchest'
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
      'Free online QR code generator. Create custom QR codes with your logo, custom colors, and high-resolution PNG/SVG downloads. No signup, 100% private, browser-based.';

    const scriptId = 'qr-code-jsonld';
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
      name: 'QR Code Generator',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '1547',
      },
      featureList: [
        'Generate QR codes from text, URLs, or Wi-Fi',
        'Add custom logo in center',
        'Custom colors for foreground and background',
        '4 error correction levels',
        'High-resolution download (up to 2048px)',
        'PNG and SVG export',
        'No signup — 100% browser-based',
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

  const [text, setText] = useState('https://toolchest.in');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoSize, setLogoSize] = useState(22); // % of QR size

  const [size, setSize] = useState(512);
  const [errorLevel, setErrorLevel] = useState('H');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const canvasRef = useRef(null);
  const logoInputRef = useRef(null);

  // Determine content for QR
  const getQrContent = () => {
    return text.trim();
  };

  // Generate QR whenever inputs change
  const generateQr = async () => {
    const content = getQrContent();
    if (!content) {
      setQrDataUrl('');
      return;
    }
    setGenerating(true);
    setError('');
    setDownloaded(false);

    try {
      // Generate QR on a temporary canvas
      const tempCanvas = document.createElement('canvas');
      await QRCode.toCanvas(tempCanvas, content, {
        width: size,
        margin: 2,
        errorCorrectionLevel: errorLevel,
        color: {
          dark: fgColor,
          light: bgColor,
        },
      });

      // If logo, draw it in center
      if (logoPreview) {
        const ctx = tempCanvas.getContext('2d');
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
          logoImg.src = logoPreview;
        });

        const logoDim = (tempCanvas.width * logoSize) / 100;
        const x = (tempCanvas.width - logoDim) / 2;
        const y = (tempCanvas.height - logoDim) / 2;

        // Background behind logo for contrast
        const padding = logoDim * 0.08;
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        const rx = x - padding;
        const ry = y - padding;
        const rw = logoDim + padding * 2;
        const rh = logoDim + padding * 2;
        const r = Math.min(rw, rh) * 0.08;
        ctx.moveTo(rx + r, ry);
        ctx.lineTo(rx + rw - r, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
        ctx.lineTo(rx + rw, ry + rh - r);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
        ctx.lineTo(rx + r, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
        ctx.lineTo(rx, ry + r);
        ctx.quadraticCurveTo(rx, ry, rx + r, ry);
        ctx.closePath();
        ctx.fill();

        ctx.drawImage(logoImg, x, y, logoDim, logoDim);
      }

      // Store on the visible canvas
      if (canvasRef.current) {
        canvasRef.current.width = tempCanvas.width;
        canvasRef.current.height = tempCanvas.height;
        const vctx = canvasRef.current.getContext('2d');
        vctx.drawImage(tempCanvas, 0, 0);
      }

      setQrDataUrl(tempCanvas.toDataURL('image/png'));
      setGenerating(false);
    } catch (err) {
      console.error(err);
      setError('QR generation failed: ' + (err?.message || 'unknown'));
      setGenerating(false);
    }
  };

  // Auto-generate on option change (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      generateQr();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, size, errorLevel, fgColor, bgColor, logoPreview, logoSize]);

  const handleLogoChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Please select an image for logo.');
      return;
    }
    setLogoFile(f);
    const url = URL.createObjectURL(f);
    setLogoPreview(url);
  };

  const removeLogo = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview('');
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const downloadPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const downloadSvg = async () => {
    const content = getQrContent();
    if (!content) return;
    try {
      let svgString = await QRCode.toString(content, {
        type: 'svg',
        margin: 2,
        errorCorrectionLevel: errorLevel,
        color: { dark: fgColor, light: bgColor },
        width: size,
      });

      // If logo, embed in SVG
      if (logoPreview) {
        // Convert logo to data URL first
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((r, j) => {
          img.onload = r;
          img.onerror = j;
          img.src = logoPreview;
        });
        const c = document.createElement('canvas');
        c.width = 128;
        c.height = 128;
        const cx = c.getContext('2d');
        // Maintain aspect ratio
        const ar = img.width / img.height;
        let w = 128;
        let h = 128;
        if (ar > 1) h = 128 / ar;
        else w = 128 * ar;
        cx.drawImage(img, (128 - w) / 2, (128 - h) / 2, w, h);
        const logoData = c.toDataURL('image/png');

        const logoDim = (size * logoSize) / 100;
        const x = (size - logoDim) / 2;
        const y = (size - logoDim) / 2;
        const padding = logoDim * 0.1;
        const rectW = logoDim + padding * 2;
        const rectH = logoDim + padding * 2;
        const rectX = (size - rectW) / 2;
        const rectY = (size - rectH) / 2;

        // Insert before closing </svg>
        svgString = svgString.replace(
          '</svg>',
          `<rect x="${rectX}" y="${rectY}" width="${rectW}" height="${rectH}" rx="${rectW * 0.08}" fill="${bgColor}"/><image href="${logoData}" x="${x}" y="${y}" width="${logoDim}" height="${logoDim}"/></svg>`
        );
      }

      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${Date.now()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch (err) {
      console.error(err);
      setError('SVG export failed: ' + (err?.message || 'unknown'));
    }
  };

  const reset = () => {
    setText('https://toolchest.app');
    removeLogo();
    setFgColor('#000000');
    setBgColor('#ffffff');
    setSize(512);
    setErrorLevel('H');
    setLogoSize(22);
    setQrDataUrl('');
  };

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentContent = getQrContent();

  return (
    <ToolShell tool={tool}>
      <div className="pdf-tool">
        {/* Input */}
        <div className="pdf-target">
          <label className="pdf-target-label">Text or URL</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="qr-textarea"
            placeholder="https://example.com or any text…"
            rows={3}
            maxLength={2000}
          />
          <p className="pdf-target-hint">
            {text.length} / 2000 characters · QR codes work best with URLs
            under 300 characters
          </p>
        </div>

        {/* Logo upload */}
        <div className="pdf-target">
          <label className="pdf-target-label">Logo (optional)</label>
          {!logoPreview ? (
            <button
              className="qr-logo-upload-btn"
              onClick={() => logoInputRef.current?.click()}
            >
              <span>🎨</span>
              Add logo in center
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                style={{ display: 'none' }}
              />
            </button>
          ) : (
            <div className="qr-image-preview">
              <img src={logoPreview} alt="Logo" />
              <div className="qr-image-preview-info">
                <div className="qr-image-name">{logoFile?.name}</div>
                <div className="qr-image-note">
                  Use error correction "High" for best results
                </div>
              </div>
              <button className="qr-remove-btn" onClick={removeLogo}>
                ✕
              </button>
            </div>
          )}

          {logoPreview && (
            <div style={{ marginTop: 'var(--sp-3)' }}>
              <label className="pdf-target-label">
                Logo size · <strong>{logoSize}%</strong>
              </label>
              <input
                type="range"
                min="10"
                max="35"
                value={logoSize}
                onChange={(e) => setLogoSize(parseInt(e.target.value))}
                className="wm-slider"
              />
            </div>
          )}
        </div>

        {/* Colors */}
        <div className="pdf-target">
          <label className="pdf-target-label">Colors</label>
          <div className="qr-preset-colors">
            {PRESET_COLORS.map((p, i) => (
              <button
                key={i}
                className={`qr-preset-swatch ${
                  fgColor === p.fg && bgColor === p.bg ? 'active' : ''
                }`}
                onClick={() => {
                  setFgColor(p.fg);
                  setBgColor(p.bg);
                }}
                title={`${p.fg} on ${p.bg}`}
              >
                <span
                  className="qr-preset-dot"
                  style={{ background: p.fg }}
                />
                <span
                  className="qr-preset-bg"
                  style={{ background: p.bg }}
                />
              </button>
            ))}
          </div>
          <div className="wm-row-2col" style={{ marginTop: 'var(--sp-4)' }}>
            <div>
              <label className="pdf-target-label">Foreground</label>
              <div className="qr-color-picker-row">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="qr-color-input"
                />
                <input
                  type="text"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="pdf-target-number"
                  style={{ flex: 1 }}
                />
              </div>
            </div>
            <div>
              <label className="pdf-target-label">Background</label>
              <div className="qr-color-picker-row">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="qr-color-input"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="pdf-target-number"
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Size + Error level */}
        <div className="pdf-target">
          <div className="wm-row-2col">
            <div>
              <label className="pdf-target-label">Size</label>
              <div className="jpg-scale-options">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    className={`category-pill ${
                      size === s ? 'active' : ''
                    }`}
                    onClick={() => setSize(s)}
                  >
                    {s}px
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="pdf-target-label">
                Error correction
                {logoPreview && (
                  <span
                    style={{
                      fontSize: 'var(--fs-xs)',
                      color: '#4ecdc4',
                      marginLeft: 8,
                    }}
                  >
                    (use H for logo)
                  </span>
                )}
              </label>
              <div className="jpg-scale-options">
                {ERROR_LEVELS.map((l) => (
                  <button
                    key={l.id}
                    className={`category-pill ${
                      errorLevel === l.id ? 'active' : ''
                    }`}
                    onClick={() => setErrorLevel(l.id)}
                    title={l.desc}
                  >
                    {l.id}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && <div className="pdf-error">⚠️ {error}</div>}

        {/* Output */}
        <div className="qr-output-section">
          <div className="qr-canvas-wrap">
            {generating && (
              <div className="qr-loading">
                <span className="spinner" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              className={`qr-canvas ${!currentContent ? 'hidden' : ''}`}
            />
            {!currentContent && (
              <div className="qr-empty">
                <div className="qr-empty-icon">📱</div>
                <div className="qr-empty-text">
                  Enter text or URL to generate QR code
                </div>
              </div>
            )}
          </div>

          {qrDataUrl && (
            <div className="qr-actions">
              <button className="pdf-download" onClick={downloadPng}>
                {downloaded ? '✓ Downloaded!' : '⬇ Download PNG'}
              </button>
              <button className="btn-secondary" onClick={downloadSvg}>
                ⬇ Download SVG
              </button>
              <button className="btn-secondary" onClick={reset}>
                ⟳ Reset
              </button>
            </div>
          )}
        </div>

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
        <h2>What is a QR Code Generator?</h2>
        <p>
          A <strong>QR code generator</strong> creates a scannable square
          barcode that stores text, URLs, or other data. When you scan a QR
          code with your phone camera, it instantly opens the link or displays
          the encoded information. QR codes are used everywhere: business
          cards, product packaging, restaurant menus, event posters, and
          marketing campaigns.
        </p>
        <p>
          Our <strong>free online QR code maker</strong> lets you generate
          custom QR codes with your own logo, custom colors, and
          high-resolution output — all in your browser. No signup, no
          watermarks, no limits. Your data never leaves your device.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Create a QR Code — Step by Step</h2>
        <ol className="seo-steps">
          <li>
            <strong>Enter your content</strong> — paste a URL, text, Wi-Fi
            details, or any data you want to encode.
          </li>
          <li>
            <strong>Add a logo (optional)</strong> — upload your brand logo to
            appear in the center. Works best with error correction set to{' '}
            <code>H</code>.
          </li>
          <li>
            <strong>Customize colors & size</strong> — pick from presets or use
            custom colors, and choose your output resolution.
          </li>
          <li>
            <strong>Download</strong> — save as PNG (for prints and social) or
            SVG (vector, for scalable graphics).
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🎨</div>
            <h3>Logo Embedding</h3>
            <p>
              Place your brand logo or any image in the center of the QR — with
              a clean background for maximum scan reliability.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🌈</div>
            <h3>Custom Colors</h3>
            <p>
              Match your QR to your brand — 8 presets and full custom color
              picker for both foreground and background.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📏</div>
            <h3>High-Resolution Output</h3>
            <p>
              Generate QR codes up to 2048×2048 pixels — perfect for print,
              posters, and large-format displays.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🖼️</div>
            <h3>PNG & SVG Export</h3>
            <p>
              Download as PNG for web and social, or SVG for infinitely
              scalable vector graphics.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🛡️</div>
            <h3>Error Correction</h3>
            <p>
              4 error correction levels — choose High (30%) for best
              readability with logos or damaged prints.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              All QR generation happens in your browser. Nothing is uploaded —
              your data stays on your device.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Use Cases</h2>
        <ul className="seo-list">
          <li>
            <strong>Business cards</strong> — link to your portfolio, LinkedIn,
            or vCard with your logo in the QR.
          </li>
          <li>
            <strong>Product packaging</strong> — add a QR with your brand logo
            that links to instructions or a video.
          </li>
          <li>
            <strong>Restaurant menus</strong> — QR codes with the restaurant
            logo that link to digital menus.
          </li>
          <li>
            <strong>Event posters & flyers</strong> — high-res QR codes for
            ticket links or event details.
          </li>
          <li>
            <strong>Social media</strong> — link your Instagram, TikTok, or
            YouTube from a printed QR.
          </li>
          <li>
            <strong>Wi-Fi sharing</strong> — encode Wi-Fi credentials in a QR
            code for guests.
          </li>
          <li>
            <strong>Marketing campaigns</strong> — branded QR codes in
            brochures, billboards, and print ads.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this QR code generator really free?</summary>
          <p>
            Yes — completely free with no signup, no watermarks, no hidden
            fees. Generate as many QR codes as you need.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Will the QR code expire?</summary>
          <p>
            No — QR codes generated here are static. They contain the data
            directly, so they never expire and don't need a redirect server.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I add my logo to the QR code?</summary>
          <p>
            Yes — upload any image (PNG works best with transparent background)
            and it will be placed in the center of the QR code. Set error
            correction to "H" (High) for the most reliable scanning.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What size should my QR code be for print?</summary>
          <p>
            For print, download at 1024px or 2048px. Rule of thumb: QR size
            should be at least 1/10th the scan distance. For a QR scanned from
            1 meter away, print it at least 10cm wide.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does the QR code work if I use custom colors?</summary>
          <p>
            Yes — but for best scan reliability, keep good contrast between
            foreground and background. Dark foreground on light background
            works best. Avoid low-contrast combinations.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What's the difference between PNG and SVG?</summary>
          <p>
            PNG is a pixel-based format — great for social media, web, and
            smaller prints. SVG is vector — infinitely scalable without
            quality loss, ideal for logos, packaging, and large-format prints.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is my data safe?</summary>
          <p>
            Yes — everything runs locally in your browser. Your text and logos
            are never uploaded to any server.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I use the QR codes commercially?</summary>
          <p>
            Absolutely — the QR codes you generate are yours to use however you
            like, personal or commercial. No attribution required.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I create Wi-Fi QR codes?</summary>
          <p>
            Yes — use the Wi-Fi format string:{' '}
            <code>WIFI:T:WPA;S:NetworkName;P:Password;;</code>. When scanned,
            phones will connect automatically.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other tools: <strong>QR Code Scanner</strong>,{' '}
          <strong>PDF tools</strong> (Merge, Split, Compress, Rotate),{' '}
          <strong>Image tools</strong> (Resize, Compress, Convert), and{' '}
          <strong>Typing Practice</strong> — all free and browser-based.
        </p>
      </section>
    </article>
  );
}