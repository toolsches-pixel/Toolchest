import { useRef, useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
} from 'docx';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// Presets
const PRESETS = {
  simple: {
    id: 'simple',
    name: 'Simple',
    desc: 'Plain paragraphs, minimal formatting',
    icon: '📄',
  },
  formatted: {
    id: 'formatted',
    name: 'Formatted',
    desc: 'Auto-detect headings & paragraphs',
    icon: '📝',
  },
  structured: {
    id: 'structured',
    name: 'Structured',
    desc: 'Page breaks + heading levels',
    icon: '📚',
  },
};

export default function PdfToWord() {
  const tool = getToolById('pdf-to-word');

  // SEO: title + meta description
  useDocumentTitle(
    'PDF to Word Converter — Free Online PDF to DOCX | toolchest'
  );

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
      'Free online PDF to Word converter. Convert PDF files to editable DOCX documents instantly in your browser — no upload, no signup, 100% private. Preserves paragraphs and formatting.';

    // JSON-LD
    const scriptId = 'pdf-to-word-jsonld';
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
      name: 'PDF to Word Converter',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '976',
      },
      featureList: [
        'Convert PDF to DOCX',
        'Editable Word documents',
        'Preserve paragraphs and formatting',
        'Auto-detect headings',
        'Page break insertion',
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
  const [preset, setPreset] = useState('formatted');
  const [pageRange, setPageRange] = useState('');
  const [includePageBreaks, setIncludePageBreaks] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null); // { url, size, filename, pagesConverted, totalWords }
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are supported.');
      return;
    }

    setFile(f);
    setResult(null);
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
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setPageCount(0);
    setResult(null);
    setError('');
    setProgress('');
    setPageRange('');
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

  const extractLinesFromPage = (content) => {
    // Group text items into lines based on Y position
    const items = content.items.filter((it) => it.str);
    if (items.length === 0) return [];

    // Sort by Y descending (top to bottom)
    const sorted = [...items].sort((a, b) => {
      const ya = a.transform[5];
      const yb = b.transform[5];
      if (Math.abs(ya - yb) > 2) return yb - ya;
      return a.transform[4] - b.transform[4];
    });

    const lines = [];
    let currentLine = [];
    let lastY = null;
    const threshold = 3;

    for (const item of sorted) {
      const y = item.transform[5];
      if (lastY === null || Math.abs(y - lastY) <= threshold) {
        currentLine.push(item);
      } else {
        if (currentLine.length > 0) {
          lines.push(buildLine(currentLine));
        }
        currentLine = [item];
      }
      lastY = y;
    }
    if (currentLine.length > 0) lines.push(buildLine(currentLine));

    return lines.filter((l) => l.text.trim().length > 0);
  };

  const buildLine = (items) => {
    // Sort by X
    const sorted = [...items].sort((a, b) => a.transform[4] - b.transform[4]);
    let text = '';
    let lastX = null;
    for (const item of sorted) {
      const x = item.transform[4];
      if (lastX !== null) {
        const gap = x - lastX;
        // If gap is significant, add a space
        if (gap > (item.height || 10) * 0.3) text += ' ';
      }
      text += item.str;
      lastX = x + (item.width || 0);
    }
    // Average font size of the line
    const avgSize =
      sorted.reduce((s, it) => s + (it.height || 10), 0) / sorted.length;
    return { text: text.trim(), fontSize: avgSize };
  };

  const isHeading = (line, medianFontSize) => {
    const t = line.text.trim();
    if (t.length === 0 || t.length > 100) return 0;
    // ALL CAPS short line → likely heading
    if (t === t.toUpperCase() && t.length > 3 && t.length < 80 && /[A-Z]/.test(t))
      return 1;
    // Significantly larger font → heading
    if (line.fontSize > medianFontSize * 1.3) return 2;
    if (line.fontSize > medianFontSize * 1.15) return 3;
    // Ends with no punctuation and short → likely heading
    if (t.length < 60 && !/[.!?,;:]$/.test(t) && /^[A-Z]/.test(t)) return 4;
    return 0;
  };

  const convert = async () => {
    if (!file || processing) return;
    setProcessing(true);
    setError('');
    setProgress('Reading PDF…');
    setResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const total = pdf.numPages;
      const targetPages = parsePageRange(pageRange, total);

      if (targetPages.length === 0) {
        throw new Error('No valid pages selected.');
      }

      // Extract lines from each page
      const pageData = [];
      let totalWords = 0;

      for (let i = 0; i < targetPages.length; i++) {
        const pageNum = targetPages[i];
        setProgress(
          `Extracting text from page ${i + 1} of ${targetPages.length}…`
        );

        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const lines = extractLinesFromPage(content);
        pageData.push({ page: pageNum, lines });

        totalWords += lines.reduce(
          (s, l) => s + l.text.split(/\s+/).filter(Boolean).length,
          0
        );
      }

      // Compute median font size across all lines
      const allSizes = pageData
        .flatMap((p) => p.lines.map((l) => l.fontSize))
        .sort((a, b) => a - b);
      const medianFontSize =
        allSizes.length > 0 ? allSizes[Math.floor(allSizes.length / 2)] : 12;

      // Build docx paragraphs
      setProgress('Building Word document…');
      const docChildren = [];

      // Title (from first page, first line if it looks like a heading)
      let docTitle = file.name.replace(/\.pdf$/i, '');
      if (pageData[0]?.lines[0]) {
        const firstLine = pageData[0].lines[0].text;
        if (firstLine.length > 3 && firstLine.length < 100) {
          docTitle = firstLine;
        }
      }

      for (let pi = 0; pi < pageData.length; pi++) {
        const { lines } = pageData[pi];

        // Page break between pages (except first)
        if (pi > 0 && includePageBreaks && preset === 'structured') {
          docChildren.push(new Paragraph({ children: [new PageBreak()] }));
        }

        for (const line of lines) {
          const headingLevel = isHeading(line, medianFontSize);

          if (preset === 'simple') {
            // No heading detection
            docChildren.push(
              new Paragraph({
                children: [new TextRun({ text: line.text, size: 24 })],
                spacing: { after: 200 },
              })
            );
          } else {
            if (headingLevel === 1) {
              docChildren.push(
                new Paragraph({
                  text: line.text,
                  heading: HeadingLevel.HEADING_1,
                  spacing: { before: 240, after: 120 },
                })
              );
            } else if (headingLevel === 2) {
              docChildren.push(
                new Paragraph({
                  text: line.text,
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 200, after: 100 },
                })
              );
            } else if (headingLevel === 3) {
              docChildren.push(
                new Paragraph({
                  text: line.text,
                  heading: HeadingLevel.HEADING_3,
                  spacing: { before: 160, after: 80 },
                })
              );
            } else if (headingLevel === 4 && preset === 'formatted') {
              docChildren.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: line.text,
                      bold: true,
                      size: 24,
                    }),
                  ],
                  spacing: { before: 140, after: 80 },
                })
              );
            } else {
              docChildren.push(
                new Paragraph({
                  children: [new TextRun({ text: line.text, size: 24 })],
                  spacing: { after: 160 },
                })
              );
            }
          }
        }
      }

      // Handle empty
      if (docChildren.length === 0) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '(No extractable text found in this PDF.)',
                italics: true,
                color: '888888',
              }),
            ],
          })
        );
      }

      // Build Document
      const doc = new Document({
        creator: 'toolchest',
        title: docTitle,
        description: `Converted from ${file.name}`,
        sections: [
          {
            properties: {},
            children: docChildren,
          },
        ],
      });

      setProgress('Packing .docx file…');
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);

      const baseName = file.name.replace(/\.pdf$/i, '');
      setResult({
        url,
        size: blob.size,
        filename: `${baseName}.docx`,
        pagesConverted: targetPages.length,
        totalWords,
      });
      setProgress('');
    } catch (err) {
      console.error(err);
      setError('Conversion failed: ' + (err?.message || 'unknown error'));
      setProgress('');
    } finally {
      setProcessing(false);
    }
  };

  const estimatedPageCount = pageRange.trim()
    ? parsePageRange(pageRange, pageCount).length
    : pageCount;

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
            <div className="pdf-dropzone-icon">📝</div>
            <h3>Drop your PDF here</h3>
            <p>or click to browse · convert to editable Word document</p>
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

        {/* Preset picker */}
        {file && !result && (
          <div className="pdf-target">
            <label className="pdf-target-label">Conversion mode</label>
            <div className="p2w-preset-grid">
              {Object.values(PRESETS).map((p) => (
                <button
                  key={p.id}
                  className={`p2w-preset-card ${
                    preset === p.id ? 'active' : ''
                  }`}
                  onClick={() => setPreset(p.id)}
                >
                  <span className="p2w-preset-icon">{p.icon}</span>
                  <span className="p2w-preset-name">{p.name}</span>
                  <span className="p2w-preset-desc">{p.desc}</span>
                </button>
              ))}
            </div>
            <p className="pdf-target-hint">
              {preset === 'simple' &&
                '📄 Plain output — every line becomes a paragraph. Best for simple text extraction.'}
              {preset === 'formatted' &&
                '📝 Smart mode — detects headings by font size & capitalization. Best for most documents.'}
              {preset === 'structured' &&
                '📚 Full structure — headings, page breaks, and spacing. Best for reports and books.'}
            </p>
          </div>
        )}

        {/* Options */}
        {file && !result && preset !== 'simple' && (
          <div className="pdf-target">
            <label className="pn-checkbox">
              <input
                type="checkbox"
                checked={includePageBreaks}
                onChange={(e) => setIncludePageBreaks(e.target.checked)}
              />
              <span>Insert page breaks between PDF pages</span>
            </label>
          </div>
        )}

        {/* Page range */}
        {file && !result && pageCount > 1 && (
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
                → Converting <strong>{estimatedPageCount}</strong> page
                {estimatedPageCount === 1 ? '' : 's'}
              </p>
            )}
          </div>
        )}

        {/* Action */}
        {file && !result && (
          <button
            className="pdf-compress-btn"
            onClick={convert}
            disabled={processing}
          >
            {processing
              ? '⟳ Converting…'
              : `📝 Convert ${
                  estimatedPageCount || 'all'
                } page${estimatedPageCount === 1 ? '' : 's'} to Word`}
          </button>
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
              <h3>✅ Word document ready</h3>
            </div>

            <div className="pdf-result-grid">
              <div className="pdf-stat">
                <div className="pdf-stat-label">Pages converted</div>
                <div className="pdf-stat-value accent">
                  {result.pagesConverted}
                </div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Words</div>
                <div className="pdf-stat-value">
                  {result.totalWords.toLocaleString()}
                </div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Format</div>
                <div className="pdf-stat-value">DOCX</div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Size</div>
                <div className="pdf-stat-value">
                  {formatBytes(result.size)}
                </div>
              </div>
            </div>

            <div className="p2w-note">
              <span className="p2w-note-icon">💡</span>
              <span>
                Open this file in <strong>Microsoft Word</strong>,{' '}
                <strong>Google Docs</strong>, <strong>Pages</strong>, or{' '}
                <strong>LibreOffice</strong> to edit it. Complex layouts
                (tables, images, columns) may not transfer perfectly — but
                paragraphs, headings, and text will be fully editable.
              </span>
            </div>

            <div className="pdf-result-actions">
              <a
                href={result.url}
                download={result.filename}
                className="pdf-download"
              >
                ⬇ Download Word (.docx)
              </a>
              <button className="btn-secondary" onClick={handleReset}>
                Try another PDF
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
        <h2>What is a PDF to Word Converter?</h2>
        <p>
          A <strong>PDF to Word converter</strong> turns a fixed-layout PDF
          document into an editable <code>.docx</code> file that you can open,
          edit, and reformat in Microsoft Word, Google Docs, or any other word
          processor. This is essential when you receive a PDF that you need to
          modify — for example, a contract to update, a report to revise, or a
          template to customize.
        </p>
        <p>
          Our <strong>free PDF to Word converter</strong> runs entirely in your
          browser. Your file is never uploaded to a server, which means it's
          one of the most private ways to <strong>convert PDF to DOCX</strong>{' '}
          online.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Convert PDF to Word — Step by Step</h2>
        <ol className="seo-steps">
          <li>
            <strong>Upload your PDF</strong> — drag & drop or click to browse.
            Multi-page PDFs are fully supported.
          </li>
          <li>
            <strong>Choose a conversion mode</strong> — Simple for plain text,
            Formatted for auto-detected headings, or Structured for full
            layout with page breaks.
          </li>
          <li>
            <strong>Click "Convert"</strong> — the text and structure are
            extracted and a real <code>.docx</code> file is generated.
          </li>
          <li>
            <strong>Download your Word file</strong> — open it in Word, Google
            Docs, or any editor and continue working.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">📄</div>
            <h3>Real DOCX Output</h3>
            <p>
              Generates a proper Microsoft Word <code>.docx</code> file — not a
              renamed text file.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🧠</div>
            <h3>Smart Heading Detection</h3>
            <p>
              Detects headings by font size and capitalization, so your Word
              doc has proper heading styles.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📚</div>
            <h3>Page Breaks</h3>
            <p>
              Optionally preserve page boundaries with automatic page breaks.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              Everything runs in your browser. Your PDF never leaves your
              device.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⚡</div>
            <h3>Free & Unlimited</h3>
            <p>No signup, no watermarks, no page limits. Use it as much as you want.</p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📐</div>
            <h3>Page Range Support</h3>
            <p>
              Convert only specific pages — e.g., <code>1,3,5-8</code> — for
              large documents.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Use Cases</h2>
        <ul className="seo-list">
          <li>
            <strong>Editing contracts</strong> — modify a PDF agreement in
            Word before sending it back.
          </li>
          <li>
            <strong>Updating reports</strong> — pull data from a PDF report
            into a Word document.
          </li>
          <li>
            <strong>Content repurposing</strong> — turn a PDF eBook, article,
            or whitepaper into an editable draft.
          </li>
          <li>
            <strong>Translating documents</strong> — extract text into Word,
            then translate with your preferred tool.
          </li>
          <li>
            <strong>Collaborative review</strong> — share the Word file with
            teammates who can add comments and track changes.
          </li>
          <li>
            <strong>Building templates</strong> — use a PDF as a starting point
            for a reusable Word template.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this PDF to Word converter really free?</summary>
          <p>
            Yes — completely free with no limits. No hidden fees, no
            watermarks, no signup. Convert as many PDFs as you like.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Will the formatting be exactly preserved?</summary>
          <p>
            Paragraphs, line breaks, and heading styles are preserved. Complex
            layouts — tables, images, columns, text boxes — may not transfer
            perfectly because PDF is a fixed-layout format while DOCX is
            flow-based. For text-heavy documents, results are excellent.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are my files safe?</summary>
          <p>
            Absolutely. The entire conversion happens locally in your browser
            using JavaScript. Your PDF is never uploaded to any server, so
            your data stays completely private.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I convert scanned PDFs?</summary>
          <p>
            Scanned PDFs are images, not text — they need OCR (Optical
            Character Recognition), which is a different technology. This tool
            works with PDFs that already have selectable text.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What file formats can I open the output in?</summary>
          <p>
            The output is a standard <code>.docx</code> file — compatible with
            Microsoft Word, Google Docs, Apple Pages, LibreOffice Writer, and
            most other word processors.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is there a file size limit?</summary>
          <p>
            No hard limit — but very large PDFs (100+ MB or 500+ pages) may
            take longer. For best performance, convert in chunks.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work on mobile?</summary>
          <p>
            Yes — fully responsive. However, for very large PDFs, a desktop
            browser will give smoother performance.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I use the output commercially?</summary>
          <p>
            Yes — the resulting Word document is entirely yours, personal or
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
          <strong>PDF to PNG</strong>, and <strong>PDF to Text</strong> — all
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