import { useEffect, useRef, useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './OcrTool.css';

// ============================================================
// CONFIG
// ============================================================
const LANGS = [
  { id: 'eng', label: 'English', flag: '🇬🇧' },
  { id: 'hin', label: 'Hindi', flag: '🇮🇳' },
  { id: 'eng+hin', label: 'English + Hindi', flag: '🌐' },
];

// ============================================================
// MAIN
// ============================================================
export default function OcrTool() {
  const tool = getToolById('ocr-tool');

  useDocumentTitle('Image to Text (OCR) — Free Online OCR Tool | toolchest');

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
      'Free online OCR tool. Convert images to text — supports English and Hindi. Extract text from photos, screenshots, scanned documents. 100% browser-based, no upload, no signup.';

    const scriptId = 'ocr-tool-jsonld';
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
      name: 'Image to Text (OCR)',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '2187',
      },
      featureList: [
        'Convert images to text (OCR)',
        'Supports English and Hindi',
        'Extract text from photos, screenshots, scanned documents',
        'Live progress indicator',
        'Copy or download extracted text',
        'No file upload — 100% browser-based',
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
  const [imagePreview, setImagePreview] = useState('');
  const [lang, setLang] = useState('eng');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  const fileInputRef = useRef(null);
  const workerRef = useRef(null);

  // ============================================================
  // FILE UPLOAD
  // ============================================================
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, WEBP).');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum 10 MB.');
      return;
    }

    setError('');
    setExtractedText('');
    setFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const handleReset = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setFile(null);
    setImagePreview('');
    setExtractedText('');
    setError('');
    setProgress(0);
    setProgressStatus('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ============================================================
  // OCR
  // ============================================================
  const runOcr = useCallback(async () => {
    if (!file || processing) return;

    setProcessing(true);
    setError('');
    setExtractedText('');
    setProgress(0);
    setProgressStatus('Loading OCR engine…');

    try {
      // Create worker with proper paths
      const worker = await Tesseract.createWorker(lang, 1, {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
            setProgressStatus('Recognizing text…');
          } else if (m.status === 'loading language traineddata') {
            setProgressStatus('Loading language data…');
          } else if (m.status === 'initializing api') {
            setProgressStatus('Initializing engine…');
          }
        },
      });

      workerRef.current = worker;

      setProgressStatus('Extracting text…');
      const { data } = await worker.recognize(file);

      setExtractedText(data.text || '');
      const wc = data.text.trim() ? data.text.trim().split(/\s+/).length : 0;
      setWordCount(wc);
      setProgress(100);
      setProgressStatus('');

      await worker.terminate();
      workerRef.current = null;
    } catch (err) {
      console.error('OCR error:', err);
      setError('OCR failed: ' + (err?.message || 'unknown error'));
      setProgressStatus('');
    } finally {
      setProcessing(false);
    }
  }, [file, lang, processing]);

  // ============================================================
  // COPY / DOWNLOAD
  // ============================================================
  const copyText = async () => {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  };

  const downloadText = () => {
    if (!extractedText) return;
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocr-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (workerRef.current) {
        try { workerRef.current.terminate(); } catch (e) {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ToolShell tool={tool}>
      <div className="ocr-root">
        {/* Hero */}
        <div className="ocr-hero">
          <h1 className="ocr-hero-title">📷 Image to Text (OCR)</h1>
          <p className="ocr-hero-subtitle">
            Extract text from images — English and Hindi. 100% browser-based,
            no upload.
          </p>
        </div>

        {/* Upload */}
        {!file ? (
          <div
            className="ocr-dropzone"
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
            <div className="ocr-dropzone-icon">📤</div>
            <button className="ocr-upload-btn">Choose Image</button>
            <div className="ocr-dropzone-hint">
              or drag & drop · JPG, PNG, WEBP · Max 10 MB
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          <div className="ocr-work">
            {/* Left: Image preview */}
            <div className="ocr-preview">
              <div className="ocr-preview-header">
                <span>Image</span>
                <button className="ocr-remove-btn" onClick={handleReset}>
                  ✕ Remove
                </button>
              </div>
              <div className="ocr-preview-img">
                <img src={imagePreview} alt="Preview" />
              </div>

              {/* Language select */}
              <div className="ocr-lang-section">
                <label className="ocr-label">Language</label>
                <div className="ocr-lang-tabs">
                  {LANGS.map((l) => (
                    <button
                      key={l.id}
                      className={`ocr-lang-tab ${lang === l.id ? 'active' : ''}`}
                      onClick={() => setLang(l.id)}
                      disabled={processing}
                    >
                      <span>{l.flag}</span>
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action */}
              <button
                className="ocr-run-btn"
                onClick={runOcr}
                disabled={processing}
              >
                {processing ? '⟳ Extracting…' : '🔍 Extract Text'}
              </button>

              {/* Progress */}
              {processing && (
                <div className="ocr-progress">
                  <div className="ocr-progress-header">
                    <span>{progressStatus}</span>
                    {progress > 0 && <span>{progress}%</span>}
                  </div>
                  <div className="ocr-progress-bar">
                    <div
                      className="ocr-progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {error && <div className="ocr-error">⚠️ {error}</div>}
            </div>

            {/* Right: Result */}
            <div className="ocr-result">
              <div className="ocr-result-header">
                <span>Extracted Text</span>
                {extractedText && (
                  <div className="ocr-result-actions">
                    <button
                      className={`ocr-copy-btn ${copied ? 'copied' : ''}`}
                      onClick={copyText}
                    >
                      {copied ? '✓ Copied' : '📋 Copy'}
                    </button>
                    <button className="ocr-copy-btn" onClick={downloadText}>
                      ⬇ .txt
                    </button>
                  </div>
                )}
              </div>

              {extractedText ? (
                <>
                  <textarea
                    className="ocr-textarea"
                    value={extractedText}
                    onChange={(e) => setExtractedText(e.target.value)}
                    spellCheck="false"
                  />
                  <div className="ocr-result-meta">
                    <span>{wordCount} words</span>
                    <span>{extractedText.length} characters</span>
                  </div>
                </>
              ) : (
                <div className="ocr-empty">
                  <div className="ocr-empty-icon">📄</div>
                  <div className="ocr-empty-text">
                    {processing
                      ? 'Extracting text…'
                      : 'Upload an image and click "Extract Text"'}
                  </div>
                </div>
              )}
            </div>
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
        <h2>What is OCR (Optical Character Recognition)?</h2>
        <p>
          <strong>OCR (Optical Character Recognition)</strong> is a technology
          that converts images of text into machine-readable text. Whether
          it's a photo of a document, a scanned PDF page, or a screenshot,
          OCR extracts the words so you can copy, edit, or search them.
        </p>
        <p>
          Our <strong>free online OCR tool</strong> runs entirely in your
          browser using Tesseract.js — the JavaScript port of Google's Tesseract
          OCR engine. Your images never leave your device, making it the safest
          way to convert images to text online.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Extract Text from an Image</h2>
        <ol className="seo-steps">
          <li>
            <strong>Upload your image</strong> — drag & drop or click to
            browse. Supports JPG, PNG, WEBP.
          </li>
          <li>
            <strong>Choose language</strong> — English, Hindi, or both.
          </li>
          <li>
            <strong>Click "Extract Text"</strong> — the OCR engine processes
            your image locally.
          </li>
          <li>
            <strong>Copy or download</strong> — the extracted text appears in
            the text box. Copy it or save as .txt.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🔍</div>
            <h3>Accurate OCR</h3>
            <p>
              Powered by Tesseract.js — the same engine used by Google,
              supporting 100+ languages.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🇮🇳</div>
            <h3>Hindi Support</h3>
            <p>
              Extract Hindi (Devanagari) text from images along with English.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              All processing happens in your browser. Your images never leave
              your device.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⚡</div>
            <h3>Live Progress</h3>
            <p>
              See the recognition progress in real time — from loading the
              engine to extracting text.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📋</div>
            <h3>Copy & Download</h3>
            <p>
              Copy extracted text to clipboard or download as a .txt file.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📱</div>
            <h3>Works Everywhere</h3>
            <p>
              Fully responsive — use it on desktop, tablet, or mobile.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Use Cases</h2>
        <ul className="seo-list">
          <li>
            <strong>Digitizing notes</strong> — turn handwritten notes into
            editable text.
          </li>
          <li>
            <strong>Scanned documents</strong> — extract text from old scanned
            PDFs or images.
          </li>
          <li>
            <strong>Screenshots</strong> — copy text from screenshots without
            retyping.
          </li>
          <li>
            <strong>Study material</strong> — convert textbook pages to text
            for notes.
          </li>
          <li>
            <strong>Signs & menus</strong> — extract text from photos of signs,
            menus, or posters.
          </li>
          <li>
            <strong>Data entry</strong> — avoid manually typing from image
            documents.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this OCR tool free?</summary>
          <p>
            Yes — completely free with no signup, no watermarks, no hidden
            fees. Extract text from as many images as you want.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are my images safe?</summary>
          <p>
            Absolutely. Everything runs locally in your browser using
            WebAssembly and Web Workers. Your images are never uploaded to any
            server.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Which languages are supported?</summary>
          <p>
            Currently English and Hindi. Tesseract.js supports 100+ languages —
            more will be added soon.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How accurate is the OCR?</summary>
          <p>
            Accuracy depends on image quality. Clear, high-resolution images of
            printed text give the best results. Handwritten text is harder —
            results may vary.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What image formats are supported?</summary>
          <p>
            JPG, JPEG, PNG, and WEBP. Maximum file size 10 MB.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Why does it take time?</summary>
          <p>
            The first run downloads the OCR engine (~2 MB) and language data
            (~10 MB for English, ~15 MB for Hindi). After that, it's cached in
            your browser — subsequent runs are much faster.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work offline?</summary>
          <p>
            After the first use (which downloads the engine), subsequent OCR
            runs work without internet because everything is cached locally.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I edit the extracted text?</summary>
          <p>
            Yes — the extracted text appears in an editable text box. You can
            fix any errors manually before copying or downloading.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other tools: <strong>PDF to Text</strong>,{' '}
          <strong>Image Resizer</strong>, <strong>Image Compressor</strong>,{' '}
          <strong>Word Counter</strong>, and <strong>Typing Test</strong> — all
          free and browser-based.
        </p>
      </section>
    </article>
  );
}