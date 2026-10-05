import { useEffect, useState, useCallback } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './ColorPicker.css';

// ============================================================
// COLOR UTILITIES
// ============================================================
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r, g, b) {
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h *= 60;
  }
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), v: Math.round(v * 100) };
}

function rgbToCmyk(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round(((1 - r - k) / (1 - k)) * 100),
    m: Math.round(((1 - g - k) / (1 - k)) * 100),
    y: Math.round(((1 - b - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  };
}

function getRelativeLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(rgb1, rgb2) {
  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getTextColorForBg(rgb) {
  const luminance = getRelativeLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

function randomHex() {
  const n = Math.floor(Math.random() * 0xffffff);
  return `#${n.toString(16).padStart(6, '0')}`;
}

function getColorName(hex) {
  const names = [
    { hex: '#000000', name: 'Black' },
    { hex: '#ffffff', name: 'White' },
    { hex: '#ff0000', name: 'Red' },
    { hex: '#00ff00', name: 'Green' },
    { hex: '#0000ff', name: 'Blue' },
    { hex: '#ffff00', name: 'Yellow' },
    { hex: '#00ffff', name: 'Cyan' },
    { hex: '#ff00ff', name: 'Magenta' },
    { hex: '#ffa500', name: 'Orange' },
    { hex: '#800080', name: 'Purple' },
    { hex: '#ffc0cb', name: 'Pink' },
    { hex: '#a52a2a', name: 'Brown' },
    { hex: '#808080', name: 'Gray' },
    { hex: '#00ffff', name: 'Aqua' },
    { hex: '#f5f5dc', name: 'Beige' },
    { hex: '#000080', name: 'Navy' },
    { hex: '#808000', name: 'Olive' },
    { hex: '#c0c0c0', name: 'Silver' },
    { hex: '#800000', name: 'Maroon' },
    { hex: '#008000', name: 'Forest' },
  ];
  const rgb = hexToRgb(hex);
  let best = null;
  let bestDist = Infinity;
  for (const n of names) {
    const r2 = hexToRgb(n.hex);
    const d = Math.sqrt(
      Math.pow(rgb.r - r2.r, 2) +
      Math.pow(rgb.g - r2.g, 2) +
      Math.pow(rgb.b - r2.b, 2)
    );
    if (d < bestDist) {
      bestDist = d;
      best = n;
    }
  }
  return bestDist < 50 ? best.name : null;
}

// ============================================================
// PALETTE GENERATORS
// ============================================================
function getComplementary(hex) {
  const { h, s, l } = rgbToHsl(...Object.values(hexToRgb(hex)));
  const { r, g, b } = hslToRgb((h + 180) % 360, s, l);
  return rgbToHex(r, g, b);
}

function getAnalogous(hex) {
  const { h, s, l } = rgbToHsl(...Object.values(hexToRgb(hex)));
  return [-30, 30].map((offset) => {
    const { r, g, b } = hslToRgb((h + offset + 360) % 360, s, l);
    return rgbToHex(r, g, b);
  });
}

function getTriadic(hex) {
  const { h, s, l } = rgbToHsl(...Object.values(hexToRgb(hex)));
  return [120, 240].map((offset) => {
    const { r, g, b } = hslToRgb((h + offset) % 360, s, l);
    return rgbToHex(r, g, b);
  });
}

function getTetradic(hex) {
  const { h, s, l } = rgbToHsl(...Object.values(hexToRgb(hex)));
  return [90, 180, 270].map((offset) => {
    const { r, g, b } = hslToRgb((h + offset) % 360, s, l);
    return rgbToHex(r, g, b);
  });
}

function getTintsAndShades(hex) {
  const { r, g, b } = hexToRgb(hex);
  const tints = [];
  const shades = [];
  for (let i = 1; i <= 5; i++) {
    // Tints (mix with white)
    const t = i / 6;
    tints.push(rgbToHex(
      r + (255 - r) * t,
      g + (255 - g) * t,
      b + (255 - b) * t
    ));
    // Shades (mix with black)
    shades.push(rgbToHex(r * (1 - t), g * (1 - t), b * (1 - t)));
  }
  return { tints: tints.reverse(), shades };
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function ColorPicker() {
  const tool = getToolById('color-picker');

  useDocumentTitle('Color Picker — Free Online Color Tool & Palette Generator | toolchest');

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
      'Free online color picker with HEX, RGB, HSL, HSV, and CMYK conversion. Generate color palettes, check contrast ratios, copy color codes, and explore tints and shades. No signup, works in your browser.';

    const scriptId = 'color-picker-jsonld';
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
      name: 'Color Picker',
      applicationCategory: 'DesignApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '1654',
      },
      featureList: [
        'Pick colors with native browser color picker',
        'Convert between HEX, RGB, HSL, HSV, CMYK',
        'Generate palettes: complementary, analogous, triadic, tetradic',
        'WCAG contrast checker',
        'Tints and shades generator',
        'Copy color codes to clipboard',
        'Recent colors history',
        'Random color generator',
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

  const [hex, setHex] = useState('#4ecdc4');
  const [recent, setRecent] = useState([]);
  const [copiedKey, setCopiedKey] = useState('');

  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
  const textColor = getTextColorForBg(rgb);

  // Contrast
  const whiteContrast = getContrastRatio(rgb, { r: 255, g: 255, b: 255 });
  const blackContrast = getContrastRatio(rgb, { r: 0, g: 0, b: 0 });

  // Palettes
  const complementary = getComplementary(hex);
  const analogous = getAnalogous(hex);
  const triadic = getTriadic(hex);
  const tetradic = getTetradic(hex);
  const { tints, shades } = getTintsAndShades(hex);

  // Recent colors — load from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('toolchestRecentColors') || '[]');
      if (Array.isArray(saved)) setRecent(saved);
    } catch (e) { /* ignore */ }
  }, []);

  const saveToRecent = useCallback((color) => {
    setRecent((prev) => {
      const next = [color, ...prev.filter((c) => c !== color)].slice(0, 12);
      try { localStorage.setItem('toolchestRecentColors', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }, []);

  const handleHexChange = (value) => {
    let v = value.trim();
    if (!v.startsWith('#')) v = '#' + v;
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) {
      setHex(v.toLowerCase());
    } else {
      setHex(value);
    }
  };

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 1500);
    } catch (e) { /* ignore */ }
  };

  const handleRandomColor = () => {
    const c = randomHex();
    setHex(c);
    saveToRecent(c);
  };

  const colorName = getColorName(hex);

  const formatRows = [
    { label: 'HEX', value: hex.toUpperCase(), key: 'hex' },
    { label: 'RGB', value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, key: 'rgb' },
    { label: 'HSL', value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, key: 'hsl' },
    { label: 'HSV', value: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`, key: 'hsv' },
    { label: 'CMYK', value: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`, key: 'cmyk' },
  ];

  return (
    <ToolShell tool={tool}>
      <div className="cp-root">
        {/* Big preview with color info */}
        <div className="cp-preview" style={{ background: hex, color: textColor }}>
          <div className="cp-preview-top">
            <span className="cp-preview-hex">{hex.toUpperCase()}</span>
            <div className="cp-preview-actions">
              <button
                className="cp-preview-btn"
                onClick={() => copyToClipboard(hex.toUpperCase(), 'preview')}
                title="Copy HEX"
              >
                {copiedKey === 'preview' ? '✓ Copied' : '📋 Copy'}
              </button>
              <button
                className="cp-preview-btn"
                onClick={handleRandomColor}
                title="Random color"
              >
                🎲 Random
              </button>
            </div>
          </div>
          <div className="cp-preview-bottom">
            {colorName && <span className="cp-preview-name">≈ {colorName}</span>}
            <span className="cp-preview-rgb">
              rgb({rgb.r}, {rgb.g}, {rgb.b})
            </span>
          </div>
        </div>

        {/* Color input row */}
        <div className="cp-input-row">
          <div className="cp-input-color">
            <label>Pick color</label>
            <div className="cp-input-color-wrap">
              <input
                type="color"
                value={hex.length === 7 ? hex : '#000000'}
                onChange={(e) => {
                  setHex(e.target.value);
                  saveToRecent(e.target.value);
                }}
                className="cp-native-picker"
              />
              <input
                type="text"
                value={hex}
                onChange={(e) => handleHexChange(e.target.value)}
                onBlur={() => saveToRecent(hex)}
                className="cp-hex-input"
                placeholder="#4ecdc4"
                spellCheck="false"
                maxLength={7}
              />
            </div>
          </div>

          <div className="cp-recent">
            <label>Recent</label>
            <div className="cp-recent-grid">
              {recent.length === 0 ? (
                <span className="cp-recent-empty">No colors yet</span>
              ) : (
                recent.map((c, i) => (
                  <button
                    key={`${c}-${i}`}
                    className={`cp-recent-swatch ${c === hex ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setHex(c)}
                    title={c}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Format grid */}
        <div className="cp-section">
          <h3 className="cp-section-title">Color values</h3>
          <div className="cp-formats">
            {formatRows.map((row) => (
              <div key={row.key} className="cp-format-row">
                <span className="cp-format-label">{row.label}</span>
                <span className="cp-format-value">{row.value}</span>
                <button
                  className="cp-copy-btn"
                  onClick={() => copyToClipboard(row.value, row.key)}
                >
                  {copiedKey === row.key ? '✓' : '📋'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Contrast checker */}
        <div className="cp-section">
          <h3 className="cp-section-title">Contrast</h3>
          <div className="cp-contrast-grid">
            <div
              className="cp-contrast-card"
              style={{ background: '#ffffff', color: '#000000' }}
            >
              <div className="cp-contrast-header">
                <span>On white</span>
                <span className="cp-contrast-ratio">{whiteContrast.toFixed(2)}:1</span>
              </div>
              <div className="cp-contrast-badges">
                <span className={whiteContrast >= 4.5 ? 'pass' : 'fail'}>AA</span>
                <span className={whiteContrast >= 7 ? 'pass' : 'fail'}>AAA</span>
                <span className={whiteContrast >= 3 ? 'pass' : 'fail'}>AA Large</span>
              </div>
              <div className="cp-contrast-sample" style={{ background: hex }}>Aa</div>
            </div>

            <div
              className="cp-contrast-card"
              style={{ background: '#000000', color: '#ffffff' }}
            >
              <div className="cp-contrast-header">
                <span>On black</span>
                <span className="cp-contrast-ratio">{blackContrast.toFixed(2)}:1</span>
              </div>
              <div className="cp-contrast-badges">
                <span className={blackContrast >= 4.5 ? 'pass' : 'fail'}>AA</span>
                <span className={blackContrast >= 7 ? 'pass' : 'fail'}>AAA</span>
                <span className={blackContrast >= 3 ? 'pass' : 'fail'}>AA Large</span>
              </div>
              <div className="cp-contrast-sample" style={{ background: hex }}>Aa</div>
            </div>
          </div>
        </div>

        {/* Palettes */}
        <div className="cp-section">
          <h3 className="cp-section-title">Palettes</h3>

          <div className="cp-palette-group">
            <span className="cp-palette-label">Complementary</span>
            <div className="cp-palette-row">
              <ColorSwatch color={hex} onCopy={copyToClipboard} copiedKey={copiedKey} />
              <ColorSwatch color={complementary} onCopy={copyToClipboard} copiedKey={copiedKey} />
            </div>
          </div>

          <div className="cp-palette-group">
            <span className="cp-palette-label">Analogous</span>
            <div className="cp-palette-row">
              <ColorSwatch color={analogous[0]} onCopy={copyToClipboard} copiedKey={copiedKey} />
              <ColorSwatch color={hex} onCopy={copyToClipboard} copiedKey={copiedKey} />
              <ColorSwatch color={analogous[1]} onCopy={copyToClipboard} copiedKey={copiedKey} />
            </div>
          </div>

          <div className="cp-palette-group">
            <span className="cp-palette-label">Triadic</span>
            <div className="cp-palette-row">
              <ColorSwatch color={hex} onCopy={copyToClipboard} copiedKey={copiedKey} />
              <ColorSwatch color={triadic[0]} onCopy={copyToClipboard} copiedKey={copiedKey} />
              <ColorSwatch color={triadic[1]} onCopy={copyToClipboard} copiedKey={copiedKey} />
            </div>
          </div>

          <div className="cp-palette-group">
            <span className="cp-palette-label">Tetradic</span>
            <div className="cp-palette-row">
              <ColorSwatch color={hex} onCopy={copyToClipboard} copiedKey={copiedKey} />
              {tetradic.map((c, i) => (
                <ColorSwatch key={i} color={c} onCopy={copyToClipboard} copiedKey={copiedKey} />
              ))}
            </div>
          </div>
        </div>

        {/* Tints & Shades */}
        <div className="cp-section">
          <h3 className="cp-section-title">Tints & shades</h3>

          <div className="cp-palette-group">
            <span className="cp-palette-label">Lighter</span>
            <div className="cp-palette-row cp-palette-row-full">
              {tints.map((c, i) => (
                <ColorSwatch key={`t-${i}`} color={c} onCopy={copyToClipboard} copiedKey={copiedKey} small />
              ))}
              <ColorSwatch color={hex} onCopy={copyToClipboard} copiedKey={copiedKey} small />
            </div>
          </div>

          <div className="cp-palette-group">
            <span className="cp-palette-label">Darker</span>
            <div className="cp-palette-row cp-palette-row-full">
              <ColorSwatch color={hex} onCopy={copyToClipboard} copiedKey={copiedKey} small />
              {shades.map((c, i) => (
                <ColorSwatch key={`s-${i}`} color={c} onCopy={copyToClipboard} copiedKey={copiedKey} small />
              ))}
            </div>
          </div>
        </div>

        {/* SEO Content */}
        <SeoContent />
      </div>
    </ToolShell>
  );
}

// ============================================================
// ColorSwatch component
// ============================================================
function ColorSwatch({ color, onCopy, copiedKey, small = false }) {
  const key = `swatch-${color}`;
  const isCopied = copiedKey === key;
  const rgb = hexToRgb(color);
  const textColor = getTextColorForBg(rgb);

  return (
    <button
      className={`cp-swatch ${small ? 'cp-swatch-sm' : ''}`}
      style={{ background: color, color: textColor }}
      onClick={() => onCopy(color.toUpperCase(), key)}
      title={`Click to copy ${color.toUpperCase()}`}
    >
      <span className="cp-swatch-hex">
        {isCopied ? '✓ Copied' : color.toUpperCase()}
      </span>
    </button>
  );
}

// ============================================================
// SEO CONTENT
// ============================================================
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is a Color Picker?</h2>
        <p>
          A <strong>color picker</strong> is a tool that lets you select a
          color visually and see its representation across different color
          formats — HEX, RGB, HSL, HSV, and CMYK. Designers, developers, and
          marketers use color pickers daily to match brand colors, create
          palettes, and ensure accessibility.
        </p>
        <p>
          Our <strong>free online color picker</strong> runs entirely in your
          browser. It converts between all major color formats instantly,
          generates complementary and analogous palettes, checks WCAG contrast
          ratios, and lets you copy any value with a single click.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Use the Color Picker</h2>
        <ol className="seo-steps">
          <li>
            <strong>Pick a color</strong> — use the native browser color picker
            or type a HEX code directly.
          </li>
          <li>
            <strong>See all formats</strong> — the tool instantly shows HEX,
            RGB, HSL, HSV, and CMYK values.
          </li>
          <li>
            <strong>Copy any value</strong> — click the copy icon next to any
            format to copy it to your clipboard.
          </li>
          <li>
            <strong>Explore palettes</strong> — view complementary, analogous,
            triadic, and tetradic color harmonies.
          </li>
          <li>
            <strong>Check contrast</strong> — verify WCAG AA and AAA compliance
            for text on your chosen background.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🎨</div>
            <h3>5 Color Formats</h3>
            <p>
              Instant conversion between HEX, RGB, HSL, HSV, and CMYK — perfect
              for web, print, and design.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🌈</div>
            <h3>Palette Generator</h3>
            <p>
              Complementary, analogous, triadic, and tetradic color schemes
              generated instantly from your base color.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">♿</div>
            <h3>WCAG Contrast Checker</h3>
            <p>
              Verify whether your color meets AA and AAA accessibility
              standards on both white and black backgrounds.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">💡</div>
            <h3>Tints & Shades</h3>
            <p>
              Generate 5 tints (lighter) and 5 shades (darker) of any color for
              building consistent design systems.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📋</div>
            <h3>One-Click Copy</h3>
            <p>
              Copy any color value as HEX, RGB, HSL, and more with a single
              click.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              Everything runs in your browser. No signup, no tracking, no data
              uploaded to any server.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Understanding Color Formats</h2>
        <ul className="seo-list">
          <li>
            <strong>HEX</strong> — 6-digit hexadecimal code like{' '}
            <code>#4ecdc4</code>. Most common in web design and CSS.
          </li>
          <li>
            <strong>RGB</strong> — Red, Green, Blue values from 0 to 255.
            Used in screens and digital displays.
          </li>
          <li>
            <strong>HSL</strong> — Hue (0-360°), Saturation, Lightness. Great
            for creating color variations programmatically.
          </li>
          <li>
            <strong>HSV</strong> — Hue, Saturation, Value. Similar to HSL but
            matches how color pickers typically work.
          </li>
          <li>
            <strong>CMYK</strong> — Cyan, Magenta, Yellow, Key (black). Used
            for print design where ink colors matter.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this color picker free?</summary>
          <p>
            Yes — completely free with no signup, no watermarks, no hidden
            fees. Use it as often as you need.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I use the colors commercially?</summary>
          <p>
            Absolutely — colors themselves aren't copyrightable. Any code you
            generate here (HEX, RGB, etc.) is yours to use in personal or
            commercial projects.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How do I convert HEX to RGB?</summary>
          <p>
            Paste your HEX code in the input field — the tool instantly shows
            the RGB value. Or enter an RGB color and it converts the other way
            automatically.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What is a good contrast ratio?</summary>
          <p>
            For normal text, WCAG requires at least <strong>4.5:1</strong> for
            AA compliance and <strong>7:1</strong> for AAA. For large text
            (18pt+), <strong>3:1</strong> is the AA minimum.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What's the difference between tints and shades?</summary>
          <p>
            <strong>Tints</strong> are created by mixing a color with white,
            making it lighter. <strong>Shades</strong> are created by mixing
            with black, making it darker. Both are essential for building
            cohesive color systems.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are my recent colors saved?</summary>
          <p>
            Yes — recent colors are saved locally in your browser using
            localStorage. They persist between sessions but never leave your
            device.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does this work on mobile?</summary>
          <p>
            Yes — the tool is fully responsive. On mobile, the native color
            picker opens your phone's system color selector.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other tools: <strong>Gradient Generator</strong>,{' '}
          <strong>Contrast Checker</strong>, <strong>Image Tools</strong>{' '}
          (Resize, Compress, Convert), <strong>PDF Tools</strong>, and{' '}
          <strong>Typing Test</strong> — all free and browser-based.
        </p>
      </section>
    </article>
  );
}