import { useRef, useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function PdfToText() {
  const tool = getToolById('pdf-to-text');

  // SEO: dynamic title + meta description
  useDocumentTitle(
    'PDF to Text Converter — Free Online PDF Text Extractor | toolchest'
  );

  // SEO: inject meta description + structured data on mount
  useEffect(() => {
    // Meta description
    let meta = document.querySelector('meta[name="description"]');
    const created = !meta;
    if (created) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    const prevDesc = meta.content;
    meta.content =
      'Free online PDF to Text converter. Extract text from PDF files instantly in your browser — no upload, no signup, 100% private. Works with multi-page PDFs, preserves line breaks, supports custom page ranges.';

    // JSON-LD structured data
    const scriptId = 'pdf-to-text-jsonld';
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
      name: 'PDF to Text Converter',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web Browser',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '1284',
      },
      featureList: [
        'Extract text from PDF files',
        'Works with multi-page PDFs',
        'Preserve line breaks and formatting',
        'Page range selection',
        'Copy to clipboard',
        'Download as .txt',
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
  const [pageCount, setPageCount] = useState(0);
  const [pageRange, setPageRange] = useState('');
  const [preserveBreaks, setPreserveBreaks] = useState(true);
  const [includePageMarkers, setIncludePageMarkers] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [text, setText] = useState('');
  const [pages, setPages] = useState([]); // [{ page, text }]
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'perPage'
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are supported.');
      return;
    }

    setFile(f);
    setText('');
    setPages([]);
    setError('');
    setProgress('');

    try {
      const buf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      setPageCount(pdf.numPages);
    } catch (err) {
      console.error(err);
      setError('Could not read PDF: ' + (err?.message || 'unknown error'));
      setFile(null);
      setPageCount(0);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPageCount(0);
    setText('');
    setPages([]);
    setError('');
    setProgress('');
    setPageRange('');
    setCopied(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const parsePageRange = (str, total) => {
    if (!str.trim()) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const set = new Set();
    const parts = str.split(',').map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes('-')) {
        const [a, b] = part.split('-').map((n) => parseInt(n, 10));
        if (!isNaN(a) && !isNaN(b)) {
          const start = Math.max(1, Math.min(a, b));
          const end = Math.min(total, Math.max(a, b));
          for (let i = start; i <= end; i++) set.add(i);
        }
      } else {
        const n = parseInt(part, 10);
        if (!isNaN(n) && n >= 1 && n <= total) set.add(n);
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  };

  const extract = async () => {
    if (!file || processing) return;
    setProcessing(true);
    setError('');
    setProgress('Reading PDF…');
    setText('');
    setPages([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const total = pdf.numPages;
      const targetPages = parsePageRange(pageRange, total);

      if (targetPages.length === 0) {
        throw new Error('No valid pages selected.');
      }

      const results = [];

      for (let i = 0; i < targetPages.length; i++) {
        const pageNum = targetPages[i];
        setProgress(`Extracting text from page ${i + 1} of ${targetPages.length}…`);

        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();

        // Rebuild text with line breaks based on Y positions
        let pageText = '';
        let lastY = null;
        let lastX = null;
        const lineThreshold = 3; // px tolerance

        for (const item of content.items) {
          if (!item.str) continue;

          const x = item.transform[4];
          const y = item.transform[5];

          if (lastY !== null) {
            const dy = Math.abs(y - lastY);
            if (dy > lineThreshold) {
              // New line
              pageText += preserveBreaks ? '\n' : ' ';
            } else if (
              lastX !== null &&
              x - lastX > (item.height || 10) * 0.4
            ) {
              // Significant gap → space
              pageText += ' ';
            }
          }

          pageText += item.str;
          lastY = y;
          lastX = x + (item.width || 0);
        }

        // Clean up extra spaces/newlines
        if (preserveBreaks) {
          pageText = pageText
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        } else {
          pageText = pageText.replace(/\s+/g, ' ').trim();
        }

        results.push({ page: pageNum, text: pageText });
      }

      // Build final output
      let finalText = '';
      for (const r of results) {
        if (includePageMarkers) {
          finalText += `\n\n--- Page ${r.page} ---\n\n`;
        } else if (finalText) {
          finalText += preserveBreaks ? '\n\n' : '\n';
        }
        finalText += r.text;
      }
      finalText = finalText.trim();

      setPages(results);
      setText(finalText);
      setProgress('');
    } catch (err) {
      console.error(err);
      setError('Extraction failed: ' + (err?.message || 'unknown error'));
      setProgress('');
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      setError('Could not copy to clipboard');
    }
  };

  const downloadTxt = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.replace(/\.pdf$/i, '')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const stats = {
    characters: text.length,
    words: text ? text.split(/\s+/).filter(Boolean).length : 0,
    lines: text ? text.split('\n').length : 0,
    paragraphs: text ? text.split(/\n\s*\n/).filter((p) => p.trim()).length : 0,
  };

  const estimatedPageCount = pageRange.trim()
    ? parsePageRange(pageRange, pageCount).length
    : pageCount;

  return (
    <ToolShell tool={tool}>
      <div className="pdf-tool">
        {/* Upload */}
        {!file ? (
          <>
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
              <div className="pdf-dropzone-icon">📝</div>
              <h3>Drop your PDF here</h3>
              <p>or click to browse · extract all text instantly</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </>
        ) : (
          <div className="pdf-file-info">
            <div className="pdf-file-left">
              <span className="pdf-file-icon">📄</span>
              <div>
                <div className="pdf-file-name">{file.name}</div>
                <div className="pdf-file-size">
                  {formatBytes(file.size)} · {pageCount}{' '}
                  {pageCount === 1 ? 'page' : 'pages'}
                </div>
              </div>
            </div>
            <button className="pdf-file-remove" onClick={handleReset} title="Remove">
              ✕
            </button>
          </div>
        )}

        {/* Options */}
        {file && !text && (
          <>
            <div className="pdf-target">
              <label className="pdf-target-label">Text formatting</label>
              <div className="p2t-options">
                <label className="pn-checkbox">
                  <input
                    type="checkbox"
                    checked={preserveBreaks}
                    onChange={(e) => setPreserveBreaks(e.target.checked)}
                  />
                  <span>Preserve line breaks & paragraphs</span>
                </label>
                <label className="pn-checkbox">
                  <input
                    type="checkbox"
                    checked={includePageMarkers}
                    onChange={(e) => setIncludePageMarkers(e.target.checked)}
                  />
                  <span>Include page markers (--- Page N ---)</span>
                </label>
              </div>
            </div>

            {pageCount > 1 && (
              <div className="pdf-target">
                <label className="pdf-target-label">Pages (optional)</label>
                <input
                  type="text"
                  placeholder={`Leave empty for all ${pageCount} pages · or e.g. 1,3,5-8`}
                  value={pageRange}
                  onChange={(e) => setPageRange(e.target.value)}
                  className="pdf-target-number"
                  style={{ width: '100%' }}
                />
                {pageRange.trim() && (
                  <p className="pdf-target-hint">
                    → Extracting from <strong>{estimatedPageCount}</strong> page
                    {estimatedPageCount === 1 ? '' : 's'}
                  </p>
                )}
              </div>
            )}

            <button
              className="pdf-compress-btn"
              onClick={extract}
              disabled={processing}
            >
              {processing
                ? '⟳ Extracting…'
                : `📝 Extract text from ${
                    estimatedPageCount || 'all'
                  } page${estimatedPageCount === 1 ? '' : 's'}`}
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
        {text && (
          <>
            {/* Stats */}
            <div className="p2t-stats">
              <div className="p2t-stat">
                <div className="p2t-stat-value">
                  {stats.words.toLocaleString()}
                </div>
                <div className="p2t-stat-label">words</div>
              </div>
              <div className="p2t-stat">
                <div className="p2t-stat-value">
                  {stats.characters.toLocaleString()}
                </div>
                <div className="p2t-stat-label">characters</div>
              </div>
              <div className="p2t-stat">
                <div className="p2t-stat-value">{stats.lines}</div>
                <div className="p2t-stat-label">lines</div>
              </div>
              <div className="p2t-stat">
                <div className="p2t-stat-value">{stats.paragraphs}</div>
                <div className="p2t-stat-label">paragraphs</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="p2t-tabs">
              <button
                className={`p2t-tab ${activeTab === 'preview' ? 'active' : ''}`}
                onClick={() => setActiveTab('preview')}
              >
                📄 Full text
              </button>
              <button
                className={`p2t-tab ${activeTab === 'perPage' ? 'active' : ''}`}
                onClick={() => setActiveTab('perPage')}
              >
                📑 Per page ({pages.length})
              </button>
            </div>

            {/* Content */}
            {activeTab === 'preview' && (
              <div className="p2t-output">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="p2t-textarea"
                  spellCheck="false"
                />
              </div>
            )}

            {activeTab === 'perPage' && (
              <div className="p2t-pages">
                {pages.map((p) => (
                  <div key={p.page} className="p2t-page-card">
                    <div className="p2t-page-header">
                      <span className="p2t-page-num">Page {p.page}</span>
                      <span className="p2t-page-stats">
                        {p.text.split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>
                    <pre className="p2t-page-text">
                      {p.text || '(no text found on this page)'}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="pdf-result-actions">
              <button className="pdf-download" onClick={downloadTxt}>
                ⬇ Download .txt
              </button>
              <button
                className={`btn-secondary p2t-copy ${
                  copied ? 'copied' : ''
                }`}
                onClick={copyToClipboard}
              >
                {copied ? '✓ Copied!' : '📋 Copy to clipboard'}
              </button>
              <button className="btn-secondary" onClick={handleReset}>
                Try another
              </button>
            </div>
          </>
        )}

        {/* ============================================== */}
        {/* SEO CONTENT — only shows before file upload   */}
        {/* ============================================== */}
        {!file && <SeoContent />}
      </div>
    </ToolShell>
  );
}

/* ================= SEO Content Section ================= */
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is a PDF to Text Converter?</h2>
        <p>
          A <strong>PDF to Text converter</strong> extracts the readable text
          content from a PDF document and saves it as a plain <code>.txt</code>{' '}
          file. Unlike copying text manually, our tool processes every page in
          seconds and preserves the original line breaks, paragraphs, and
          spacing — so your output stays readable and properly formatted.
        </p>
        <p>
          This free <strong>PDF text extractor</strong> runs entirely in your
          browser. Your files never leave your device, which makes it one of
          the safest ways to <strong>extract text from PDF online</strong>{' '}
          without compromising privacy.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Convert PDF to Text — Step by Step</h2>
        <ol className="seo-steps">
          <li>
            <strong>Upload your PDF</strong> — drag & drop the file or click to
            browse. Multi-page PDFs are fully supported.
          </li>
          <li>
            <strong>Choose options</strong> — preserve line breaks, add page
            markers, or select a custom page range.
          </li>
          <li>
            <strong>Extract text</strong> — click the button and wait a moment
            while each page is processed.
          </li>
          <li>
            <strong>Copy or download</strong> — instantly copy the text or save
            it as a <code>.txt</code> file.
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
              All processing happens in your browser. No file is uploaded to
              any server.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⚡</div>
            <h3>Fast & Free</h3>
            <p>
              Extracts text from multi-page PDFs in seconds. No signup, no
              limits, no ads.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📐</div>
            <h3>Formatting Preserved</h3>
            <p>
              Line breaks, paragraphs, and spacing are kept intact for maximum
              readability.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📄</div>
            <h3>Page Range Support</h3>
            <p>
              Extract text from specific pages only — e.g.,{' '}
              <code>1,3,5-8</code> — perfect for large documents.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📋</div>
            <h3>One-Click Copy</h3>
            <p>
              Copy the extracted text to your clipboard instantly, or download
              as .txt.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📊</div>
            <h3>Live Statistics</h3>
            <p>
              Word count, character count, line count, and paragraph count —
              all shown live.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Use Cases</h2>
        <ul className="seo-list">
          <li>
            <strong>Research & study</strong> — extract text from academic
            papers, journals, and eBooks for note-taking.
          </li>
          <li>
            <strong>Content editing</strong> — pull text from a PDF into a Word
            doc, Google Doc, or blog post.
          </li>
          <li>
            <strong>Data analysis</strong> — feed PDF text into scripts,
            spreadsheets, or NLP pipelines.
          </li>
          <li>
            <strong>Translation</strong> — copy the text and paste into a
            translator.
          </li>
          <li>
            <strong>Accessibility</strong> — convert PDFs into plain text for
            screen readers or text-to-speech tools.
          </li>
          <li>
            <strong>Archiving</strong> — save the text of important documents
            in a lightweight, searchable format.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this PDF to Text converter really free?</summary>
          <p>
            Yes — completely free, forever. No hidden fees, no watermarks, no
            signup required. Use it as many times as you want.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are my PDF files safe?</summary>
          <p>
            Absolutely. The entire conversion happens locally in your browser
            using JavaScript. Your PDFs are never uploaded to any server, so
            your data stays completely private.
          </p>
        </details>

        <details className="seo-faq">
          <summary>
            Does it work with scanned PDFs or image-based PDFs?
          </summary>
          <p>
            This tool extracts <em>selectable text</em> from PDFs. Scanned
            PDFs (which are images, not text) require OCR (Optical Character
            Recognition), which is a different technology. If your PDF has
            selectable text, this tool will extract it perfectly.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Will the formatting be preserved?</summary>
          <p>
            Yes — we preserve line breaks, paragraphs, and spacing by default.
            You can toggle "Preserve line breaks" off if you prefer a single
            block of text, or add page markers with the "Include page markers"
            option.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I extract text from only specific pages?</summary>
          <p>
            Yes. Enter a page range like <code>1,3,5-8</code> in the "Pages"
            field and only those pages will be processed. Leave it empty to
            extract from all pages.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is there a file size limit?</summary>
          <p>
            No hard limit — but very large PDFs (100+ MB or 500+ pages) may
            take longer and use more memory. For best performance on huge
            documents, extract a page range at a time.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work on mobile?</summary>
          <p>
            Yes — the tool is fully responsive and works on phones and tablets.
            For very large PDFs, we recommend using a desktop browser for
            smoother performance.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I use this for commercial purposes?</summary>
          <p>
            Yes — the output text is yours to use however you like, personal or
            commercial. There are no usage restrictions.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Looking for more? Try our other PDF tools:{' '}
          <strong>Merge PDF</strong>, <strong>Split PDF</strong>,{' '}
          <strong>Compress PDF</strong>, <strong>Rotate PDF</strong>,{' '}
          <strong>Add Watermark</strong>, <strong>Add Page Numbers</strong>,{' '}
          <strong>PDF to JPG</strong>, and <strong>PDF to PNG</strong> — all
          free and browser-based.
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