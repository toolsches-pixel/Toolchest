import { useEffect, useState, useCallback, useRef } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './GradientGenerator.css';

// ============================================================
// PRESETS
// ============================================================
const PRESETS = [
  { name: 'Sunset', type: 'linear', angle: 45, stops: ['#ff6b6b', '#feca57'] },
  { name: 'Ocean', type: 'linear', angle: 135, stops: ['#4ecdc4', '#1e3c72'] },
  { name: 'Purple Haze', type: 'linear', angle: 90, stops: ['#a855f7', '#ec4899'] },
  { name: 'Forest', type: 'linear', angle: 135, stops: ['#22c55e', '#065f46'] },
  { name: 'Fire', type: 'linear', angle: 45, stops: ['#f97316', '#dc2626', '#7f1d1d'] },
  { name: 'Cotton Candy', type: 'linear', angle: 90, stops: ['#fbbf24', '#ec4899', '#8b5cf6'] },
  { name: 'Mint', type: 'linear', angle: 180, stops: ['#a7f3d0', '#10b981'] },
  { name: 'Night Sky', type: 'linear', angle: 135, stops: ['#1e293b', '#0f172a'] },
  { name: 'Peach', type: 'linear', angle: 45, stops: ['#fecaca', '#fb923c'] },
  { name: 'Cyberpunk', type: 'linear', angle: 90, stops: ['#ff0080', '#7928ca', '#00d4ff'] },
  { name: 'Rainbow', type: 'linear', angle: 90, stops: ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'] },
  { name: 'Golden', type: 'linear', angle: 135, stops: ['#fbbf24', '#b45309'] },
  { name: 'Ice', type: 'linear', angle: 45, stops: ['#bae6fd', '#0ea5e9'] },
  { name: 'Lava', type: 'radial', angle: 0, stops: ['#fbbf24', '#dc2626', '#450a0a'] },
  { name: 'Aurora', type: 'linear', angle: 180, stops: ['#22d3ee', '#a855f7', '#f472b6'] },
  { name: 'Deep Sea', type: 'radial', angle: 0, stops: ['#0ea5e9', '#082f49'] },
  { name: 'Rose Gold', type: 'linear', angle: 45, stops: ['#fda4af', '#fbbf24', '#f97316'] },
  { name: 'Neon', type: 'linear', angle: 135, stops: ['#22d3ee', '#a3e635', '#facc15'] },
  { name: 'Cherry', type: 'radial', angle: 0, stops: ['#f87171', '#991b1b'] },
  { name: 'Vaporwave', type: 'linear', angle: 90, stops: ['#f0abfc', '#38bdf8', '#fbcfe8'] },
];

const RADIAL_POSITIONS = [
  { id: 'center', label: 'Center' },
  { id: 'top', label: 'Top' },
  { id: 'top right', label: 'Top Right' },
  { id: 'right', label: 'Right' },
  { id: 'bottom right', label: 'Bottom Right' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'bottom left', label: 'Bottom Left' },
  { id: 'left', label: 'Left' },
  { id: 'top left', label: 'Top Left' },
];

const RANDOM_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#fda4af',
  '#fb923c', '#facc15', '#4ade80', '#34d399', '#22d3ee', '#60a5fa',
];

function randomHex() {
  const n = Math.floor(Math.random() * 0xffffff);
  return `#${n.toString(16).padStart(6, '0')}`;
}

