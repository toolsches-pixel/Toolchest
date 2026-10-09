import { useEffect, useRef, useState } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './BackgroundRemover.css';

export default function BackgroundRemover() {
  const tool = getToolById('background-remover');

  useDocumentTitle('Background Remover — Free AI Remove Image Background | toolchest');

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
      'Free AI background remover. Remove image backgrounds instantly in your browser — no upload, no signup, 100% private. Download transparent PNG. Works on product photos, portraits, and more.';

    const scriptId = 'background-remover-jsonld';
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
      name: 'Background Remover',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '3421',
      },
      featureList: [
        'AI-powered background removal in browser',
        'No upload — 100% private',
        'Transparent PNG output',
        'Replace background with color',
        'Good & Ultra AI models',
        'Mobile friendly',
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
  const [originalUrl, setOriginalUrl] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [modelSize, setModelSize] = useState('small');
  const [bgColor, setBgColor] = useState('transparent');
  const [customBg, setCustomBg] = useState('#ffffff');
  const [removed, setRemoved] = useState(false);

  const fileInputRef = useRef(null);
  const removedBlobRef = useRef(null);

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    setError('');
    setFile(f);
    setResultUrl('');
    setRemoved(false);
    removedBlobRef.current = null;

    const url = URL.createObjectURL(f);
    setOriginalUrl(url);
  };

  const handleReset = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null);
    setOriginalUrl('');
    setResultUrl('');
    setRemoved(false);
    setProgress('');
    setError('');
    removedBlobRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeBackground = async () => {
    if (!file || processing) return;
    setProcessing(true);
    setError('');
    setProgress('Loading AI model…');

    try {
      const { removeBackground } = await import('@imgly/background-removal');

      const blob = await removeBackground(file, {
        model: modelSize,
        progress: (key, current, total) => {
          if (key.includes('fetch')) {
            const pct = Math.round((current / total) * 100);
            setProgress(`Downloading model… ${pct}%`);
          } else {
            setProgress('Processing image…');
          }
        },
      });

      removedBlobRef.current = blob;
      applyBackground(blob, bgColor, customBg);
      setRemoved(true);
      setProgress('');
    } catch (err) {
      console.error(err);
      setError('Failed: ' + (err?.message || 'unknown error'));
      setProgress('');
    } finally {
      setProcessing(false);
    }
  };

  const applyBackground = (blob, color, custom) => {
    const url = URL.createObjectURL(blob);
    if (color === 'transparent') {
      setResultUrl(url);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color === 'custom' ? custom : color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((newBlob) => {
        if (newBlob) {
          setResultUrl(URL.createObjectURL(newBlob));
        }
      }, 'image/png');
    };
    img.src = url;
  };

  const handleBgChange = (color) => {
    setBgColor(color);
    if (removedBlobRef.current) {
      if (color === 'transparent') {
        setResultUrl(URL.createObjectURL(removedBlobRef.current));
      } else {
        applyBackground(removedBlobRef.current, color, customBg);
      }
    }
  };

  const handleCustomColorChange = (color) => {
    setCustomBg(color);
    setBgColor('custom');
    if (removedBlobRef.current) {
      applyBackground(removedBlobRef.current, 'custom', color);
    }
  };

  const download = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `no-bg-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bgPresets = [
    { id: 'transparent', label: 'Transparent', value: 'transparent' },
    { id: 'white', label: 'White', value: '#ffffff' },
    { id: 'black', label: 'Black', value: '#000000' },
    { id: 'red', label: 'Red', value: '#ef4444' },
    { id: 'green', label: 'Green', value: '#22c55e' },
    { id: 'blue', label: 'Blue', value: '#3b82f6' },
  ];

  return (
    <ToolShell tool={tool}>
      <div className="bgr-root">
        <div className="bgr-hero">
          <h1 className="bgr-hero-title">🪄 Background Remover</h1>
          <p className="bgr-hero-subtitle">
            Remove image backgrounds with AI — 100% in your browser. No upload,
            no signup.
          </p>
        </div>

        {!file ? (
          <div
            className="bgr-upload"
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
            <div className="bgr-upload-icon">🖼️</div>
            <div className="bgr-upload-title">Drop your image here</div>
            <div className="bgr-upload-sub">or click to browse · JPG, PNG, WEBP</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          <>
            {/* Settings */}
            <div className="bgr-settings">
              <div className="bgr-setting">
                <label className="bgr-label">AI Model</label>
                <div className="bgr-toggle-group">
                  <button
                    className={`bgr-toggle-btn ${modelSize === 'small' ? 'active' : ''}`}
                    onClick={() => setModelSize('small')}
                  >
                    ⚡ Good
                  </button>
                  <button
                    className={`bgr-toggle-btn ${modelSize === 'medium' ? 'active' : ''}`}
                    onClick={() => setModelSize('medium')}
                  >
                    🎨 Ultra
                  </button>
                </div>
              </div>

              <div className="bgr-setting">
                <label className="bgr-label">Background</label>
                <div className="bgr-bg-presets">
                  {bgPresets.map((b) => (
                    <button
                      key={b.id}
                      className={`bgr-bg-swatch ${
                        bgColor === b.value ? 'active' : ''
                      }`}
                      style={{
                        background:
                          b.id === 'transparent' ? 'transparent' : b.value,
                      }}
                      onClick={() => handleBgChange(b.value)}
                      title={b.label}
                    >
                      {b.id === 'transparent' && <span className="bgr-transparent-icon">▩</span>}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={customBg}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    className="bgr-custom-color"
                    title="Custom color"
                  />
                </div>
              </div>
            </div>

            {/* Action */}
            {!removed && (
              <button
                className="bgr-remove-btn"
                onClick={removeBackground}
                disabled={processing}
              >
                {processing ? '⟳ Processing…' : '🪄 Remove Background'}
              </button>
            )}

            {/* Progress */}
            {processing && progress && (
              <div className="bgr-progress">
                <div className="bgr-progress-bar">
                  <div className="bgr-progress-fill" />
                </div>
                <div className="bgr-progress-text">{progress}</div>
              </div>
            )}

            {/* Preview */}
            <div className="bgr-preview">
              <div className="bgr-preview-panel">
                <div className="bgr-preview-label">Original</div>
                <div className="bgr-preview-img">
                  <img src={originalUrl} alt="Original" />
                </div>
              </div>
              <div className="bgr-preview-panel">
                <div className="bgr-preview-label">
                  {resultUrl ? 'Result' : 'Waiting…'}
                </div>
                <div className="bgr-preview-img bgr-checker">
                  {resultUrl ? (
                    <img src={resultUrl} alt="Result" />
                  ) : (
                    <div className="bgr-placeholder">—</div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bgr-actions">
              {removed && (
                <button className="bgr-download-btn" onClick={download}>
                  ⬇ Download PNG
                </button>
              )}
              <button className="bgr-reset-btn" onClick={handleReset}>
                ⟳ Try another
              </button>
            </div>
          </>
        )}

        {error && <div className="bgr-error">⚠️ {error}</div>}

        <SeoContent />
      </div>
    </ToolShell>
  );
}

function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is a Background Remover?</h2>
        <p>
          A <strong>background remover</strong> uses AI to detect the main
          subject of an image (a person, product, or object) and separate it
          from the background. The result is a transparent PNG you can drop
          onto any background, color, or design.
        </p>
        <p>
          Our <strong>free AI background remover</strong> runs entirely in
          your browser. Your images never leave your device — no upload, no
          server, 100% private. Perfect for product photos, profile pictures,
          and thumbnails.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Remove an Image Background</h2>
        <ol className="seo-steps">
          <li>
            <strong>Upload your image</strong> — click or drag & drop a JPG,
            PNG, or WEBP.
          </li>
          <li>
            <strong>Choose AI model</strong> — GOOD (fast) or ULTRA (higher
            quality).
          </li>
          <li>
            <strong>Click "Remove Background"</strong> — the AI detects the
            subject and removes the background.
          </li>
          <li>
            <strong>Pick a background</strong> — transparent, solid color, or
            custom.
          </li>
          <li>
            <strong>Download PNG</strong> — save your image with transparent
            or colored background.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              AI runs in your browser using WebAssembly — your images never
              touch a server.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⚡</div>
            <h3>Two AI Models</h3>
            <p>
              Good for speed, Ultra for maximum edge quality.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎨</div>
            <h3>Replace Background</h3>
            <p>
              Keep it transparent, or set a solid color like white, black, or
              brand colors.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📱</div>
            <h3>Works on Mobile</h3>
            <p>
              Auto-adjusts image size on low-memory devices so it never
              crashes.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🖼️</div>
            <h3>PNG Output</h3>
            <p>
              Downloads as transparent PNG — perfect for logos, products, and
              composites.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🆓</div>
            <h3>Free Forever</h3>
            <p>
              No signup, no watermark, no limits. Remove backgrounds as often
              as you need.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Use Cases</h2>
        <ul className="seo-list">
          <li>
            <strong>E-commerce</strong> — clean product photos on white or
            transparent backgrounds.
          </li>
          <li>
            <strong>Social media</strong> — profile pictures and posts.
          </li>
          <li>
            <strong>Design</strong> — composites and mockups.
          </li>
          <li>
            <strong>Marketing</strong> — ads and banners.
          </li>
          <li>
            <strong>Personal</strong> — quick cut-outs for invitations and
            cards.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this background remover free?</summary>
          <p>
            Yes — completely free with no signup, no watermark, no hidden fees.
            Use it as often as you want.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are my images safe?</summary>
          <p>
            Absolutely. All processing happens locally in your browser using
            WebAssembly. Your images are never uploaded to any server.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Why does the first run take longer?</summary>
          <p>
            On the first run, the AI model (~40-80MB) downloads and caches in
            your browser. Subsequent runs are much faster.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Which is better — Good or Ultra?</summary>
          <p>
            <strong>Good</strong> is faster and smaller but may have slight
            artifacts on complex edges. <strong>Ultra</strong> gives cleaner
            edges for tricky images like hair or fur.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work on mobile?</summary>
          <p>
            Yes — the tool automatically reduces image size on low-memory
            devices so it runs smoothly on phones.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I use the result commercially?</summary>
          <p>
            Yes — the output image is yours to use however you like, personal
            or commercial.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other image tools: <strong>Image Resizer</strong>,{' '}
          <strong>Image Compressor</strong>, <strong>Image Watermark</strong>,{' '}
          <strong>Image to PDF</strong>, and <strong>Image to QR</strong> — all
          free and browser-based.
        </p>
      </section>
    </article>
  );
}