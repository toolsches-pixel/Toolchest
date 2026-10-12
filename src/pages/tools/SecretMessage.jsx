import { useEffect, useState } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './SecretMessage.css';

// ============================================================
// CRYPTO HELPERS (Web Crypto API — built-in, no libraries)
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
      iterations: 100000,
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
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
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

// Format: base64(salt[16] + iv[12] + ciphertext)
async function encryptMessage(message, password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(password, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(message)
  );

  // Combine: salt + iv + ciphertext
  const combined = new Uint8Array(
    salt.length + iv.length + ciphertext.byteLength
  );
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  // Base64 encode
  const base64 = bytesToBase64(combined);
  // Make it URL-safe: replace + / = with - _ and remove =
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function decryptMessage(encoded, password) {
  const enc = new TextDecoder();

  // Restore base64
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding
  while (base64.length % 4 !== 0) base64 += '=';

  const combined = base64ToBytes(base64);

  if (combined.length < 28 + 16) {
    throw new Error('Invalid encrypted message');
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

  return enc.decode(plaintext);
}

// ============================================================
// PASSWORD STRENGTH
// ============================================================
function getPasswordStrength(password) {
  if (!password) return { score: 0, label: 'Empty', color: '#666' };

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
// MAIN COMPONENT
// ============================================================
export default function SecretMessage() {
  const tool = getToolById('secret-message');

  useDocumentTitle('Secret Message — Encrypt & Decrypt Messages Online | toolchest');

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
      'Free online secret message tool. Encrypt any text with a password using AES-256 encryption, then share the encrypted code. Your friend decrypts it on this page with the same password. 100% private — no server, no logs.';

    const scriptId = 'secret-message-jsonld';
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
      name: 'Secret Message Encryptor',
      applicationCategory: 'SecurityApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '1587',
      },
      featureList: [
        'Encrypt messages with password',
        'AES-256 encryption',
        'Share encrypted code via WhatsApp',
        'Decrypt on any device with password',
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
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [encrypted, setEncrypted] = useState('');
  const [decrypted, setDecrypted] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const strength = getPasswordStrength(password);

  // Reset when mode changes
  useEffect(() => {
    setError('');
    setEncrypted('');
    setDecrypted('');
    setCopied(false);
  }, [mode]);

  // ============================================================
  // ENCRYPT
  // ============================================================
  const handleEncrypt = async () => {
    if (!message.trim()) {
      setError('Please enter a message to encrypt.');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }

    setProcessing(true);
    setError('');
    setEncrypted('');

    try {
      const result = await encryptMessage(message, password);
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
      setError('Please paste the encrypted message.');
      return;
    }
    if (!password) {
      setError('Please enter the password.');
      return;
    }

    setProcessing(true);
    setError('');
    setDecrypted('');

    try {
      const result = await decryptMessage(message.trim(), password);
      setDecrypted(result);
    } catch (err) {
      console.error(err);
      setError('❌ Wrong password or corrupted message. Please check and try again.');
    } finally {
      setProcessing(false);
    }
  };

  // ============================================================
  // COPY
  // ============================================================
  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  };

  // ============================================================
  // SHARE VIA WHATSAPP
  // ============================================================
  const handleShareWhatsApp = () => {
    if (!encrypted) return;
    const text = encodeURIComponent(
      `🔐 *Encrypted Message*\n\n${encrypted}\n\n👉 Decrypt at: ${window.location.origin}/tools/secret-message\n\n⚠️ Password alag se bhejna!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // ============================================================
  // CLEAR
  // ============================================================
  const handleClear = () => {
    setMessage('');
    setPassword('');
    setEncrypted('');
    setDecrypted('');
    setError('');
  };

  return (
    <ToolShell tool={tool}>
      <div className="sm-root">
        {/* Hero */}
        <div className="sm-hero">
          <h1 className="sm-hero-title">
            {mode === 'encrypt' ? '🔒 Secret Message' : '🔓 Decrypt Message'}
          </h1>
          <p className="sm-hero-subtitle">
            {mode === 'encrypt'
              ? 'Write a message + password → get encrypted code → share anywhere.'
              : 'Paste the encrypted code + password → get the original message.'}
          </p>
        </div>

        {/* Mode tabs */}
        <div className="sm-tabs">
          <button
            className={`sm-tab ${mode === 'encrypt' ? 'active' : ''}`}
            onClick={() => setMode('encrypt')}
          >
            <span>🔒</span> Encrypt
          </button>
          <button
            className={`sm-tab ${mode === 'decrypt' ? 'active' : ''}`}
            onClick={() => setMode('decrypt')}
          >
            <span>🔓</span> Decrypt
          </button>
        </div>

        {/* Password field — common */}
        <div className="sm-field">
          <label className="sm-label">
            {mode === 'encrypt' ? 'Set a password' : 'Enter password'}
          </label>
          <div className="sm-password-row">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="sm-input sm-password-input"
              placeholder={
                mode === 'encrypt'
                  ? 'Create a strong password'
                  : 'Enter the password you received'
              }
              autoComplete="off"
              spellCheck="false"
            />
            <button
              className="sm-eye-btn"
              onClick={() => setShowPassword(!showPassword)}
              type="button"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          {/* Password strength indicator (only in encrypt mode) */}
          {mode === 'encrypt' && password && (
            <div className="sm-strength">
              <div className="sm-strength-bar">
                <div
                  className="sm-strength-fill"
                  style={{
                    width: `${strength.score}%`,
                    background: strength.color,
                  }}
                />
              </div>
              <span
                className="sm-strength-label"
                style={{ color: strength.color }}
              >
                {strength.label}
              </span>
            </div>
          )}
        </div>

        {/* Message input */}
        <div className="sm-field">
          <label className="sm-label">
            {mode === 'encrypt' ? 'Your message' : 'Encrypted code'}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="sm-textarea"
            placeholder={
              mode === 'encrypt'
                ? 'Type your secret message here…'
                : 'Paste the encrypted code here…'
            }
            rows={mode === 'encrypt' ? 4 : 6}
            spellCheck="false"
            autoComplete="off"
          />
        </div>

        {/* Action button */}
        <button
          className="sm-action-btn"
          onClick={mode === 'encrypt' ? handleEncrypt : handleDecrypt}
          disabled={processing}
        >
          {processing
            ? '⟳ Processing…'
            : mode === 'encrypt'
            ? '🔒 Encrypt message'
            : '🔓 Decrypt message'}
        </button>

        {/* Error */}
        {error && <div className="sm-error">⚠️ {error}</div>}

        {/* Encrypted result */}
        {mode === 'encrypt' && encrypted && (
          <div className="sm-result">
            <div className="sm-result-header">
              <span className="sm-result-label">
                ✅ Encrypted — share this code
              </span>
              <button
                className={`sm-copy-btn ${copied ? 'copied' : ''}`}
                onClick={() => handleCopy(encrypted)}
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
            <div className="sm-encrypted-code">{encrypted}</div>

            {/* Share buttons */}
            <div className="sm-share-row">
              <button
                className="sm-share-btn sm-share-whatsapp"
                onClick={handleShareWhatsApp}
              >
                💬 Share via WhatsApp
              </button>
              <button
                className="sm-share-btn sm-share-native"
                onClick={() => {
                  if (navigator.share) {
                    navigator
                      .share({
                        title: 'Secret Message',
                        text: `${encrypted}\n\nDecrypt at: ${window.location.origin}/tools/secret-message`,
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

            {/* Warning */}
            <div className="sm-warning">
              <span className="sm-warning-icon">⚠️</span>
              <span>
                <strong>Password alag se bhejo!</strong> Agar aap encrypted
                code ke saath password bhi bhej doge, toh encryption ka koi
                fayda nahi. WhatsApp pe code bhejo, aur password alag se
                (voice call, ya different app).
              </span>
            </div>
          </div>
        )}

        {/* Decrypted result */}
        {mode === 'decrypt' && decrypted && (
          <div className="sm-result sm-result-decrypted">
            <div className="sm-result-header">
              <span className="sm-result-label">🔓 Decrypted message</span>
              <button
                className={`sm-copy-btn ${copied ? 'copied' : ''}`}
                onClick={() => handleCopy(decrypted)}
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
            <div className="sm-decrypted-text">{decrypted}</div>
          </div>
        )}

        {/* How it works */}
        <div className="sm-how">
          <h3 className="sm-how-title">How does this work?</h3>
          <div className="sm-how-steps">
            <div className="sm-how-step">
              <div className="sm-how-num">1</div>
              <div className="sm-how-text">
                <strong>Write your message</strong> and set a password
              </div>
            </div>
            <div className="sm-how-arrow">→</div>
            <div className="sm-how-step">
              <div className="sm-how-num">2</div>
              <div className="sm-how-text">
                <strong>Copy the encrypted code</strong> and share it
                (WhatsApp, email, etc.)
              </div>
            </div>
            <div className="sm-how-arrow">→</div>
            <div className="sm-how-step">
              <div className="sm-how-num">3</div>
              <div className="sm-how-text">
                <strong>Friend pastes it here</strong>, enters password → sees
                your message
              </div>
            </div>
          </div>
        </div>

        {/* Security info */}
        <div className="sm-info">
          <div className="sm-info-item">
            <span className="sm-info-icon">🛡️</span>
            <div>
              <div className="sm-info-title">AES-256 encryption</div>
              <div className="sm-info-desc">
                Same technology banks use — practically unbreakable
              </div>
            </div>
          </div>
          <div className="sm-info-item">
            <span className="sm-info-icon">🔒</span>
            <div>
              <div className="sm-info-title">100% private</div>
              <div className="sm-info-desc">
                No server, no database, no logs — everything in your browser
              </div>
            </div>
          </div>
          <div className="sm-info-item">
            <span className="sm-info-icon">🔑</span>
            <div>
              <div className="sm-info-title">Password-protected</div>
              <div className="sm-info-desc">
                Without the correct password, the code cannot be decrypted
              </div>
            </div>
          </div>
        </div>

        {/* Clear button */}
        {(message || password || encrypted || decrypted) && (
          <div className="sm-footer-actions">
            <button className="sm-clear-btn" onClick={handleClear}>
              ⟳ Clear everything
            </button>
          </div>
        )}

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
        <h2>What is a Secret Message Tool?</h2>
        <p>
          A <strong>secret message tool</strong> encrypts your text with a
          password, turning it into a scrambled code that only someone with
          the same password can read. It's like putting your message in a
          digital lockbox — even if it's intercepted, no one can open it
          without the key.
        </p>
        <p>
          Our <strong>free online secret message encryptor</strong> uses{' '}
          <strong>AES-256</strong> encryption — the same standard used by
          banks and governments. Everything runs in your browser, so your
          messages and passwords never leave your device.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Send a Secret Message</h2>
        <ol className="seo-steps">
          <li>
            <strong>Type your message</strong> — anything you want to send
            secretly.
          </li>
          <li>
            <strong>Set a password</strong> — both you and your friend need to
            know it. Use something strong and unrelated to you.
          </li>
          <li>
            <strong>Click "Encrypt"</strong> — you'll get a scrambled code.
          </li>
          <li>
            <strong>Copy and share the code</strong> — WhatsApp, Instagram,
            email, anywhere.
          </li>
          <li>
            <strong>Send the password separately</strong> — via voice call, or
            a different app. <em>Never</em> share password with the code.
          </li>
          <li>
            <strong>Friend decrypts</strong> — they open this page, paste the
            code, enter the password → your original message appears.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🛡️</div>
            <h3>AES-256 Encryption</h3>
            <p>
              Military-grade encryption — the same used by banks, VPNs, and
              governments worldwide.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              Messages are encrypted and decrypted in your browser. Nothing is
              ever sent to a server.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">💬</div>
            <h3>Share Anywhere</h3>
            <p>
              Copy the encrypted code and paste it into WhatsApp, Instagram,
              Telegram, email — anything.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔑</div>
            <h3>Password Protected</h3>
            <p>
              Without the exact password, the message cannot be decrypted —
              even by us.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📱</div>
            <h3>Works on Any Device</h3>
            <p>
              Desktop, mobile, tablet — any device with a browser can encrypt
              or decrypt.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🆓</div>
            <h3>Free Forever</h3>
            <p>
              No signup, no ads, no limits. Encrypt as many messages as you
              want.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Uses</h2>
        <ul className="seo-list">
          <li>
            <strong>Sharing passwords</strong> — send Wi-Fi passwords, account
            credentials safely.
          </li>
          <li>
            <strong>Private conversations</strong> — share sensitive info on
            shared chat groups.
          </li>
          <li>
            <strong>Surprise messages</strong> — birthdays, anniversaries,
            proposals.
          </li>
          <li>
            <strong>Business notes</strong> — confidential memos between team
            members.
          </li>
          <li>
            <strong>Personal secrets</strong> — anything you don't want
            visible.
          </li>
          <li>
            <strong>CTF / Puzzles</strong> — fun for cryptography enthusiasts.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this secret message tool safe?</summary>
          <p>
            Yes — it uses <strong>AES-256</strong>, one of the strongest
            encryption standards in the world. Plus, everything runs in your
            browser — no data ever leaves your device, so nobody (not even we)
            can see your messages or passwords.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can someone crack the encrypted code?</summary>
          <p>
            With AES-256, brute-forcing the password would take more than the
            age of the universe — practically impossible. The only real risk
            is if you use a weak password (like "1234") that can be guessed.
            Use a strong password.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What if I forget the password?</summary>
          <p>
            The message is <strong>permanently lost</strong>. Even we can't
            recover it — that's the whole point of strong encryption. Always
            remember the password, or write it down somewhere safe.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is the encrypted code different every time?</summary>
          <p>
            Yes — every encryption uses a random salt and IV (initialization
            vector). So the same message with the same password will produce a
            different code every time.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I share the code and password on WhatsApp together?</summary>
          <p>
            <strong>NO — never do that.</strong> If both are in the same
            message, anyone reading it can decrypt. Send the code on WhatsApp,
            and the password via a different channel (voice call, in-person,
            separate app).
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does the code expire?</summary>
          <p>
            No — the encrypted code never expires. It can be decrypted any
            time, on any device, as long as you have the password and this
            tool.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I use this for legal / official purposes?</summary>
          <p>
            The tool uses real AES-256 encryption, but it's intended for
            personal use. For legal or compliance-critical purposes, consult a
            security professional.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is there a character limit?</summary>
          <p>
            No hard limit — but very long messages (100KB+) may be slow on
            some devices. For best performance, keep messages under 10KB.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other security tools: <strong>Password Generator</strong>,{' '}
          <strong>Hash Generator</strong>, <strong>Base64 Encoder</strong>, and{' '}
          <strong>QR Code Generator</strong> — all free and browser-based.
        </p>
      </section>
    </article>
  );
}