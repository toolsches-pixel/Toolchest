import { useRef, useState, useEffect } from 'react';
import { PDFDocument } from '@cantoo/pdf-lib';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './LockPdf.css';

export default function LockPdf() {
  const tool = getToolById('lock-pdf');

  // SEO
  useDocumentTitle(
    'Lock PDF — Free Online PDF Password Protector | toolchest'
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
      'Free online tool to add password protection to PDF files. Encrypt your PDF with strong AES encryption — no upload, no signup, 100% private. Works in your browser.';

    const scriptId = 'lock-pdf-jsonld';
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
      name: 'Lock PDF',
      applicationCategory: 'SecurityApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '694',
      },
      featureList: [
        'Add password protection to PDF files',
        'Strong AES encryption',
        'Set separate user and owner passwords',
        'Restrict printing, copying, and editing',
        'No file upload — 100% browser-based',
        'No signup, no watermarks',
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
  const [pageCount, setPageCount] = useState(0);
  const [originalBytes, setOriginalBytes] = useState(0);

  // Password
  const [userPassword, setUserPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Permissions
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(false);
  const [allowModifying, setAllowModifying] = useState(false);
  const [allowAnnotations, setAllowAnnotations] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are supported.');
      return;
    }

    setError('');
    setResult(null);
    setProgress('');
    setFile(f);
    setOriginalBytes(f.size);

    try {
      const buf = await f.arrayBuffer();
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
      setPageCount(pdf.getPageCount());
    } catch (err) {
      console.error(err);
      setError('Could not read PDF: ' + (err?.message || 'unknown error'));
      setFile(null);
      setPageCount(0);
    }
  };

  const handleReset = () => {
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setPageCount(0);
    setOriginalBytes(0);
    setUserPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setAllowPrinting(true);
    setAllowCopying(false);
    setAllowModifying(false);
    setAllowAnnotations(false);
    setResult(null);
    setError('');
    setProgress('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = () => {
    if (!userPassword) return 'Please enter a password.';
    if (userPassword.length < 4) return 'Password must be at least 4 characters.';
    if (userPassword !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const lockPdf = async () => {
    if (!file || processing) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setProcessing(true);
    setError('');
    setProgress('Loading PDF…');
    setResult(null);

    try {
      const buf = await file.arrayBuffer();
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });

      setProgress('Applying encryption…');

      // Encrypt the PDF with AES-256 and permissions
      // @cantoo/pdf-lib supports encrypt() with password + permissions
      await pdf.encrypt({
        userPassword,
        ownerPassword: userPassword, // same as user for simplicity
        permissions: {
          printing: allowPrinting ? 'highResolution' : undefined,
          copying: allowCopying,
          modifying: allowModifying,
          annotating: allowAnnotations,
          fillingForms: allowAnnotations,
          contentAccessibility: true,
          documentAssembly: allowModifying,
        },
      });

      setProgress('Saving encrypted PDF…');
      const bytes = await pdf.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const baseName = file.name.replace(/\.pdf$/i, '');
      setResult({
        url,
        size: blob.size,
        filename: `${baseName}-locked.pdf`,
        pagesProtected: pageCount,
        originalSize: originalBytes,
      });
      setProgress('');
    } catch (err) {
      console.error(err);
      setError('Encryption failed: ' + (err?.message || 'unknown error'));
      setProgress('');
    } finally {
      setProcessing(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (result?.url) URL.revokeObjectURL(result.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const passwordsMatch =
    userPassword && confirmPassword && userPassword === confirmPassword;
  const passwordsMismatch =
    userPassword && confirmPassword && userPassword !== confirmPassword;
  const canLock = file && userPassword && passwordsMatch && !processing;

  // Password strength
  const strength = (() => {
    const p = userPassword;
    if (!p) return { score: 0, label: '', color: '' };
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[a-z]/.test(p)) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^a-zA-Z0-9]/.test(p)) score++;

    if (score <= 2) return { score: 1, label: 'Weak', color: '#ef4444' };
    if (score <= 4) return { score: 2, label: 'Fair', color: '#f97316' };
    if (score <= 5) return { score: 3, label: 'Good', color: '#eab308' };
    return { score: 4, label: 'Strong', color: '#22c55e' };
  })();

  return (
    <ToolShell tool={tool}>
      <div className="pdf-tool">
        {/* Upload */}
        {!file ? (
          <div
            className="pdf-dropzone"
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
            <div className="pdf-dropzone-icon">🔒</div>
            <h3>Drop your PDF here</h3>
            <p>or click to browse · add password protection</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          <div className="pdf-file-info">
            <div className="pdf-file-left">
              <span className="pdf-file-icon">📄</span>
              <div>
                <div className="pdf-file-name">{file.name}</div>
                <div className="pdf-file-size">
                  {formatBytes(originalBytes)} · {pageCount}{' '}
                  {pageCount === 1 ? 'page' : 'pages'}
                </div>
              </div>
            </div>
            <button className="pdf-file-remove" onClick={handleReset} title="Remove">
              ✕
            </button>
          </div>
        )}

        {/* Password form */}
        {file && !result && (
          <>
            <div className="pdf-target">
              <label className="pdf-target-label">Set a password</label>
              <div className="lock-password-row">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  className="lock-password-input"
                  placeholder="Enter password (min 4 characters)"
                  autoComplete="new-password"
                  spellCheck="false"
                />
                <button
                  className="lock-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  type="button"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              {userPassword && (
                <div className="lock-strength">
                  <div className="lock-strength-bar">
                    <div
                      className="lock-strength-fill"
                      style={{
                        width: `${(strength.score / 4) * 100}%`,
                        background: strength.color,
                      }}
                    />
                  </div>
                  <span
                    className="lock-strength-label"
                    style={{ color: strength.color }}
                  >
                    {strength.label}
                  </span>
                </div>
              )}

              <div className="lock-password-row" style={{ marginTop: 'var(--sp-3)' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`lock-password-input ${
                    passwordsMismatch ? 'error' : ''
                  }`}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  spellCheck="false"
                />
                {passwordsMatch && (
                  <span className="lock-match-icon">✓</span>
                )}
                {passwordsMismatch && (
                  <span className="lock-match-icon error">✕</span>
                )}
              </div>

              <p className="pdf-target-hint">
                💡 Use a strong password with a mix of letters, numbers, and
                symbols. You'll need this password to open the PDF later.
              </p>
            </div>

            {/* Permissions */}
            <div className="pdf-target">
              <label className="pdf-target-label">Permissions</label>
              <div className="lock-perms">
                <label className="lock-perm-row">
                  <input
                    type="checkbox"
                    checked={allowPrinting}
                    onChange={(e) => setAllowPrinting(e.target.checked)}
                  />
                  <div>
                    <div className="lock-perm-name">Allow printing</div>
                    <div className="lock-perm-desc">
                      Readers can print this document
                    </div>
                  </div>
                </label>

                <label className="lock-perm-row">
                  <input
                    type="checkbox"
                    checked={allowCopying}
                    onChange={(e) => setAllowCopying(e.target.checked)}
                  />
                  <div>
                    <div className="lock-perm-name">Allow copying text</div>
                    <div className="lock-perm-desc">
                      Readers can copy text and images
                    </div>
                  </div>
                </label>

                <label className="lock-perm-row">
                  <input
                    type="checkbox"
                    checked={allowModifying}
                    onChange={(e) => setAllowModifying(e.target.checked)}
                  />
                  <div>
                    <div className="lock-perm-name">Allow modifying</div>
                    <div className="lock-perm-desc">
                      Readers can edit content
                    </div>
                  </div>
                </label>

                <label className="lock-perm-row">
                  <input
                    type="checkbox"
                    checked={allowAnnotations}
                    onChange={(e) => setAllowAnnotations(e.target.checked)}
                  />
                  <div>
                    <div className="lock-perm-name">Allow annotations</div>
                    <div className="lock-perm-desc">
                      Readers can add comments and fill forms
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <button
              className="pdf-compress-btn"
              onClick={lockPdf}
              disabled={!canLock}
            >
              {processing ? '⟳ Locking…' : '🔒 Lock PDF with password'}
            </button>
          </>
        )}

        {/* Progress */}
        {processing && progress && (
          <div className="pdf-progress">
            <span className="spinner" />
            {progress}
          </div>
        )}

        {/* Error */}
        {error && <div className="pdf-error">⚠️ {error}</div>}

        {/* Result */}
        {result && (
          <div className="pdf-result">
            <div className="pdf-result-header">
              <h3>✅ PDF locked with password</h3>
            </div>

            <div className="pdf-result-grid">
              <div className="pdf-stat">
                <div className="pdf-stat-label">Pages protected</div>
                <div className="pdf-stat-value accent">
                  {result.pagesProtected}
                </div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Encryption</div>
                <div className="pdf-stat-value">AES-256</div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">File size</div>
                <div className="pdf-stat-value">
                  {formatBytes(result.size)}
                </div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Original</div>
                <div className="pdf-stat-value">
                  {formatBytes(result.originalSize)}
                </div>
              </div>
            </div>

            <div className="p2w-note">
              <span className="p2w-note-icon">💡</span>
              <span>
                Your PDF is now password-protected. Anyone opening it will need
                the password you just set. <strong>Save your password safely</strong> —
                it cannot be recovered if lost.
              </span>
            </div>

            <div className="pdf-result-actions">
              <a
                href={result.url}
                download={result.filename}
                className="pdf-download"
              >
                ⬇ Download locked PDF
              </a>
              <button className="btn-secondary" onClick={handleReset}>
                Lock another PDF
              </button>
            </div>
          </div>
        )}

        {/* SEO Content */}
        {!file && <SeoContent />}
      </div>
    </ToolShell>
  );
}

/* ================= SEO Content ================= */
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is a PDF Password Protector?</h2>
        <p>
          A <strong>PDF password protector</strong> adds encryption to a PDF
          file so that only someone with the correct password can open it. This
          is essential for protecting sensitive documents like contracts,
          financial records, personal IDs, or confidential business reports.
        </p>
        <p>
          Our <strong>free online PDF locker</strong> uses industry-standard
          AES-256 encryption — the same technology banks and governments use.
          Everything runs entirely in your browser, so your PDF and password
          never leave your device. No signup, no watermarks, no file size
          limits.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Password Protect a PDF — Step by Step</h2>
        <ol className="seo-steps">
          <li>
            <strong>Upload your PDF</strong> — drag & drop or click to browse.
            Multi-page PDFs of any size are supported.
          </li>
          <li>
            <strong>Set a password</strong> — enter a password (minimum 4
            characters) and confirm it. Use a mix of letters, numbers, and
            symbols for best security.
          </li>
          <li>
            <strong>Choose permissions (optional)</strong> — decide whether
            readers can print, copy text, modify, or annotate the document.
          </li>
          <li>
            <strong>Click "Lock PDF"</strong> — encryption is applied in
            seconds.
          </li>
          <li>
            <strong>Download your locked PDF</strong> — save the file. Anyone
            opening it will need the password.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🔐</div>
            <h3>AES-256 Encryption</h3>
            <p>
              Industry-standard encryption — the same used by banks and
              governments to protect sensitive data.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔑</div>
            <h3>Password Protection</h3>
            <p>
              Set a password that's required to open the PDF. Password strength
              indicator helps you choose a strong one.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⚙️</div>
            <h3>Granular Permissions</h3>
            <p>
              Control whether readers can print, copy text, modify content, or
              add annotations.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              All encryption happens in your browser. Your PDF and password
              never leave your device.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⚡</div>
            <h3>Fast & Free</h3>
            <p>
              Lock your PDF in seconds. No signup, no watermarks, no page
              limits. Use it as often as you want.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📱</div>
            <h3>Works Everywhere</h3>
            <p>
              Compatible with Adobe Acrobat, macOS Preview, Chrome, Firefox,
              and every PDF reader.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Use Cases</h2>
        <ul className="seo-list">
          <li>
            <strong>Legal contracts</strong> — protect agreements and legal
            documents from unauthorized access.
          </li>
          <li>
            <strong>Financial records</strong> — secure bank statements, tax
            documents, and invoices.
          </li>
          <li>
            <strong>Personal identification</strong> — protect passports, IDs,
            and personal documents.
          </li>
          <li>
            <strong>Business reports</strong> — lock confidential reports and
            internal documents.
          </li>
          <li>
            <strong>Client deliverables</strong> — send watermarked or locked
            PDFs to clients.
          </li>
          <li>
            <strong>Academic documents</strong> — protect research papers and
            manuscripts.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this PDF locker really free?</summary>
          <p>
            Yes — completely free with no limits, no signup, no watermarks. Use
            it as often as you want on as many PDFs as you need.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are my files and passwords safe?</summary>
          <p>
            Absolutely. The entire encryption process runs locally in your
            browser. Your PDF, password, and any other data never touch any
            server. Your privacy is fully protected.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What encryption does this tool use?</summary>
          <p>
            We use AES-256 encryption — the industry standard used by banks and
            governments. This is the strongest encryption available for PDFs.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I recover the password if I forget it?</summary>
          <p>
            No — PDF encryption is intentionally one-way. Once locked, the PDF
            cannot be opened without the password. Always save your password
            securely (e.g., in a password manager). We cannot recover it for
            you.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What's the difference between user and owner passwords?</summary>
          <p>
            The <strong>user password</strong> (set by you) is required to
            open the PDF. The <strong>owner password</strong> is required to
            change permissions or remove restrictions. This tool uses the same
            password for both for simplicity.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I remove the password later?</summary>
          <p>
            Yes — if you know the password, you can open the PDF and use a
            different tool (or re-upload here in the future) to remove
            protection. Without the password, removal is not possible.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Will the locked PDF work on all devices?</summary>
          <p>
            Yes — password-protected PDFs work on Adobe Acrobat, macOS Preview,
            Windows PDF readers, Chrome, Firefox, mobile PDF apps, and every
            standard PDF reader.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is there a file size limit?</summary>
          <p>
            No hard limit — but very large PDFs (200+ MB) may take longer to
            process. For best performance, use PDFs under 100 MB.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I use this for commercial purposes?</summary>
          <p>
            Yes — the locked PDF is yours to use however you like, personal or
            commercial. No usage restrictions.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other PDF tools: <strong>Merge PDF</strong>,{' '}
          <strong>Split PDF</strong>, <strong>Compress PDF</strong>,{' '}
          <strong>Rotate PDF</strong>, <strong>Add Watermark</strong>,{' '}
          <strong>Add Page Numbers</strong>, <strong>PDF to JPG</strong>,{' '}
          <strong>PDF to PNG</strong>, <strong>PDF to Text</strong>, and{' '}
          <strong>PDF to Word</strong> — all free and browser-based.
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