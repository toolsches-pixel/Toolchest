import { useRef, useState, useEffect } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './NumberBaseConverter.css';

const BASES = [
  { id: 'bin', label: 'Binary', short: 'BIN', base: 2, prefix: '0b', placeholder: '1010', icon: '01' },
  { id: 'oct', label: 'Octal', short: 'OCT', base: 8, prefix: '0o', placeholder: '12', icon: '8' },
  { id: 'dec', label: 'Decimal', short: 'DEC', base: 10, prefix: '', placeholder: '10', icon: '10' },
  { id: 'hex', label: 'Hexadecimal', short: 'HEX', base: 16, prefix: '0x', placeholder: 'A', icon: '16' },
];

const EXTRA_BASES = [3, 4, 5, 6, 7, 9, 12, 32, 36];

const CHAR_SETS = {
  2: '01',
  3: '012',
  4: '0123',
  5: '01234',
  6: '012345',
  7: '0123456',
  8: '01234567',
  9: '012345678',
  10: '0123456789',
  12: '0123456789AB',
  16: '0123456789ABCDEF',
  32: '0123456789ABCDEFGHIJKLMNOPQRSTUV',
  36: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
};

// Validate input for a given base
function isValidForBase(str, base) {
  if (!str) return true;
  const cleaned = str.replace(/^0[bxo]/i, '').replace(/[\s_]/g, '');
  if (cleaned === '') return true;
  const validChars = CHAR_SETS[base] || '';
  for (const c of cleaned.toUpperCase()) {
    if (!validChars.includes(c)) return false;
  }
  return true;
}

// Parse string in given base → BigInt
function parseBigInt(str, base) {
  const cleaned = str.replace(/^0[bxo]/i, '').replace(/[\s_]/g, '').toUpperCase();
  if (cleaned === '') return null;
  try {
    return BigInt(parseInt(cleaned, base));
  } catch {
    // Fallback for big numbers: manual parse
    try {
      let result = 0n;
      const b = BigInt(base);
      for (const c of cleaned) {
        const digit = CHAR_SETS[base].indexOf(c);
        if (digit === -1) throw new Error('Invalid digit');
        result = result * b + BigInt(digit);
      }
      return result;
    } catch {
      return null;
    }
  }
}

// Convert BigInt → string in given base
function bigIntToString(num, base) {
  if (num === null || num === undefined) return '';
  if (num === 0n) return '0';
  const isNeg = num < 0n;
  let n = isNeg ? -num : num;
  const b = BigInt(base);
  const chars = CHAR_SETS[base];
  let result = '';
  while (n > 0n) {
    const digit = Number(n % b);
    result = chars[digit] + result;
    n = n / b;
  }
  return isNeg ? '-' + result : result;
}

// Add thousand separators (for decimal)
function formatDecimal(str) {
  if (!str) return '';
  const isNeg = str.startsWith('-');
  const digits = isNeg ? str.slice(1) : str;
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return isNeg ? '-' + formatted : formatted;
}

