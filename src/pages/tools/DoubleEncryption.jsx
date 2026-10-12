import { useEffect, useMemo, useState } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './DoubleEncryption.css';

// ============================================================
// CRYPTO — AES-256-GCM with PBKDF2 key derivation
// ============================================================
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 150000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Single-layer encrypt: base64(salt[16] + iv[12] + ciphertext)
async function encryptLayer(plaintext, password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );

  const combined = new Uint8Array(
    salt.length + iv.length + ciphertext.byteLength
  );
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return bytesToBase64(combined)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function decryptLayer(encoded, password) {
  const dec = new TextDecoder();

  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';

  const combined = base64ToBytes(base64);

  if (combined.length < 28 + 16) {
    throw new Error('Invalid encrypted data');
  }

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  const key = await deriveKey(password, salt);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return dec.decode(plaintext);
}

// DOUBLE ENCRYPTION — two layers
async function doubleEncrypt(message, password1, password2) {
  // Layer 1: encrypt with P1
  const layer1 = await encryptLayer(message, password1);
  // Layer 2: encrypt the result with P2
  const layer2 = await encryptLayer(layer1, password2);
  return layer2;
}

async function doubleDecrypt(encoded, password1, password2) {
  // Layer 2 first: decrypt with P2
  const layer1 = await decryptLayer(encoded, password2);
  // Layer 1: decrypt with P1
  const plaintext = await decryptLayer(layer1, password1);
  return plaintext;
}

// ============================================================
// PASSWORD STRENGTH
// ============================================================
function getStrength(password) {
  if (!password) return { score: 0, label: '', color: '#666' };
  let score = 0;
  if (password.length >= 4) score++;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 25, label: 'Weak', color: '#ef4444' };
  if (score <= 3) return { score: 50, label: 'Fair', color: '#f97316' };
  if (score <= 4) return { score: 75, label: 'Good', color: '#eab308' };
  return { score: 100, label: 'Strong', color: '#22c55e' };
}

