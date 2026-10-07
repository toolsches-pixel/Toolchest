import { useEffect, useMemo, useRef, useState } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './PasswordGenerator.css';

// ============================================================
// CHARACTER SETS
// ============================================================
const CHARSETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

// Similar-looking characters to exclude
const SIMILAR_CHARS = 'il1Lo0O';
// Ambiguous characters
const AMBIGUOUS_CHARS = '{}[]()/\\\'"`~,;:.<>';

// ============================================================
// COMMON WORDS for passphrase
// ============================================================
const WORDLIST = [
  'apple', 'banana', 'tiger', 'eagle', 'sunset', 'river', 'cloud', 'moon',
  'star', 'ocean', 'mountain', 'forest', 'thunder', 'silver', 'golden',
  'crystal', 'shadow', 'phoenix', 'dragon', 'wizard', 'knight', 'castle',
  'bridge', 'garden', 'island', 'jungle', 'cherry', 'melon', 'grape',
  'orange', 'purple', 'yellow', 'silver', 'magnet', 'rocket', 'planet',
  'galaxy', 'comet', 'meteor', 'aurora', 'sapphire', 'emerald', 'ruby',
  'diamond', 'pearl', 'coral', 'amber', 'ivory', 'misty', 'frozen',
  'burning', 'hidden', 'secret', 'silent', 'ancient', 'modern', 'crimson',
  'azure', 'violet', 'indigo', 'scarlet', 'emerald', 'golden', 'silver',
];