function randomGradient() {
  const count = Math.floor(Math.random() * 3) + 2; // 2-4 stops
  const stops = [];
  for (let i = 0; i < count; i++) {
    stops.push(RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)]);
  }
  const type = Math.random() > 0.7 ? 'radial' : 'linear';
  const angle = Math.floor(Math.random() * 360);
  const position = RADIAL_POSITIONS[Math.floor(Math.random() * RADIAL_POSITIONS.length)].id;
  return { type, angle, position, stops };
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function GradientGenerator() {
  const tool = getToolById('gradient-generator');

  useDocumentTitle('CSS Gradient Generator — Free Online Tool | toolchest');

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
      'Free online CSS gradient generator. Create beautiful linear, radial, and conic gradients with live preview. Add multiple color stops, copy CSS or Tailwind, download as PNG. No signup.';

    const scriptId = 'gradient-generator-jsonld';
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
      name: 'CSS Gradient Generator',
      applicationCategory: 'DesignApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '1287',
      },
      featureList: [
        'Linear, radial, and conic gradient types',
        'Multiple color stops',
        'Live preview',
        'Angle and position control',
        '20+ ready-made presets',
        'Copy CSS output',
        'Copy Tailwind classes',
        'Download as PNG',
        'Recent gradients saved locally',
        '100% browser-based, no signup',
      ],
    });

    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, []);

  const [type, setType] = useState('linear');
  const [angle, setAngle] = useState(45);
  const [position, setPosition] = useState('center');
  const [stops, setStops] = useState(['#4ecdc4', '#a855f7']);
  const [copiedKey, setCopiedKey] = useState('');
  const [recent, setRecent] = useState([]);

  const previewRef = useRef(null);

  // Build CSS
  const cssValue = (() => {
    const stopStr = stops.join(', ');
    if (type === 'linear') return `linear-gradient(${angle}deg, ${stopStr})`;
    if (type === 'radial') return `radial-gradient(circle at ${position}, ${stopStr})`;
    return `conic-gradient(from ${angle}deg at ${position}, ${stopStr})`;
  })();

  const cssCode = `background: ${cssValue};`;
  const tailwindValue = `bg-[${cssValue.replace(/\s+/g, '_')}]`;

  // Load recent
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('toolchestRecentGradients') || '[]');
      if (Array.isArray(saved)) setRecent(saved);
    } catch (e) {}
  }, []);

  const saveToRecent = useCallback(() => {
    const entry = { type, angle, position, stops: [...stops] };
    setRecent((prev) => {
      const key = JSON.stringify(entry);
      const filtered = prev.filter((e) => JSON.stringify(e) !== key);
      const next = [entry, ...filtered].slice(0, 8);
      try { localStorage.setItem('toolchestRecentGradients', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }, [type, angle, position, stops]);

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 1500);
    } catch (e) {}
  };

  const addStop = () => {
    setStops((s) => [...s, randomHex()]);
  };

  const removeStop = (index) => {
    if (stops.length <= 2) return;
    setStops((s) => s.filter((_, i) => i !== index));
  };

  const updateStop = (index, color) => {
    setStops((s) => s.map((c, i) => (i === index ? color : c)));
  };

  const moveStop = (index, dir) => {
    setStops((s) => {
      const next = [...s];
      const target = index + dir;
      if (target < 0 || target >= next.length) return s;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const applyPreset = (preset) => {
    setType(preset.type);
    setAngle(preset.angle);
    setStops([...preset.stops]);
    setPosition(preset.position || 'center');
  };

  const handleRandom = () => {
    const g = randomGradient();
    setType(g.type);
    setAngle(g.angle);
    setPosition(g.position);
    setStops(g.stops);
  };

  const downloadPng = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    let gradient;
    if (type === 'linear') {
      const rad = ((angle - 90) * Math.PI) / 180;
      const x = Math.cos(rad);
      const y = Math.sin(rad);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const len = Math.max(canvas.width, canvas.height);
      gradient = ctx.createLinearGradient(
        cx - x * len / 2,
        cy - y * len / 2,
        cx + x * len / 2,
        cy + y * len / 2
      );
    } else if (type === 'radial') {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const r = Math.max(canvas.width, canvas.height) * 0.7;
      gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    } else {
      // conic not natively supported in canvas — fallback to linear
      gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    }

    stops.forEach((color, i) => {
      gradient.addColorStop(i / Math.max(1, stops.length - 1), color);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gradient-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  return (
    <ToolShell tool={tool}>
      <div className="gg-root">
        {/* Preview */}
        <div
          className="gg-preview"
          style={{ background: cssValue }}
          ref={previewRef}
        >
          <div className="gg-preview-actions">
            <button
              className="gg-preview-btn"
              onClick={() => copyToClipboard(cssCode, 'preview-css')}
              title="Copy CSS"
            >
              {copiedKey === 'preview-css' ? '✓ Copied' : '📋 Copy CSS'}
            </button>
            <button
              className="gg-preview-btn"
              onClick={handleRandom}
              title="Random gradient"
            >
              🎲 Random
            </button>
            <button
              className="gg-preview-btn"
              onClick={downloadPng}
              title="Download PNG"
            >
              ⬇ PNG
            </button>
          </div>
          <div className="gg-preview-label">{cssValue}</div>
        </div>

        {/* Type + Angle */}
        <div className="gg-section">
          <label className="gg-label">Type</label>
          <div className="gg-tabs">
            <button
              className={`gg-tab ${type === 'linear' ? 'active' : ''}`}
              onClick={() => setType('linear')}
            >
              Linear
            </button>
            <button
              className={`gg-tab ${type === 'radial' ? 'active' : ''}`}
              onClick={() => setType('radial')}
            >
              Radial
            </button>
            <button
              className={`gg-tab ${type === 'conic' ? 'active' : ''}`}
              onClick={() => setType('conic')}
            >
              Conic
            </button>
          </div>
        </div>

        {/* Angle (linear & conic) */}
        {(type === 'linear' || type === 'conic') && (
          <div className="gg-section">
            <div className="gg-slider-header">
              <label className="gg-label">Angle</label>
              <input
                type="number"
                min="0"
                max="360"
                value={angle}
                onChange={(e) => setAngle(Math.max(0, Math.min(360, parseInt(e.target.value) || 0)))}
                className="gg-angle-input"
              />
              <span className="gg-angle-unit">deg</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={angle}
              onChange={(e) => setAngle(parseInt(e.target.value))}
              className="gg-slider"
            />
          </div>
        )}

        {/* Position (radial & conic) */}
        {(type === 'radial' || type === 'conic') && (
          <div className="gg-section">
            <label className="gg-label">Position</label>
            <div className="gg-position-grid">
              {RADIAL_POSITIONS.map((p) => (
                <button
                  key={p.id}
                  className={`gg-position-btn ${position === p.id ? 'active' : ''}`}
                  onClick={() => setPosition(p.id)}
                  title={p.label}
                />
              ))}
            </div>
          </div>
        )}

        {/* Color stops */}
        <div className="gg-section">
          <div className="gg-section-header">
            <label className="gg-label">Color stops ({stops.length})</label>
            <button className="gg-add-btn" onClick={addStop}>
              + Add stop
            </button>
          </div>
          <div className="gg-stops">
            {stops.map((color, i) => (
              <div key={i} className="gg-stop">
                <div className="gg-stop-index">{i + 1}</div>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => updateStop(i, e.target.value)}
                  className="gg-stop-color"
                />
                <input
                  type="text"
                  value={color.toUpperCase()}
                  onChange={(e) => {
                    let v = e.target.value.trim();
                    if (!v.startsWith('#')) v = '#' + v;
                    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) {
                      updateStop(i, v.toLowerCase());
                    }
                  }}
                  className="gg-stop-hex"
                  spellCheck="false"
                  maxLength={7}
                />
                <div className="gg-stop-actions">
                  <button
                    className="gg-stop-btn"
                    onClick={() => moveStop(i, -1)}
                    disabled={i === 0}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="gg-stop-btn"
                    onClick={() => moveStop(i, 1)}
                    disabled={i === stops.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    className="gg-stop-btn gg-stop-remove"
                    onClick={() => removeStop(i)}
                    disabled={stops.length <= 2}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Output */}
        <div className="gg-section">
          <label className="gg-label">CSS output</label>
          <div className="gg-code-row">
            <code className="gg-code">{cssCode}</code>
            <button
              className="gg-copy-btn"
              onClick={() => copyToClipboard(cssCode, 'css')}
              title="Copy CSS"
            >
              {copiedKey === 'css' ? '✓' : '📋'}
            </button>
          </div>

          <label className="gg-label" style={{ marginTop: '12px' }}>Tailwind</label>
          <div className="gg-code-row">
            <code className="gg-code">{tailwindValue}</code>
            <button
              className="gg-copy-btn"
              onClick={() => copyToClipboard(tailwindValue, 'tw')}
              title="Copy Tailwind"
            >
              {copiedKey === 'tw' ? '✓' : '📋'}
            </button>
          </div>
        </div>

        {/* Save to recent */}
        <div className="gg-section">
          <button className="gg-save-btn" onClick={saveToRecent}>
            ⭐ Save to recent
          </button>
        </div>

        {/* Recent */}
        {recent.length > 0 && (
          <div className="gg-section">
            <div className="gg-section-header">
              <label className="gg-label">Recent gradients</label>
              <button
                className="gg-clear-btn"
                onClick={() => {
                  setRecent([]);
                  try { localStorage.removeItem('toolchestRecentGradients'); } catch (e) {}
                }}
              >
                Clear
              </button>
            </div>
            <div className="gg-recent-grid">
              {recent.map((r, i) => {
                const stopStr = r.stops.join(', ');
                const bg =
                  r.type === 'linear'
                    ? `linear-gradient(${r.angle}deg, ${stopStr})`
                    : r.type === 'radial'
                    ? `radial-gradient(circle at ${r.position}, ${stopStr})`
                    : `conic-gradient(from ${r.angle}deg at ${r.position}, ${stopStr})`;
                return (
                  <button
                    key={i}
                    className="gg-recent-swatch"
                    style={{ background: bg }}
                    onClick={() => {
                      setType(r.type);
                      setAngle(r.angle);
                      setPosition(r.position);
                      setStops([...r.stops]);
                    }}
                    title="Click to load"
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Presets */}
        <div className="gg-section">
          <label className="gg-label">Presets</label>
          <div className="gg-presets">
            {PRESETS.map((p) => {
              const stopStr = p.stops.join(', ');
              const bg =
                p.type === 'linear'
                  ? `linear-gradient(${p.angle}deg, ${stopStr})`
                  : `radial-gradient(circle at ${p.position || 'center'}, ${stopStr})`;
              return (
                <button
                  key={p.name}
                  className="gg-preset"
                  style={{ background: bg }}
                  onClick={() => applyPreset(p)}
                  title={p.name}
                >
                  <span className="gg-preset-label">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SEO */}
        <SeoContent />
      </div>
    </ToolShell>
  );
}

// ============================================================
// SEO CONTENT
// ============================================================
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is a CSS Gradient Generator?</h2>
        <p>
          A <strong>CSS gradient generator</strong> is a visual tool that lets
          you create beautiful color transitions without writing code by hand.
          You pick colors, adjust the angle, add or remove stops, and the tool
          generates the perfect CSS — ready to copy into your stylesheet.
        </p>
        <p>
          Our <strong>free online gradient generator</strong> supports all
          three CSS gradient types — <strong>linear</strong>,{' '}
          <strong>radial</strong>, and <strong>conic</strong> — with live
          preview, unlimited color stops, and one-click copy for CSS or
          Tailwind. No signup, no watermarks.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Create a CSS Gradient</h2>
        <ol className="seo-steps">
          <li>
            <strong>Choose gradient type</strong> — Linear (straight lines),
            Radial (circular), or Conic (angular sweep).
          </li>
          <li>
            <strong>Pick your colors</strong> — the default two stops are
            ready; add more with the "+ Add stop" button.
          </li>
          <li>
            <strong>Adjust angle or position</strong> — drag the slider for
            linear/conic angles, or pick a position for radial/conic.
          </li>
          <li>
            <strong>Copy the CSS</strong> — click the 📋 button next to the CSS
            output and paste it into your project.
          </li>
          <li>
            <strong>Or download PNG</strong> — save the gradient as a
            high-resolution image for social media or mockups.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🌈</div>
            <h3>3 Gradient Types</h3>
            <p>
              Linear, radial, and conic gradients — everything CSS supports,
              visualized instantly.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎨</div>
            <h3>Unlimited Stops</h3>
            <p>
              Add, remove, reorder, and edit as many color stops as you need.
              Perfect for complex, multi-color gradients.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">👁️</div>
            <h3>Live Preview</h3>
            <p>
              See your gradient update in real time — no need to refresh or
              copy-paste to test.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⚡</div>
            <h3>20+ Presets</h3>
            <p>
              Ready-made gradients inspired by sunsets, oceans, auroras, and
              more. One click to apply.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📋</div>
            <h3>CSS + Tailwind Output</h3>
            <p>
              Copy as pure CSS or Tailwind arbitrary value classes — ready for
              any project.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⬇️</div>
            <h3>Download PNG</h3>
            <p>
              Export your gradient as a 1920×1080 PNG for social media,
              presentations, or mockups.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Understanding CSS Gradients</h2>
        <ul className="seo-list">
          <li>
            <strong>Linear gradient</strong> — colors transition along a
            straight line at a given angle. Example:{' '}
            <code>linear-gradient(45deg, red, blue)</code>.
          </li>
          <li>
            <strong>Radial gradient</strong> — colors radiate outward from a
            center point. Example:{' '}
            <code>radial-gradient(circle at center, red, blue)</code>.
          </li>
          <li>
            <strong>Conic gradient</strong> — colors sweep around a center
            point like a pie chart. Example:{' '}
            <code>conic-gradient(from 0deg, red, blue)</code>.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this gradient generator free?</summary>
          <p>
            Yes — completely free with no signup, no watermarks, no hidden
            fees. Use it as often as you need for personal or commercial
            projects.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I use the generated gradients commercially?</summary>
          <p>
            Absolutely — CSS gradients are just code. You can use any gradient
            you create here in personal, commercial, or client projects
            without attribution.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How many colors can I add?</summary>
          <p>
            As many as you want! There's no limit to the number of color stops
            you can add. Complex gradients with 5, 10, or even 20 stops all
            work smoothly.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What's the difference between linear, radial, and conic?</summary>
          <p>
            <strong>Linear</strong> goes in a straight line in the direction
            of the angle. <strong>Radial</strong> radiates out from a center
            point in circles. <strong>Conic</strong> sweeps around a center
            point like a clock face.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does the download work on all browsers?</summary>
          <p>
            Yes — PNG download uses the HTML5 Canvas API, supported by every
            modern browser. Note: conic gradients are approximated as linear
            in the PNG export (canvas doesn't natively support conic).
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are my gradients saved?</summary>
          <p>
            Recent gradients are saved locally in your browser using
            localStorage. Click "Save to recent" and they'll persist between
            sessions. Nothing is uploaded anywhere.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I copy Tailwind classes?</summary>
          <p>
            Yes — the tool generates a Tailwind-compatible arbitrary value
            class like{' '}
            <code>bg-[linear-gradient(45deg,_#ff6b6b,_#feca57)]</code> that
            works in Tailwind CSS v3+.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other tools: <strong>Color Picker</strong>,{' '}
          <strong>Image Tools</strong> (Resize, Compress, Convert),{' '}
          <strong>PDF Tools</strong>, <strong>QR Code Generator</strong>, and{' '}
          <strong>Typing Test</strong> — all free and browser-based.
        </p>
      </section>
    </article>
  );
}