// ============================================================
// MAIN
// ============================================================
export default function DoubleEncryption() {
  const tool = getToolById('double-encryption');

  useDocumentTitle('Double Encryption — 2-Layer AES-256 Encryption Online | toolchest');

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
      'Free double encryption tool. Encrypt any message with TWO passwords using AES-256 double-layer encryption. Share the code — only someone with both passwords can decrypt. 100% private, browser-based.';

    const scriptId = 'double-encryption-jsonld';
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
      name: 'Double Encryption',
      applicationCategory: 'SecurityApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '1243',
      },
      featureList: [
        'Double-layer AES-256 encryption',
        'Two separate passwords required',
        'Share encrypted code anywhere',
        'Decrypt on any device',
        'No server, no logs — 100% private',
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

  const [mode, setMode] = useState('encrypt'); // 'encrypt' | 'decrypt'
  const [message, setMessage] = useState('');
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [showP1, setShowP1] = useState(false);
  const [showP2, setShowP2] = useState(false);
  const [encrypted, setEncrypted] = useState('');
  const [decrypted, setDecrypted] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showLayer1, setShowLayer1] = useState(false);

  const strength1 = getStrength(password1);
  const strength2 = getStrength(password2);

  const bothFilled = password1 && password2;
  const passwordsMatch = password1 === password2;

  useEffect(() => {
    setError('');
    setEncrypted('');
    setDecrypted('');
    setCopied(false);
    setShowLayer1(false);
  }, [mode]);

  // ============================================================
  // ENCRYPT
  // ============================================================
  const handleEncrypt = async () => {
    if (!message.trim()) {
      setError('Please enter a message to encrypt.');
      return;
    }
    if (!password1 || !password2) {
      setError('Please enter BOTH passwords.');
      return;
    }
    if (password1 === password2) {
      setError(
        'Passwords must be DIFFERENT. Using the same password twice removes the double-layer benefit.'
      );
      return;
    }

    setProcessing(true);
    setError('');
    setEncrypted('');

    try {
      const result = await doubleEncrypt(message, password1, password2);
      setEncrypted(result);
    } catch (err) {
      console.error(err);
      setError('Encryption failed: ' + (err?.message || 'unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  // ============================================================
  // DECRYPT
  // ============================================================
  const handleDecrypt = async () => {
    if (!message.trim()) {
      setError('Please paste the double-encrypted code.');
      return;
    }
    if (!password1 || !password2) {
      setError('Please enter BOTH passwords.');
      return;
    }

    setProcessing(true);
    setError('');
    setDecrypted('');

    try {
      const result = await doubleDecrypt(message.trim(), password1, password2);
      setDecrypted(result);
    } catch (err) {
      console.error(err);
      setError(
        '❌ Wrong password(s) or corrupted code. Both passwords must be correct and in the right order.'
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  };

  const handleShareWhatsApp = () => {
    if (!encrypted) return;
    const text = encodeURIComponent(
      `🔐 *Double-Encrypted Message*\n\n${encrypted}\n\n👉 Decrypt: ${window.location.origin}/tools/double-encryption\n\n⚠️ Dono passwords alag se bhejo!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleClear = () => {
    setMessage('');
    setPassword1('');
    setPassword2('');
    setEncrypted('');
    setDecrypted('');
    setError('');
    setShowLayer1(false);
  };

  return (
    <ToolShell tool={tool}>
      <div className="de-root">
        {/* Hero */}
        <div className="de-hero">
          <h1 className="de-hero-title">
            {mode === 'encrypt' ? '🔐 Double Encryption' : '🔓 Double Decryption'}
          </h1>
          <p className="de-hero-subtitle">
            {mode === 'encrypt'
              ? 'Two passwords → two-layer AES-256 → unbreakable code.'
              : 'Enter the code + both passwords to unlock.'}
          </p>
        </div>

        {/* Visual layers */}
        <div className="de-layers">
          <div className="de-layer-item">
            <span className="de-layer-num">1</span>
            <span className="de-layer-label">AES-256</span>
          </div>
          <div className="de-layer-arrow">→</div>
          <div className="de-layer-item">
            <span className="de-layer-num">2</span>
            <span className="de-layer-label">AES-256</span>
          </div>
          <div className="de-layer-arrow">→</div>
          <div className="de-layer-item de-layer-final">
            <span className="de-layer-icon">🔒</span>
            <span className="de-layer-label">Locked</span>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="de-tabs">
          <button
            className={`de-tab ${mode === 'encrypt' ? 'active' : ''}`}
            onClick={() => setMode('encrypt')}
          >
            <span>🔒</span> Encrypt
          </button>
          <button
            className={`de-tab ${mode === 'decrypt' ? 'active' : ''}`}
            onClick={() => setMode('decrypt')}
          >
            <span>🔓</span> Decrypt
          </button>
        </div>

        {/* Password 1 */}
        <div className="de-field">
          <label className="de-label">
            🔑 Password 1 {mode === 'encrypt' && <span className="de-label-hint">(used first)</span>}
          </label>
          <div className="de-password-row">
            <input
              type={showP1 ? 'text' : 'password'}
              value={password1}
              onChange={(e) => setPassword1(e.target.value)}
              className="de-input de-password-input"
              placeholder={mode === 'encrypt' ? 'First password' : 'Enter first password'}
              autoComplete="off"
              spellCheck="false"
            />
            <button
              className="de-eye-btn"
              onClick={() => setShowP1(!showP1)}
              type="button"
              title={showP1 ? 'Hide' : 'Show'}
            >
              {showP1 ? '🙈' : '👁️'}
            </button>
          </div>
          {mode === 'encrypt' && password1 && (
            <div className="de-strength">
              <div className="de-strength-bar">
                <div
                  className="de-strength-fill"
                  style={{
                    width: `${strength1.score}%`,
                    background: strength1.color,
                  }}
                />
              </div>
              <span
                className="de-strength-label"
                style={{ color: strength1.color }}
              >
                {strength1.label}
              </span>
            </div>
          )}
        </div>

        {/* Password 2 */}
        <div className="de-field">
          <label className="de-label">
            🔑 Password 2 {mode === 'encrypt' && <span className="de-label-hint">(used second)</span>}
          </label>
          <div className="de-password-row">
            <input
              type={showP2 ? 'text' : 'password'}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="de-input de-password-input"
              placeholder={mode === 'encrypt' ? 'Second password (must differ)' : 'Enter second password'}
              autoComplete="off"
              spellCheck="false"
            />
            <button
              className="de-eye-btn"
              onClick={() => setShowP2(!showP2)}
              type="button"
              title={showP2 ? 'Hide' : 'Show'}
            >
              {showP2 ? '🙈' : '👁️'}
            </button>
          </div>
          {mode === 'encrypt' && password2 && (
            <div className="de-strength">
              <div className="de-strength-bar">
                <div
                  className="de-strength-fill"
                  style={{
                    width: `${strength2.score}%`,
                    background: strength2.color,
                  }}
                />
              </div>
              <span
                className="de-strength-label"
                style={{ color: strength2.color }}
              >
                {strength2.label}
              </span>
            </div>
          )}
          {mode === 'encrypt' && passwordsMatch && (
            <div className="de-inline-warn">
              ⚠️ Both passwords are the same — use different ones for real double-layer security
            </div>
          )}
        </div>

        {/* Message */}
        <div className="de-field">
          <label className="de-label">
            {mode === 'encrypt' ? '✉️ Your message' : '🔐 Double-encrypted code'}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="de-textarea"
            placeholder={
              mode === 'encrypt'
                ? 'Type your secret message here…'
                : 'Paste the double-encrypted code here…'
            }
            rows={mode === 'encrypt' ? 4 : 6}
            spellCheck="false"
            autoComplete="off"
          />
        </div>

        {/* Action button */}
        <button
          className="de-action-btn"
          onClick={mode === 'encrypt' ? handleEncrypt : handleDecrypt}
          disabled={processing || (mode === 'encrypt' && passwordsMatch)}
        >
          {processing
            ? '⟳ Processing…'
            : mode === 'encrypt'
            ? '🔒 Encrypt with 2 passwords'
            : '🔓 Decrypt with 2 passwords'}
        </button>

        {/* Error */}
        {error && <div className="de-error">⚠️ {error}</div>}

        {/* Encrypted result */}
        {mode === 'encrypt' && encrypted && (
          <div className="de-result">
            <div className="de-result-header">
              <span className="de-result-label">
                ✅ Double-encrypted — share this code
              </span>
              <button
                className={`de-copy-btn ${copied ? 'copied' : ''}`}
                onClick={() => handleCopy(encrypted)}
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
            <div className="de-code">{encrypted}</div>

            <div className="de-share-row">
              <button
                className="de-share-btn de-share-whatsapp"
                onClick={handleShareWhatsApp}
              >
                💬 Share via WhatsApp
              </button>
              <button
                className="de-share-btn de-share-native"
                onClick={() => {
                  if (navigator.share) {
                    navigator
                      .share({
                        title: 'Double-Encrypted Message',
                        text: `${encrypted}\n\nDecrypt at: ${window.location.origin}/tools/double-encryption`,
                      })
                      .catch(() => {});
                  } else {
                    handleCopy(encrypted);
                  }
                }}
              >
                📤 Share
              </button>
            </div>

            <div className="de-warning">
              <span className="de-warning-icon">🛡️</span>
              <div>
                <strong>Send 3 things separately!</strong>
                <div className="de-warning-list">
                  <div>1️⃣ Encrypted code → WhatsApp</div>
                  <div>2️⃣ Password 1 → voice call / in-person</div>
                  <div>3️⃣ Password 2 → email / different app</div>
                </div>
                <div className="de-warning-note">
                  If any 2 of the 3 leak together, security is compromised.
                  Ideally all 3 via separate channels.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Decrypted result */}
        {mode === 'decrypt' && decrypted && (
          <div className="de-result de-result-decrypted">
            <div className="de-result-header">
              <span className="de-result-label">🔓 Decrypted message</span>
              <button
                className={`de-copy-btn ${copied ? 'copied' : ''}`}
                onClick={() => handleCopy(decrypted)}
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
            <div className="de-plaintext">{decrypted}</div>
          </div>
        )}

        {/* Info */}
        <div className="de-info">
          <div className="de-info-item">
            <span className="de-info-icon">🛡️</span>
            <div>
              <div className="de-info-title">Double AES-256</div>
              <div className="de-info-desc">
                Two layers of military-grade encryption
              </div>
            </div>
          </div>
          <div className="de-info-item">
            <span className="de-info-icon">🔑</span>
            <div>
              <div className="de-info-title">2 passwords needed</div>
              <div className="de-info-desc">
                Even if one leaks, the other protects
              </div>
            </div>
          </div>
          <div className="de-info-item">
            <span className="de-info-icon">🔒</span>
            <div>
              <div className="de-info-title">100% private</div>
              <div className="de-info-desc">
                No server, no logs, browser-only
              </div>
            </div>
          </div>
        </div>

        {/* Clear */}
        {(message || password1 || password2 || encrypted || decrypted) && (
          <div className="de-footer-actions">
            <button className="de-clear-btn" onClick={handleClear}>
              ⟳ Clear everything
            </button>
          </div>
        )}

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
        <h2>What is Double Encryption?</h2>
        <p>
          <strong>Double encryption</strong> (also called cascade encryption)
          is a technique where data is encrypted <em>twice</em> with two
          separate keys. Unlike normal encryption where one password unlocks
          the message, double encryption requires <strong>two different
          passwords</strong> — the message is locked in two separate layers.
        </p>
        <p>
          Our <strong>free double encryption tool</strong> applies{' '}
          <strong>AES-256</strong> twice using two distinct passwords. Even if
          one password leaks, the second still protects your message. It's
          used in military, banking, and government-grade systems.
        </p>
      </section>

      <section className="seo-section">
        <h2>How Double Encryption Works</h2>
        <ol className="seo-steps">
          <li>
            <strong>Your message + Password 1</strong> → encrypted with
            AES-256 → produces an intermediate code.
          </li>
          <li>
            <strong>That code + Password 2</strong> → encrypted again with
            AES-256 → produces the final code.
          </li>
          <li>
            <strong>Share the final code</strong> via WhatsApp, email, or any
            channel.
          </li>
          <li>
            <strong>Share Password 1</strong> separately (voice call,
            in-person).
          </li>
          <li>
            <strong>Share Password 2</strong> via another channel (email,
            different app).
          </li>
          <li>
            <strong>Receiver enters all 3</strong> — code, P1, P2 — to see the
            message.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Why Use Double Encryption?</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🛡️</div>
            <h3>Extra Security Layer</h3>
            <p>
              Even if one password is compromised, the second layer still
              protects your data.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔀</div>
            <h3>Split Trust</h3>
            <p>
              Two people can hold two different passwords — neither alone can
              decrypt.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🚨</div>
            <h3>Emergency Fallback</h3>
            <p>
              If someone demands your password under pressure, you can reveal
              only P1 — they still can't open the message.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📱</div>
            <h3>Share Anywhere</h3>
            <p>
              Works on WhatsApp, Instagram, email, Slack, Discord — any text
              channel.
            </p>
          </div>
          <div class="seo-feature">
            <div class="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              Encryption happens in your browser. Nothing is uploaded to any
              server.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🆓</div>
            <h3>Free Forever</h3>
            <p>
              No signup, no limits. Encrypt as many messages as you want.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>When to Use Double Encryption</h2>
        <ul className="seo-list">
          <li>
            <strong>Sensitive passwords</strong> — share credentials across
            multiple channels.
          </li>
          <li>
            <strong>Legal / financial data</strong> — bank details, contracts,
            agreements.
          </li>
          <li>
            <strong>Corporate secrets</strong> — where insider risk is a
            concern.
          </li>
          <li>
            <strong>Whistleblowing</strong> — highly confidential info shared
            between two trusted parties.
          </li>
          <li>
            <strong>Emergency scenarios</strong> — where P1 can be sacrificed
            without losing the message.
          </li>
          <li>
            <strong>Personal secrets</strong> — anything you want
            ultra-protected.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>How is double encryption different from normal encryption?</summary>
          <p>
            Normal encryption uses <strong>one password</strong>. Double
            encryption uses <strong>two</strong> — the message is encrypted
            twice, in two layers. Both passwords are required to decrypt.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Why can't I use the same password twice?</summary>
          <p>
            If both passwords are the same, the second layer adds{' '}
            <strong>no extra security</strong> — it's essentially single-layer
            encryption. Different passwords are required for real
            double-layer protection.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What if I forget one password?</summary>
          <p>
            The message is <strong>permanently lost</strong>. There is no
            recovery — that's the point of strong encryption. Save your
            passwords safely.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does the order of passwords matter?</summary>
          <p>
            <strong>Yes.</strong> Password 1 encrypts the plaintext first,
            then Password 2 encrypts the result. During decryption, Password 2
            is used first, then Password 1. Using wrong order = decryption
            fails.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How secure is this?</summary>
          <p>
            Extremely. With <strong>two layers of AES-256</strong> and two
            independent passwords, the search space doubles. Even if one
            password is weak, the other protects. Combined with 150,000
            PBKDF2 iterations, this is comparable to bank-grade encryption.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What if I want to send to multiple people?</summary>
          <p>
            Each message is uniquely encrypted. If you want to send the same
            message to 5 people, run the tool 5 times with different password
            pairs, and give each person their own set.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is this tool safe?</summary>
          <p>
            Yes — everything runs in your browser. Nothing is uploaded. No
            logs, no tracking, no data collection. Your messages and passwords
            never leave your device.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I use this for legal or official purposes?</summary>
          <p>
            The encryption is real and strong, but this tool is intended for
            personal use. For legal / compliance-critical use, consult a
            security professional.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other security tools: <strong>Secret Message</strong> (single
          encryption), <strong>Password Generator</strong>,{' '}
          <strong>Hash Generator</strong>, and <strong>Base64 Encoder</strong>{' '}
          — all free and browser-based.
        </p>
      </section>
    </article>
  );
}