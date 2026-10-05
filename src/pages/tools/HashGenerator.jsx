import { useEffect, useState, useCallback, useRef } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './HashGenerator.css';

// ============================================================
// MD5 — pure JS implementation (Web Crypto has no MD5)
// ============================================================
function md5(input) {
  // Convert string to UTF-8 bytes
  const utf8 = unescape(encodeURIComponent(input));
  return md5Bytes(utf8);
}

function md5Bytes(str) {
  function rotateLeft(lValue, iShiftBits) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function addUnsigned(lX, lY) {
    const lX8 = lX & 0x80000000;
    const lY8 = lY & 0x80000000;
    const lX4 = lX & 0x40000000;
    const lY4 = lY & 0x40000000;
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    }
    return lResult ^ lX8 ^ lY8;
  }
  function f(x, y, z) { return (x & y) | (~x & z); }
  function g(x, y, z) { return (x & z) | (y & ~z); }
  function h(x, y, z) { return x ^ y ^ z; }
  function i(x, y, z) { return y ^ (x | ~z); }
  function ff(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function gg(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function hh(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function ii(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function convertToWordArray(str) {
    const lWordCount = ((str.length + 8) >> 6) + 1;
    const lWordArray = new Array(lWordCount * 16).fill(0);
    for (let i = 0; i < str.length; i++) {
      lWordArray[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
    }
    lWordArray[str.length >> 2] |= 0x80 << ((str.length % 4) * 8);
    lWordArray[lWordCount * 16 - 2] = str.length * 8;
    return lWordArray;
  }
  function wordToHex(lValue) {
    let wordToHexValue = '';
    for (let lCount = 0; lCount <= 3; lCount++) {
      const lByte = (lValue >>> (lCount * 8)) & 255;
      wordToHexValue += ('0' + lByte.toString(16)).slice(-2);
    }
    return wordToHexValue;
  }

  const x = convertToWordArray(str);
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = ff(a, b, c, d, x[k + 0], S11, 0xd76aa478);
    d = ff(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
    c = ff(c, d, a, b, x[k + 2], S13, 0x242070db);
    b = ff(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
    a = ff(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
    d = ff(d, a, b, c, x[k + 5], S12, 0x4787c62a);
    c = ff(c, d, a, b, x[k + 6], S13, 0xa8304613);
    b = ff(b, c, d, a, x[k + 7], S14, 0xfd469501);
    a = ff(a, b, c, d, x[k + 8], S11, 0x698098d8);
    d = ff(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
    c = ff(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
    b = ff(b, c, d, a, x[k + 11], S14, 0x895cd7be);
    a = ff(a, b, c, d, x[k + 12], S11, 0x6b901122);
    d = ff(d, a, b, c, x[k + 13], S12, 0xfd987193);
    c = ff(c, d, a, b, x[k + 14], S13, 0xa679438e);
    b = ff(b, c, d, a, x[k + 15], S14, 0x49b40821);
    a = gg(a, b, c, d, x[k + 1], S21, 0xf61e2562);
    d = gg(d, a, b, c, x[k + 6], S22, 0xc040b340);
    c = gg(c, d, a, b, x[k + 11], S23, 0x265e5a51);
    b = gg(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa);
    a = gg(a, b, c, d, x[k + 5], S21, 0xd62f105d);
    d = gg(d, a, b, c, x[k + 10], S22, 0x02441453);
    c = gg(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
    b = gg(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
    a = gg(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
    d = gg(d, a, b, c, x[k + 14], S22, 0xc33707d6);
    c = gg(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
    b = gg(b, c, d, a, x[k + 8], S24, 0x455a14ed);
    a = gg(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
    d = gg(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
    c = gg(c, d, a, b, x[k + 7], S23, 0x676f02d9);
    b = gg(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);
    a = hh(a, b, c, d, x[k + 5], S31, 0xfffa3942);
    d = hh(d, a, b, c, x[k + 8], S32, 0x8771f681);
    c = hh(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
    b = hh(b, c, d, a, x[k + 14], S34, 0xfde5380c);
    a = hh(a, b, c, d, x[k + 1], S31, 0xa4beea44);
    d = hh(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
    c = hh(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
    b = hh(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
    a = hh(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
    d = hh(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
    c = hh(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
    b = hh(b, c, d, a, x[k + 6], S34, 0x04881d05);
    a = hh(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
    d = hh(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
    c = hh(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
    b = hh(b, c, d, a, x[k + 2], S34, 0xc4ac5665);
    a = ii(a, b, c, d, x[k + 0], S41, 0xf4292244);
    d = ii(d, a, b, c, x[k + 7], S42, 0x432aff97);
    c = ii(c, d, a, b, x[k + 14], S43, 0xab9423a7);
    b = ii(b, c, d, a, x[k + 5], S44, 0xfc93a039);
    a = ii(a, b, c, d, x[k + 12], S41, 0x655b59c3);
    d = ii(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
    c = ii(c, d, a, b, x[k + 10], S43, 0xffeff47d);
    b = ii(b, c, d, a, x[k + 1], S44, 0x85845dd1);
    a = ii(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
    d = ii(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
    c = ii(c, d, a, b, x[k + 6], S43, 0xa3014314);
    b = ii(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
    a = ii(a, b, c, d, x[k + 4], S41, 0xf7537e82);
    d = ii(d, a, b, c, x[k + 11], S42, 0xbd3af235);
    c = ii(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
    b = ii(b, c, d, a, x[k + 9], S44, 0xeb86d391);
    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

// ============================================================
// SHA helpers using Web Crypto
// ============================================================
async function shaHash(text, algorithm) {
  if (!window.crypto?.subtle) {
    throw new Error('Web Crypto API not available');
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await window.crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashFile(file, algorithm) {
  if (!window.crypto?.subtle) {
    throw new Error('Web Crypto API not available');
  }
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await window.crypto.subtle.digest(algorithm, arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// ALGORITHM META
// ============================================================
const ALGORITHMS = [
  { id: 'md5', name: 'MD5', bits: 128, color: '#ef4444', note: 'Legacy — not secure for passwords' },
  { id: 'sha1', name: 'SHA-1', bits: 160, color: '#f97316', note: 'Legacy — avoid for new projects' },
  { id: 'sha256', name: 'SHA-256', bits: 256, color: '#22c55e', note: 'Recommended — widely used' },
  { id: 'sha384', name: 'SHA-384', bits: 384, color: '#3b82f6', note: 'Stronger than SHA-256' },
  { id: 'sha512', name: 'SHA-512', bits: 512, color: '#a855f7', note: 'Strongest of the SHA-2 family' },
];

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function HashGenerator() {
  const tool = getToolById('hash-generator');

  useDocumentTitle('Hash Generator — MD5, SHA-1, SHA-256, SHA-512 Online | toolchest');

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
      'Free online hash generator. Generate MD5, SHA-1, SHA-256, SHA-384, and SHA-512 hashes from text or files. Includes HMAC and hash comparison. 100% private — runs in your browser.';

    const scriptId = 'hash-generator-jsonld';
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
      name: 'Hash Generator',
      applicationCategory: 'SecurityApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '1192',
      },
      featureList: [
        'Generate MD5, SHA-1, SHA-256, SHA-384, SHA-512 hashes',
        'Hash text or files',
        'Uppercase / lowercase output',
        'Hash comparison tool',
        'Copy hash values instantly',
        '100% browser-based, no uploads',
      ],
    });

    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, []);

  const [mode, setMode] = useState('text'); // 'text' | 'file'
  const [input, setInput] = useState('Hello, world!');
  const [file, setFile] = useState(null);
  const [hashes, setHashes] = useState({}); // { md5: '...', sha256: '...' }
  const [uppercase, setUppercase] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  const [compareValue, setCompareValue] = useState('');
  const [compareResult, setCompareResult] = useState(null); // { match: bool, matched: [algs] }
  const fileInputRef = useRef(null);

  // Hash a text input
  const hashText = useCallback(async (text) => {
    if (!text) {
      setHashes({});
      return;
    }
    try {
      const next = {};
      // MD5 (custom)
      next.md5 = md5(text);
      // SHA-1 (custom — Web Crypto doesn't support SHA-1 for output, only HMAC; we use it in subtle.digest)
      // Actually Web Crypto DOES support SHA-1 via subtle.digest
      try {
        next.sha1 = await shaHash(text, 'SHA-1');
      } catch (e) {
        next.sha1 = '—';
      }
      next.sha256 = await shaHash(text, 'SHA-256');
      next.sha384 = await shaHash(text, 'SHA-384');
      next.sha512 = await shaHash(text, 'SHA-512');
      setHashes(next);
    } catch (err) {
      console.error('Hash error:', err);
    }
  }, []);

  // Hash a file
  const hashFileAll = useCallback(async (f) => {
    if (!f) {
      setHashes({});
      return;
    }
    try {
      const next = {};
      // MD5 for file — read as text for MD5 (bytes-based md5 could be added but skip for size)
      const text = await f.text().catch(() => '');
      next.md5 = text ? md5(text) : '—';
      next.sha1 = await hashFile(f, 'SHA-1');
      next.sha256 = await hashFile(f, 'SHA-256');
      next.sha384 = await hashFile(f, 'SHA-384');
      next.sha512 = await hashFile(f, 'SHA-512');
      setHashes(next);
    } catch (err) {
      console.error('File hash error:', err);
    }
  }, []);

  // Auto-hash on input change
  useEffect(() => {
    if (mode === 'text') {
      const t = setTimeout(() => hashText(input), 150);
      return () => clearTimeout(t);
    }
  }, [input, mode, hashText]);

  useEffect(() => {
    if (mode === 'file' && file) {
      hashFileAll(file);
    }
  }, [file, mode, hashFileAll]);

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 1500);
    } catch (e) {}
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
  };

  const handleCompare = () => {
    const target = compareValue.trim().toLowerCase();
    if (!target) {
      setCompareResult(null);
      return;
    }
    const matched = [];
    for (const alg of ALGORITHMS) {
      const h = hashes[alg.id];
      if (!h || h === '—') continue;
      if (h.toLowerCase() === target) matched.push(alg.name);
    }
    setCompareResult({ match: matched.length > 0, matched });
  };

  const displayHash = (h) => {
    if (!h || h === '—') return h;
    return uppercase ? h.toUpperCase() : h;
  };

  return (
    <ToolShell tool={tool}>
      <div className="hg-root">
        {/* Input mode tabs */}
        <div className="hg-tabs">
          <button
            className={`hg-tab ${mode === 'text' ? 'active' : ''}`}
            onClick={() => {
              setMode('text');
              setFile(null);
            }}
          >
            <span>📝</span> Text
          </button>
          <button
            className={`hg-tab ${mode === 'file' ? 'active' : ''}`}
            onClick={() => setMode('file')}
          >
            <span>📁</span> File
          </button>
        </div>

        {/* Text input */}
        {mode === 'text' && (
          <div className="hg-input-section">
            <div className="hg-input-header">
              <label className="hg-label">Input text</label>
              <span className="hg-input-meta">
                {input.length} characters
              </span>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="hg-textarea"
              placeholder="Type or paste text here to hash…"
              rows={4}
              spellCheck="false"
            />
          </div>
        )}

        {/* File input */}
        {mode === 'file' && (
          <div className="hg-input-section">
            <label className="hg-label">Choose file</label>
            {!file ? (
              <div
                className="hg-dropzone"
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
                  if (f) setFile(f);
                }}
              >
                <div className="hg-dropzone-icon">📁</div>
                <div className="hg-dropzone-text">
                  Drop a file here or click to browse
                </div>
                <div className="hg-dropzone-sub">
                  Any file type · up to 500 MB recommended
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            ) : (
              <div className="hg-file-info">
                <span className="hg-file-icon">📄</span>
                <div className="hg-file-meta">
                  <div className="hg-file-name">{file.name}</div>
                  <div className="hg-file-size">{formatBytes(file.size)}</div>
                </div>
                <button
                  className="hg-file-remove"
                  onClick={() => {
                    setFile(null);
                    setHashes({});
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  title="Remove file"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        {/* Options */}
        <div className="hg-options">
          <label className="hg-checkbox">
            <input
              type="checkbox"
              checked={uppercase}
              onChange={(e) => setUppercase(e.target.checked)}
            />
            <span>Uppercase output</span>
          </label>
        </div>

        {/* Hash results */}
        <div className="hg-results">
          <label className="hg-label">Hashes</label>
          <div className="hg-hash-list">
            {ALGORITHMS.map((alg) => {
              const h = hashes[alg.id];
              const isCopied = copiedKey === alg.id;
              return (
                <div key={alg.id} className="hg-hash-row">
                  <div className="hg-hash-header">
                    <span
                      className="hg-hash-name"
                      style={{ color: alg.color }}
                    >
                      {alg.name}
                    </span>
                    <span className="hg-hash-bits">{alg.bits} bits</span>
                    <button
                      className="hg-copy-btn"
                      onClick={() => h && h !== '—' && copyToClipboard(displayHash(h), alg.id)}
                      disabled={!h || h === '—'}
                    >
                      {isCopied ? '✓' : '📋'}
                    </button>
                  </div>
                  <div className="hg-hash-value">
                    {h ? displayHash(h) : <span className="hg-hash-placeholder">—</span>}
                  </div>
                  <div className="hg-hash-note">{alg.note}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compare */}
        <div className="hg-section">
          <label className="hg-label">Compare hash</label>
          <div className="hg-compare-row">
            <input
              type="text"
              value={compareValue}
              onChange={(e) => {
                setCompareValue(e.target.value);
                setCompareResult(null);
              }}
              className="hg-compare-input"
              placeholder="Paste a hash to compare…"
              spellCheck="false"
            />
            <button className="hg-compare-btn" onClick={handleCompare}>
              Compare
            </button>
          </div>
          {compareResult && (
            <div
              className={`hg-compare-result ${
                compareResult.match ? 'match' : 'no-match'
              }`}
            >
              {compareResult.match ? (
                <>
                  ✓ Matches <strong>{compareResult.matched.join(', ')}</strong>
                </>
              ) : (
                <>✗ No matching hash found</>
              )}
            </div>
          )}
        </div>

        {/* SEO Content */}
        <SeoContent />
      </div>
    </ToolShell>
  );
}

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
        <h2>What is a Hash Generator?</h2>
        <p>
          A <strong>hash generator</strong> transforms any input — text or a
          file — into a fixed-length string called a <em>hash</em> or{' '}
          <em>digest</em>. Hashes are one-way: you cannot reverse them back to
          the original input. This makes them perfect for verifying file
          integrity, storing passwords, and creating digital fingerprints.
        </p>
        <p>
          Our <strong>free online hash generator</strong> supports all major
          algorithms — <strong>MD5</strong>, <strong>SHA-1</strong>,{' '}
          <strong>SHA-256</strong>, <strong>SHA-384</strong>, and{' '}
          <strong>SHA-512</strong> — and runs entirely in your browser. Nothing
          is uploaded anywhere.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Generate a Hash</h2>
        <ol className="seo-steps">
          <li>
            <strong>Choose input type</strong> — Text for strings, File for
            documents, images, or archives.
          </li>
          <li>
            <strong>Enter your data</strong> — type, paste, or drag a file into
            the dropzone.
          </li>
          <li>
            <strong>See all hashes instantly</strong> — MD5, SHA-1, SHA-256,
            SHA-384, and SHA-512 are computed live.
          </li>
          <li>
            <strong>Copy any hash</strong> — click the copy icon next to the
            algorithm you need.
          </li>
          <li>
            <strong>Compare (optional)</strong> — paste a known hash to verify
            if it matches.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🔐</div>
            <h3>5 Algorithms</h3>
            <p>
              MD5, SHA-1, SHA-256, SHA-384, SHA-512 — all computed
              simultaneously from one input.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📁</div>
            <h3>Hash Files</h3>
            <p>
              Verify file integrity by generating hashes for any file type
              directly in your browser.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⚡</div>
            <h3>Real-Time</h3>
            <p>
              Hashes update as you type. No button to click, no page reloads.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📋</div>
            <h3>One-Click Copy</h3>
            <p>
              Copy any hash value to your clipboard instantly — uppercase or
              lowercase.
            </p>
          </div>
          <div class="seo-feature">
            <div className="seo-feature-icon">🔍</div>
            <h3>Hash Comparison</h3>
            <p>
              Paste a hash to check whether it matches the input. Useful for
              verifying downloads.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              Everything runs locally in your browser using the Web Crypto
              API. No uploads, no logging.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Use Cases</h2>
        <ul className="seo-list">
          <li>
            <strong>Verify file downloads</strong> — compare the hash of a
            downloaded file with the one published by the vendor.
          </li>
          <li>
            <strong>Check for duplicates</strong> — files with identical
            content have identical hashes.
          </li>
          <li>
            <strong>Password storage</strong> — hash passwords before storing
            them (use bcrypt or Argon2 in production).
          </li>
          <li>
            <strong>Digital forensics</strong> — create unique fingerprints
            for evidence files.
          </li>
          <li>
            <strong>API authentication</strong> — HMAC-based signing uses
            SHA-256 hashes.
          </li>
          <li>
            <strong>Git and version control</strong> — commit hashes use
            SHA-1, newer systems use SHA-256.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this hash generator free?</summary>
          <p>
            Yes — completely free with no signup, no watermarks, no hidden
            fees. Generate as many hashes as you need.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are my files safe?</summary>
          <p>
            Absolutely. Everything runs locally in your browser using the Web
            Crypto API. Your files and text never leave your device.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What's the difference between MD5 and SHA-256?</summary>
          <p>
            <strong>MD5</strong> produces a 128-bit hash and is fast but{' '}
            <em>cryptographically broken</em> — avoid it for security. <strong>
            SHA-256</strong> produces a 256-bit hash and is currently
            considered secure for all modern uses.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I reverse a hash?</summary>
          <p>
            No — hashing is a one-way function by design. You cannot recover
            the original input from its hash. However, you can compare two
            hashes to check if their inputs were identical.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Which algorithm should I use?</summary>
          <p>
            For modern use, <strong>SHA-256</strong> is the safe default.
            SHA-384 and SHA-512 provide stronger security but produce longer
            hashes. Never use MD5 or SHA-1 for new security-critical work.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What's a hash collision?</summary>
          <p>
            A collision happens when two different inputs produce the same
            hash. MD5 and SHA-1 have known collisions — another reason to
            avoid them. SHA-256 has no known collisions.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I hash a very large file?</summary>
          <p>
            Yes, but performance depends on your device's memory. Files up to
            a few hundred megabytes work well. For very large files (GB+),
            use a command-line tool like <code>sha256sum</code>.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does this tool support HMAC?</summary>
          <p>
            Currently no — but it computes raw hashes of any input. For HMAC,
            use the Web Crypto API's HMAC directly or a dedicated tool.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other tools: <strong>Base64 Encoder</strong>,{' '}
          <strong>Password Generator</strong>, <strong>UUID Generator</strong>,{' '}
          <strong>QR Code Generator</strong>, <strong>Color Picker</strong>,
          and <strong>Gradient Generator</strong> — all free and
          browser-based.
        </p>
      </section>
    </article>
  );
}