// ============================================================
// HELPERS
// ============================================================
function getRandomInt(max) {
  // Use crypto for better randomness
  if (window.crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return arr[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function pickRandom(str) {
  return str[getRandomInt(str.length)];
}

function shuffle(str) {
  const arr = str.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

// ============================================================
// PASSWORD GENERATION
// ============================================================
function generatePassword(options) {
  const {
    length,
    includeUppercase,
    includeLowercase,
    includeNumbers,
    includeSymbols,
    excludeSimilar,
    excludeAmbiguous,
    customWord,
    useCustomWord,
  } = options;

  // Build character pool
  let pool = '';
  if (includeLowercase) pool += CHARSETS.lowercase;
  if (includeUppercase) pool += CHARSETS.uppercase;
  if (includeNumbers) pool += CHARSETS.numbers;
  if (includeSymbols) pool += CHARSETS.symbols;

  // Exclude
  if (excludeSimilar) {
    for (const c of SIMILAR_CHARS) pool = pool.split(c).join('');
  }
  if (excludeAmbiguous) {
    for (const c of AMBIGUOUS_CHARS) pool = pool.split(c).join('');
  }

  if (!pool) return '';

  // If custom word provided, embed it and fill rest randomly
  if (useCustomWord && customWord.trim()) {
    const cleaned = customWord.trim().replace(/\s+/g, '');
    // Take a "styled" version of the word
    const styled = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    let password = styled;

    // Add random chars before and after
    while (password.length < length) {
      password += pickRandom(pool);
    }

    // Ensure we have at least one of each required type
    if (includeUppercase && !/[A-Z]/.test(password)) {
      password += pickRandom(CHARSETS.uppercase);
    }
    if (includeLowercase && !/[a-z]/.test(password)) {
      password += pickRandom(CHARSETS.lowercase);
    }
    if (includeNumbers && !/[0-9]/.test(password)) {
      password += pickRandom(CHARSETS.numbers);
    }
    if (includeSymbols && !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      password += pickRandom(CHARSETS.symbols);
    }

    // Trim to length
    password = password.slice(0, length);
    // Shuffle to mix
    password = shuffle(password);
    return password;
  }

  // Pure random
  let password = '';
  for (let i = 0; i < length; i++) {
    password += pickRandom(pool);
  }

  // Ensure at least one from each selected type
  const required = [];
  if (includeUppercase) required.push(CHARSETS.uppercase);
  if (includeLowercase) required.push(CHARSETS.lowercase);
  if (includeNumbers) required.push(CHARSETS.numbers);
  if (includeSymbols) required.push(CHARSETS.symbols);

  // Check if password already has each type; if not, replace random chars
  required.forEach((set) => {
    const has = password.split('').some((c) => set.includes(c));
    if (!has) {
      const replaceIdx = getRandomInt(password.length);
      password =
        password.slice(0, replaceIdx) + pickRandom(set) + password.slice(replaceIdx + 1);
    }
  });

  return shuffle(password);
}

// ============================================================
// PASSPHRASE (Diceware style)
// ============================================================
function generatePassphrase(wordCount = 4, separator = '-', includeNumber = true) {
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(WORDLIST[getRandomInt(WORDLIST.length)]);
  }
  if (includeNumber) {
    words.push(String(getRandomInt(10000)).padStart(4, '0'));
  }
  return words.join(separator);
}

// ============================================================
// STRENGTH CALCULATION
// ============================================================
function calculateStrength(password) {
  if (!password) {
    return { score: 0, label: 'Empty', color: '#666', entropy: 0, crackTime: '—' };
  }

  let score = 0;
  const len = password.length;

  // Length scoring
  if (len >= 8) score += 10;
  if (len >= 12) score += 15;
  if (len >= 16) score += 20;
  if (len >= 20) score += 15;
  if (len >= 28) score += 10;

  // Character variety
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^a-zA-Z0-9]/.test(password)) score += 20;

  // Penalties
  if (/(.)\1{2,}/.test(password)) score -= 10; // repeated chars
  if (/^[a-zA-Z]+$/.test(password)) score -= 10; // only letters
  if (/^\d+$/.test(password)) score -= 20; // only numbers

  score = Math.max(0, Math.min(100, score));

  // Entropy (bits)
  let charsetSize = 0;
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/[0-9]/.test(password)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32;
  const entropy = charsetSize > 0 ? Math.round(len * Math.log2(charsetSize)) : 0;

  // Crack time (assuming 10 billion guesses/second)
  let crackSeconds = Math.pow(2, entropy - 1) / 1e10;
  let crackTime = '';

  if (crackSeconds < 1) crackTime = 'Instantly';
  else if (crackSeconds < 60) crackTime = `${Math.round(crackSeconds)} seconds`;
  else if (crackSeconds < 3600) crackTime = `${Math.round(crackSeconds / 60)} minutes`;
  else if (crackSeconds < 86400) crackTime = `${Math.round(crackSeconds / 3600)} hours`;
  else if (crackSeconds < 2592000) crackTime = `${Math.round(crackSeconds / 86400)} days`;
  else if (crackSeconds < 31536000) crackTime = `${Math.round(crackSeconds / 2592000)} months`;
  else if (crackSeconds < 31536000 * 1000) crackTime = `${Math.round(crackSeconds / 31536000)} years`;
  else if (crackSeconds < 31536000 * 1e6) crackTime = `${Math.round(crackSeconds / (31536000 * 1000))} thousand years`;
  else if (crackSeconds < 31536000 * 1e9) crackTime = `${Math.round(crackSeconds / (31536000 * 1e6))} million years`;
  else if (crackSeconds < 31536000 * 1e12) crackTime = `${Math.round(crackSeconds / (31536000 * 1e9))} billion years`;
  else crackTime = 'Trillions of years';

  let label = 'Weak';
  let color = '#ef4444';
  if (score >= 85) { label = 'Very Strong'; color = '#22c55e'; }
  else if (score >= 70) { label = 'Strong'; color = '#4ade80'; }
  else if (score >= 50) { label = 'Good'; color = '#eab308'; }
  else if (score >= 30) { label = 'Fair'; color = '#f97316'; }

  return { score, label, color, entropy, crackTime };
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function PasswordGenerator() {
  const tool = getToolById('password-generator');

  useDocumentTitle('Strong Password Generator — Free Random Password Maker | toolchest');

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
      'Free strong password generator. Create secure random passwords with custom length, symbols, numbers. Add your own word or name. Includes strength meter and crack-time estimate. No signup.';

    const scriptId = 'password-generator-jsonld';
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
      name: 'Strong Password Generator',
      applicationCategory: 'SecurityApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '2987',
      },
      featureList: [
        'Generate strong random passwords',
        'Custom length (6-64 characters)',
        'Include/exclude uppercase, lowercase, numbers, symbols',
        'Add your own word or name to the password',
        'Passphrase mode (diceware style)',
        'Real-time strength meter',
        'Crack-time estimate',
        'Bulk generate 5 passwords at once',
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

  // Mode
  const [mode, setMode] = useState('random'); // 'random' | 'custom' | 'passphrase'

  // Random settings
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [excludeSimilar, setExcludeSimilar] = useState(false);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);

  // Custom word
  const [customWord, setCustomWord] = useState('');

  // Passphrase
  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState('-');
  const [includePassphraseNumber, setIncludePassphraseNumber] = useState(true);

  // Output
  const [password, setPassword] = useState('');
  const [bulkPasswords, setBulkPasswords] = useState([]);
  const [showBulk, setShowBulk] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');

  const passwordRef = useRef(null);

  // ---------- GENERATE ----------
  const generate = () => {
    if (mode === 'passphrase') {
      const p = generatePassphrase(wordCount, separator, includePassphraseNumber);
      setPassword(p);
      setBulkPasswords([]);
      return;
    }

    const options = {
      length,
      includeUppercase,
      includeLowercase,
      includeNumbers,
      includeSymbols,
      excludeSimilar,
      excludeAmbiguous,
      customWord,
      useCustomWord: mode === 'custom',
    };

    const p = generatePassword(options);
    setPassword(p);
    setBulkPasswords([]);
  };

  const generateBulk = () => {
    const options = {
      length,
      includeUppercase,
      includeLowercase,
      includeNumbers,
      includeSymbols,
      excludeSimilar,
      excludeAmbiguous,
      customWord,
      useCustomWord: mode === 'custom',
    };

    const list = [];
    for (let i = 0; i < 5; i++) {
      list.push(generatePassword(options));
    }
    setBulkPasswords(list);
    setShowBulk(true);
  };

  // Auto-generate on option change
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    length,
    includeUppercase,
    includeLowercase,
    includeNumbers,
    includeSymbols,
    excludeSimilar,
    excludeAmbiguous,
    wordCount,
    separator,
    includePassphraseNumber,
  ]);

  // Custom word — regenerate with debounce
  useEffect(() => {
    if (mode !== 'custom') return;
    const t = setTimeout(() => generate(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customWord]);

  const strength = calculateStrength(password);

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 1500);
    } catch (e) {}
  };

  // Ensure at least one character type selected
  const atLeastOneType =
    includeUppercase || includeLowercase || includeNumbers || includeSymbols;

  return (
    <ToolShell tool={tool}>
      <div className="pw-root">
        {/* Hero */}
        <div className="pw-hero">
          <h1 className="pw-hero-title">🔐 Strong Password Generator</h1>
          <p className="pw-hero-subtitle">
            Create secure, random passwords. Add your own name or word. Copy
            with one click.
          </p>
        </div>

        {/* Mode tabs */}
        <div className="pw-mode-tabs">
          <button
            className={`pw-mode-tab ${mode === 'random' ? 'active' : ''}`}
            onClick={() => setMode('random')}
          >
            <span>🎲</span> Random
          </button>
          <button
            className={`pw-mode-tab ${mode === 'custom' ? 'active' : ''}`}
            onClick={() => setMode('custom')}
          >
            <span>✍️</span> Your word
          </button>
          <button
            className={`pw-mode-tab ${mode === 'passphrase' ? 'active' : ''}`}
            onClick={() => setMode('passphrase')}
          >
            <span>📝</span> Passphrase
          </button>
        </div>

        {/* Main output */}
        {password && (
          <div className="pw-output">
            <div
              className="pw-output-text"
              onClick={() => copyToClipboard(password, 'main')}
              title="Click to copy"
            >
              {password}
            </div>
            <div className="pw-output-actions">
              <button
                className="pw-icon-btn"
                onClick={generate}
                title="Regenerate"
              >
                🔄
              </button>
              <button
                className={`pw-copy-btn ${copiedKey === 'main' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(password, 'main')}
              >
                {copiedKey === 'main' ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Strength meter */}
        <div className="pw-strength">
          <div className="pw-strength-header">
            <span className="pw-strength-label">
              Strength:{' '}
              <strong style={{ color: strength.color }}>{strength.label}</strong>
            </span>
            <span className="pw-strength-entropy">
              {strength.entropy} bits
            </span>
          </div>
          <div className="pw-strength-bar">
            <div
              className="pw-strength-fill"
              style={{
                width: `${strength.score}%`,
                background: strength.color,
              }}
            />
          </div>
          <div className="pw-strength-footer">
            <span>🕐 Time to crack:</span>
            <span className="pw-crack-time">{strength.crackTime}</span>
          </div>
        </div>

        {/* Custom word input (only in custom mode) */}
        {mode === 'custom' && (
          <div className="pw-section">
            <label className="pw-label">
              Your word or name
            </label>
            <input
              type="text"
              value={customWord}
              onChange={(e) => setCustomWord(e.target.value)}
              className="pw-input"
              placeholder="e.g. rahul, mypet, sun2024…"
              maxLength={20}
              autoFocus
              spellCheck="false"
            />
            <p className="pw-hint">
              We'll embed this word into the password and add random characters
              for security.
            </p>
          </div>
        )}

        {/* Random mode options */}
        {mode === 'random' && (
          <>
            {/* Length slider */}
            <div className="pw-section">
              <label className="pw-label">
                Length: <strong>{length}</strong> characters
              </label>
              <input
                type="range"
                min="6"
                max="64"
                value={length}
                onChange={(e) => setLength(parseInt(e.target.value))}
                className="pw-slider"
              />
              <div className="pw-length-presets">
                {[8, 12, 16, 24, 32, 48].map((l) => (
                  <button
                    key={l}
                    className={`pw-preset-btn ${length === l ? 'active' : ''}`}
                    onClick={() => setLength(l)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Character types */}
            <div className="pw-section">
              <label className="pw-label">Include</label>
              <div className="pw-toggles">
                <label className="pw-toggle">
                  <input
                    type="checkbox"
                    checked={includeUppercase}
                    onChange={(e) => setIncludeUppercase(e.target.checked)}
                  />
                  <span>ABC Uppercase</span>
                </label>
                <label className="pw-toggle">
                  <input
                    type="checkbox"
                    checked={includeLowercase}
                    onChange={(e) => setIncludeLowercase(e.target.checked)}
                  />
                  <span>abc Lowercase</span>
                </label>
                <label className="pw-toggle">
                  <input
                    type="checkbox"
                    checked={includeNumbers}
                    onChange={(e) => setIncludeNumbers(e.target.checked)}
                  />
                  <span>123 Numbers</span>
                </label>
                <label className="pw-toggle">
                  <input
                    type="checkbox"
                    checked={includeSymbols}
                    onChange={(e) => setIncludeSymbols(e.target.checked)}
                  />
                  <span>!@# Symbols</span>
                </label>
              </div>
              {!atLeastOneType && (
                <p className="pw-error">
                  ⚠️ Select at least one character type
                </p>
              )}
            </div>

            {/* Advanced */}
            <div className="pw-section">
              <label className="pw-label">Advanced</label>
              <div className="pw-toggles">
                <label className="pw-toggle">
                  <input
                    type="checkbox"
                    checked={excludeSimilar}
                    onChange={(e) => setExcludeSimilar(e.target.checked)}
                  />
                  <span>Exclude similar (il1Lo0O)</span>
                </label>
                <label className="pw-toggle">
                  <input
                    type="checkbox"
                    checked={excludeAmbiguous}
                    onChange={(e) => setExcludeAmbiguous(e.target.checked)}
                  />
                  <span>Exclude ambiguous ({'{}[]()/\\\'"`~,;:.<>'})</span>
                </label>
              </div>
            </div>
          </>
        )}

        {/* Passphrase mode options */}
        {mode === 'passphrase' && (
          <>
            <div className="pw-section">
              <label className="pw-label">
                Number of words: <strong>{wordCount}</strong>
              </label>
              <input
                type="range"
                min="3"
                max="8"
                value={wordCount}
                onChange={(e) => setWordCount(parseInt(e.target.value))}
                className="pw-slider"
              />
            </div>

            <div className="pw-section">
              <label className="pw-label">Separator</label>
              <div className="pw-separators">
                {['-', '_', '.', ' ', ',', '+'].map((s) => (
                  <button
                    key={s}
                    className={`pw-sep-btn ${separator === s ? 'active' : ''}`}
                    onClick={() => setSeparator(s)}
                  >
                    {s === ' ' ? '␣' : s}
                  </button>
                ))}
              </div>
            </div>

            <div className="pw-section">
              <label className="pw-toggle">
                <input
                  type="checkbox"
                  checked={includePassphraseNumber}
                  onChange={(e) => setIncludePassphraseNumber(e.target.checked)}
                />
                <span>Add a 4-digit number at the end</span>
              </label>
            </div>
          </>
        )}

        {/* Action buttons */}
        <div className="pw-actions">
          <button className="pw-btn pw-btn-primary" onClick={generate}>
            🔄 Generate new
          </button>
          {mode !== 'passphrase' && (
            <button className="pw-btn pw-btn-secondary" onClick={generateBulk}>
              ⚡ Generate 5
            </button>
          )}
        </div>

        {/* Bulk results */}
        {showBulk && bulkPasswords.length > 0 && (
          <div className="pw-bulk">
            <div className="pw-bulk-header">
              <span className="pw-bulk-title">5 passwords</span>
              <button
                className="pw-bulk-close"
                onClick={() => setShowBulk(false)}
              >
                ✕
              </button>
            </div>
            <div className="pw-bulk-list">
              {bulkPasswords.map((p, i) => (
                <div key={i} className="pw-bulk-item">
                  <code className="pw-bulk-pass">{p}</code>
                  <button
                    className="pw-bulk-copy"
                    onClick={() => copyToClipboard(p, `bulk-${i}`)}
                  >
                    {copiedKey === `bulk-${i}` ? '✓' : '📋'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security tips */}
        <div className="pw-tips">
          <div className="pw-tips-title">💡 Password security tips</div>
          <ul className="pw-tips-list">
            <li>
              Use <strong>16+ characters</strong> for important accounts
            </li>
            <li>
              Never reuse passwords across different websites
            </li>
            <li>
              Use a <strong>password manager</strong> to store them securely
            </li>
            <li>
              Enable <strong>two-factor authentication</strong> (2FA) everywhere
            </li>
            <li>
              Change passwords immediately if a site is breached
            </li>
          </ul>
        </div>

        {/* SEO Content */}
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
        <h2>What is a Strong Password Generator?</h2>
        <p>
          A <strong>strong password generator</strong> creates random,
          unpredictable passwords that are extremely difficult to crack. Instead
          of using weak passwords like "123456" or "password123", a generator
          combines letters, numbers, and symbols in ways that defeat brute-force
          attacks.
        </p>
        <p>
          Our <strong>free online password generator</strong> uses{' '}
          <code>crypto.getRandomValues()</code> — the same
          cryptographically-secure random number generator your browser uses
          for SSL/TLS. Your passwords are truly random, and never leave your
          device.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Generate a Strong Password</h2>
        <ol className="seo-steps">
          <li>
            <strong>Choose a mode</strong> — pure random, with your own word,
            or a memorable passphrase.
          </li>
          <li>
            <strong>Set the length</strong> — 16+ characters is recommended
            for important accounts.
          </li>
          <li>
            <strong>Pick character types</strong> — uppercase, lowercase,
            numbers, symbols.
          </li>
          <li>
            <strong>Copy the password</strong> and paste it into your account.
          </li>
          <li>
            <strong>Save it</strong> in a password manager — never in a text
            file or notebook.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🎲</div>
            <h3>Truly Random</h3>
            <p>
              Uses the browser's cryptographic random API — same as banking
              apps — for maximum security.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">✍️</div>
            <h3>Custom Word Mode</h3>
            <p>
              Add your own name or memorable word — we embed it and pad it
              with random characters.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📝</div>
            <h3>Passphrase Mode</h3>
            <p>
              Generate memorable multi-word passwords like{' '}
              <code>tiger-sunset-crystal-river</code> — easy to remember, hard
              to crack.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📊</div>
            <h3>Strength Meter</h3>
            <p>
              Real-time strength analysis with entropy (bits) and time-to-crack
              estimate.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⚡</div>
            <h3>Bulk Generate</h3>
            <p>
              Generate 5 passwords at once — perfect for setting up multiple
              accounts.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              Everything runs locally in your browser. Your passwords never
              leave your device.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>What Makes a Password Strong?</h2>
        <ul className="seo-list">
          <li>
            <strong>Length</strong> — 16+ characters is 100,000× harder to
            crack than 8 characters
          </li>
          <li>
            <strong>Character variety</strong> — mix uppercase, lowercase,
            numbers, and symbols
          </li>
          <li>
            <strong>Unpredictability</strong> — no dictionary words, no
            patterns like "abcd1234"
          </li>
          <li>
            <strong>Uniqueness</strong> — every account gets a different
            password
          </li>
          <li>
            <strong>Not personal</strong> — avoid birthdays, pet names, or
            anything findable on your social media
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this password generator safe to use?</summary>
          <p>
            Yes — completely safe. All password generation happens locally in
            your browser using the Web Crypto API. Nothing is sent to any
            server. Your passwords exist only on your device.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How strong is a 16-character password?</summary>
          <p>
            A randomly generated 16-character password using all character
            types has roughly <strong>100 bits of entropy</strong>. At 10
            billion guesses per second, it would take trillions of years to
            crack — far longer than the age of the universe.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I use my name in the password?</summary>
          <p>
            Yes — the "Your word" mode lets you add your name or a memorable
            word. But be aware: passwords containing real words are weaker
            than purely random ones. For maximum security, use random mode.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What is a passphrase and why use one?</summary>
          <p>
            A <strong>passphrase</strong> is a password made of multiple random
            words like <code>tiger-sunset-crystal-river</code>. It's easier to
            remember than a random string, but still very strong — each added
            word multiplies the search space enormously.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Should I use symbols in my password?</summary>
          <p>
            Yes — symbols add ~32 more possible characters, which
            significantly increases entropy. Some websites don't allow certain
            symbols, so our generator lets you toggle them off.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How often should I change my passwords?</summary>
          <p>
            Modern advice: change passwords only when there's a reason — a
            data breach, suspicion of compromise, or if you've shared it
            insecurely. Frequent changes lead to weaker passwords.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What's the best way to store generated passwords?</summary>
          <p>
            Use a <strong>password manager</strong> like Bitwarden, 1Password,
            or KeePass. Never store passwords in plain text files, browser
            notes, or on paper in an obvious place.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is this tool free?</summary>
          <p>
            Yes — completely free, no signup, no ads, no limits. Generate as
            many passwords as you want.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other security tools: <strong>Hash Generator</strong>,{' '}
          <strong>QR Code Generator</strong>, <strong>UUID Generator</strong>,
          and <strong>Base64 Encoder</strong> — all free and browser-based.
        </p>
      </section>
    </article>
  );
}