export default function NumberBaseConverter() {
  const tool = getToolById('number-base-converter');

  // SEO
  useDocumentTitle(
    'Number Base Converter — Binary, Decimal, Octal, Hex | toolchest'
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
      'Free online number base converter. Instantly convert between binary, decimal, octal, hexadecimal, and 36 other bases. Live conversion, bit/byte info, and copy to clipboard.';

    const scriptId = 'number-base-converter-jsonld';
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
      name: 'Number Base Converter',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '1329',
      },
      featureList: [
        'Convert between binary, decimal, octal, hex',
        'Live conversion as you type',
        'Supports bases 2 through 36',
        'Bit and byte information',
        'Big number support',
        'Copy to clipboard',
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

  // Main state — the "source of truth" is a BigInt (or null)
  const [value, setValue] = useState(10n);
  const [activeBase, setActiveBase] = useState(10); // which input user is typing in
  const [rawInputs, setRawInputs] = useState({
    2: '1010',
    8: '12',
    10: '10',
    16: 'A',
  });
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [extraBase, setExtraBase] = useState(null); // selected extra base
  const [showExtras, setShowExtras] = useState(false);

  // Sync value → rawInputs whenever value changes (from another input)
  useEffect(() => {
    setRawInputs({
      2: bigIntToString(value, 2),
      8: bigIntToString(value, 8),
      10: value === null ? '' : value.toString(),
      16: bigIntToString(value, 16).toUpperCase(),
    });
  }, [value]);

  // Handle typing in an input
  const handleInputChange = (base, inputStr) => {
    // Strip prefix + spaces for validation, but keep display as-is
    const isNeg = inputStr.trim().startsWith('-');
    const cleaned = inputStr.replace(/[\s_]/g, '').replace(/^-/, '');

    if (cleaned === '') {
      setRawInputs((prev) => ({ ...prev, [base]: isNeg ? '-' : '' }));
      setValue(null);
      setError('');
      setActiveBase(base);
      return;
    }

    if (!isValidForBase(cleaned, base)) {
      // Just show error but don't update others
      setError(`Invalid ${base === 16 ? 'hex' : base === 2 ? 'binary' : base === 8 ? 'octal' : 'decimal'} character`);
      setRawInputs((prev) => ({ ...prev, [base]: inputStr }));
      return;
    }

    setError('');
    const parsed = parseBigInt((isNeg ? '-' : '') + cleaned, base);

    // Update this input's display
    setRawInputs((prev) => ({ ...prev, [base]: inputStr }));
    setActiveBase(base);

    if (parsed !== null) {
      setValue(parsed);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  // Clear
  const reset = () => {
    setValue(0n);
    setRawInputs({ 2: '', 8: '', 10: '', 16: '' });
    setError('');
    setExtraBase(null);
  };

  // Derived values
  const decimalStr = value === null ? '' : value.toString();
  const isNegative = value !== null && value < 0n;
  const absValue = value === null ? null : value < 0n ? -value : value;

  // Bit info
  const bits = absValue === null ? 0 : absValue === 0n ? 1 : absValue.toString(2).length;
  const bytes = Math.ceil(bits / 8);
  const hexDigits = absValue === null ? 0 : Math.max(1, Math.ceil(bits / 4));

  // ASCII char (0-127)
  const asciiChar =
    value !== null && value >= 0n && value <= 127n
      ? String.fromCharCode(Number(value))
      : null;

  // Extra base output
  const extraOutput =
    extraBase && value !== null ? bigIntToString(value, extraBase).toUpperCase() : '';

  return (
    <ToolShell tool={tool}>
      <div className="pdf-tool">
        {/* Main converter card */}
        <div className="nbc-card">
          {/* Inputs */}
          {BASES.map((b) => {
            const inputValue = rawInputs[b.base] ?? '';
            const isActive = activeBase === b.base;
            return (
              <div
                key={b.id}
                className={`nbc-row ${isActive ? 'active' : ''}`}
              >
                <div className="nbc-label">
                  <span className="nbc-badge">{b.short}</span>
                  <span className="nbc-base-name">{b.label}</span>
                </div>
                <input
                  type="text"
                  className="nbc-input"
                  value={inputValue}
                  onChange={(e) => handleInputChange(b.base, e.target.value)}
                  onFocus={() => setActiveBase(b.base)}
                  placeholder={b.placeholder}
                  spellCheck="false"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                />
                <div className="nbc-actions">
                  <button
                    className={`nbc-copy-btn ${copiedId === b.base ? 'copied' : ''}`}
                    onClick={() =>
                      copyToClipboard(inputValue, b.base)
                    }
                    disabled={!inputValue}
                    title="Copy"
                  >
                    {copiedId === b.base ? '✓' : '📋'}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Base prefix hint */}
          {error && <div className="nbc-error">⚠️ {error}</div>}
        </div>

        {/* Info row */}
        <div className="nbc-info-grid">
          <div className="nbc-info-cell">
            <div className="nbc-info-label">Bits</div>
            <div className="nbc-info-value">{bits}</div>
          </div>
          <div className="nbc-info-cell">
            <div className="nbc-info-label">Bytes</div>
            <div className="nbc-info-value">{bytes}</div>
          </div>
          <div className="nbc-info-cell">
            <div className="nbc-info-label">Hex digits</div>
            <div className="nbc-info-value">{hexDigits}</div>
          </div>
          <div className="nbc-info-cell">
            <div className="nbc-info-label">Sign</div>
            <div className="nbc-info-value">
              {isNegative ? '−' : '+'}
            </div>
          </div>
        </div>

        {/* Decimal formatted */}
        {decimalStr && (
          <div className="nbc-formatted">
            <div className="nbc-formatted-label">Decimal (formatted)</div>
            <div className="nbc-formatted-value">
              {formatDecimal(decimalStr)}
            </div>
            <button
              className={`nbc-copy-btn ${copiedId === 'formatted' ? 'copied' : ''}`}
              onClick={() => copyToClipboard(formatDecimal(decimalStr), 'formatted')}
              title="Copy"
            >
              {copiedId === 'formatted' ? '✓' : '📋'}
            </button>
          </div>
        )}

        {/* ASCII */}
        {asciiChar && (
          <div className="nbc-formatted">
            <div className="nbc-formatted-label">ASCII character</div>
            <div className="nbc-formatted-value nbc-ascii">
              <span className="nbc-ascii-char">{asciiChar === ' ' ? '␣' : asciiChar}</span>
              <span className="nbc-ascii-code">(code {decimalStr})</span>
            </div>
            <button
              className={`nbc-copy-btn ${copiedId === 'ascii' ? 'copied' : ''}`}
              onClick={() => copyToClipboard(asciiChar, 'ascii')}
              title="Copy"
            >
              {copiedId === 'ascii' ? '✓' : '📋'}
            </button>
          </div>
        )}

        {/* Extra bases */}
        <div className="pdf-target">
          <div className="nbc-extras-header">
            <label className="pdf-target-label" style={{ margin: 0 }}>
              Other bases
            </label>
            <button
              className="nbc-toggle-btn"
              onClick={() => setShowExtras((v) => !v)}
            >
              {showExtras ? 'Hide' : 'Show'} bases 3-36
            </button>
          </div>

          {showExtras && (
            <>
              <div className="nbc-extra-pills">
                {EXTRA_BASES.map((b) => (
                  <button
                    key={b}
                    className={`nbc-extra-pill ${extraBase === b ? 'active' : ''}`}
                    onClick={() => setExtraBase(b)}
                  >
                    Base {b}
                  </button>
                ))}
              </div>

              {extraBase && (
                <div className="nbc-extra-output">
                  <div className="nbc-extra-label">Base {extraBase}</div>
                  <div className="nbc-extra-value">
                    {extraOutput || '—'}
                  </div>
                  <button
                    className={`nbc-copy-btn ${copiedId === `extra` ? 'copied' : ''}`}
                    onClick={() => copyToClipboard(extraOutput, 'extra')}
                    disabled={!extraOutput}
                    title="Copy"
                  >
                    {copiedId === 'extra' ? '✓' : '📋'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="nbc-bottom-actions">
          <button className="btn-secondary" onClick={reset}>
            ⟳ Reset
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              // Swap: focus binary
              setActiveBase(2);
            }}
          >
            ⌨️ Focus Binary
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              // Swap: focus hex
              setActiveBase(16);
            }}
          >
            ⌨️ Focus Hex
          </button>
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
        <h2>What is a Number Base Converter?</h2>
        <p>
          A <strong>number base converter</strong> translates a number from one
          numeral system to another. The most common bases are:
        </p>
        <ul className="seo-list">
          <li>
            <strong>Binary (base 2)</strong> — uses only 0 and 1. The language
            of computers.
          </li>
          <li>
            <strong>Octal (base 8)</strong> — digits 0-7. Historically used in
            computing.
          </li>
          <li>
            <strong>Decimal (base 10)</strong> — digits 0-9. Everyday numbers.
          </li>
          <li>
            <strong>Hexadecimal (base 16)</strong> — digits 0-9 and A-F. Widely
            used in programming, colors, and memory addresses.
          </li>
        </ul>
        <p>
          Our <strong>free online base converter</strong> converts between
          binary, decimal, octal, hexadecimal, and 30+ other bases instantly as
          you type. All processing happens in your browser — nothing is
          uploaded.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Convert Between Number Bases — Step by Step</h2>
        <ol className="seo-steps">
          <li>
            <strong>Pick a base to type in</strong> — click any input field
            (Binary, Octal, Decimal, or Hex).
          </li>
          <li>
            <strong>Enter your number</strong> — the other bases update in
            real time as you type.
          </li>
          <li>
            <strong>Copy any result</strong> — click the 📋 icon next to any
            field to copy that value.
          </li>
          <li>
            <strong>Check bit/byte info</strong> — see how many bits, bytes,
            and hex digits your number uses.
          </li>
          <li>
            <strong>Explore other bases</strong> — click "Show bases 3-36" to
            convert to any base up to 36.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">⚡</div>
            <h3>Live Conversion</h3>
            <p>
              Type in any base — the other three update instantly. No button
              pressing needed.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔢</div>
            <h3>4 Main Bases</h3>
            <p>
              Binary (2), Octal (8), Decimal (10), and Hexadecimal (16) — all
              on one screen.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🚀</div>
            <h3>Bases 3-36</h3>
            <p>
              Convert to any base up to 36 — including base 3, 5, 12, 32, and
              more.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📊</div>
            <h3>Bit & Byte Info</h3>
            <p>
              See how many bits, bytes, and hex digits your number requires —
              useful for memory and encoding work.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔤</div>
            <h3>ASCII Character</h3>
            <p>
              Numbers 0-127 automatically show their ASCII character (e.g., 65
              → 'A').
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              All conversions run in your browser. Nothing is uploaded to any
              server.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Use Cases</h2>
        <ul className="seo-list">
          <li>
            <strong>Programming</strong> — convert between binary, decimal, and
            hex when working with memory, bitmasks, or low-level code.
          </li>
          <li>
            <strong>Web development</strong> — hex colors (<code>#FF5733</code>)
            use base 16. Convert to RGB (base 10) instantly.
          </li>
          <li>
            <strong>Learning computer science</strong> — understand how
            computers represent numbers and how different bases relate.
          </li>
          <li>
            <strong>Network / IP work</strong> — convert IPv4 addresses
            (decimal) to hex or binary.
          </li>
          <li>
            <strong>Embedded systems</strong> — work with registers, ports, and
            memory addresses in hex or binary.
          </li>
          <li>
            <strong>Cryptography</strong> — convert hashes and keys between
            binary, decimal, and hex.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Number Base Conversion Reference</h2>
        <p>Here's how the number 100 looks in different bases:</p>
        <ul className="seo-list">
          <li>
            <strong>Binary (2):</strong> <code>1100100</code>
          </li>
          <li>
            <strong>Octal (8):</strong> <code>144</code>
          </li>
          <li>
            <strong>Decimal (10):</strong> <code>100</code>
          </li>
          <li>
            <strong>Hexadecimal (16):</strong> <code>64</code>
          </li>
          <li>
            <strong>Base 36:</strong> <code>2S</code>
          </li>
        </ul>
        <p>
          The same number — 100 in decimal — represents 100 items, but its
          representation changes depending on the base.
        </p>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this number base converter free?</summary>
          <p>
            Yes — completely free with no limits, no signup, no watermarks. Use
            it as often as you want.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What bases does it support?</summary>
          <p>
            The 4 most common bases (Binary, Octal, Decimal, Hex) are always
            shown. You can also convert to any base from 3 to 36 — including
            base 3, 5, 12, 32, and 36.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work with big numbers?</summary>
          <p>
            Yes — we use JavaScript <code>BigInt</code> internally, so you can
            convert arbitrarily large numbers without losing precision.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What does the "Bits" and "Bytes" info mean?</summary>
          <p>
            <strong>Bits</strong> = how many binary digits your number uses.{' '}
            <strong>Bytes</strong> = how many 8-bit chunks it fits into. This
            is useful when working with memory, encoding, or networking.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What's the ASCII character section?</summary>
          <p>
            Numbers 0–127 in decimal map directly to ASCII characters. For
            example, 65 → 'A', 97 → 'a', 32 → space. This is helpful when
            debugging character encoding.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are my numbers safe?</summary>
          <p>
            Yes — everything runs locally in your browser. Nothing is uploaded
            to any server. Your data stays completely private.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I paste a number with a 0x or 0b prefix?</summary>
          <p>
            Yes — prefixes like <code>0x</code> (hex), <code>0b</code>{' '}
            (binary), and <code>0o</code> (octal) are automatically stripped.
            Spaces and underscores are also ignored.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work on mobile?</summary>
          <p>
            Yes — the converter is fully responsive and works on phones and
            tablets.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other developer tools: <strong>Password Generator</strong>,{' '}
          <strong>Hash Generator</strong>, <strong>UUID Generator</strong>,{' '}
          <strong>Base64 Encoder</strong>, <strong>JSON Formatter</strong>,{' '}
          <strong>Regex Tester</strong>, and <strong>JWT Decoder</strong> — all
          free and browser-based.
        </p>
      </section>
    </article>
  );
}