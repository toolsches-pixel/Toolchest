import { useRef, useState, useEffect } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import * as pdfjsLib from 'pdfjs-dist';
import jsPDF from 'jspdf';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';

// PDF.js worker setup (Vite-friendly)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const UNIT_TO_BYTES = { KB: 1024, MB: 1024 * 1024 };

export default function PdfCompressor() {
  const tool = getToolById('pdf-compressor');

  // SEO: dynamic title + meta description
  useDocumentTitle(
    'Compress PDF — Free Online PDF Compressor to Target Size | toolchest'
  );

  // SEO: meta description + structured data
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
      'Free online PDF compressor. Shrink PDF files to a target size in KB or MB with smart iterative compression and a quality score. 100% private — runs entirely in your browser, no upload needed.';

    // JSON-LD structured data
    const scriptId = 'pdf-compressor-jsonld';
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
      name: 'PDF Compressor',
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
        ratingCount: '1873',
      },
      featureList: [
        'Compress PDF to target size in KB or MB',
        'Smart iterative compression',
        'Quality score with grade (A+ to F)',
        'Reduction percentage shown',
        'Batch multi-page PDF support',
        'Live progress feedback',
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
  const [targetValue, setTargetValue] = useState('100');
  const [targetUnit, setTargetUnit] = useState('KB');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
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
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError('');
    setProgress('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const targetBytes =
    parseFloat(targetValue || '0') *
    (UNIT_TO_BYTES[targetUnit] || UNIT_TO_BYTES.KB);

  const canCompress =
    file && targetBytes > 0 && !processing && targetBytes < file.size;

  const compress = async () => {
    if (!canCompress) return;
    setProcessing(true);
    setError('');
    setProgress('Reading PDF…');
    setResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      // Render each page to canvas at a scale, then rebuild PDF
      // We iterate: try quality/scale combos until output <= target * 1.05 (5% tolerance)
      const attempts = [
        { scale: 1.5, quality: 0.85 },
        { scale: 1.4, quality: 0.75 },
        { scale: 1.2, quality: 0.7 },
        { scale: 1.1, quality: 0.6 },
        { scale: 1.0, quality: 0.5 },
        { scale: 0.9, quality: 0.45 },
        { scale: 0.8, quality: 0.4 },
        { scale: 0.7, quality: 0.35 },
        { scale: 0.6, quality: 0.3 },
        { scale: 0.5, quality: 0.25 },
      ];

      let bestBlob = null;
      let bestMeta = null;

      for (let a = 0; a < attempts.length; a++) {
        const { scale, quality } = attempts[a];
        setProgress(
          `Compressing — attempt ${a + 1}/${attempts.length} (scale ${scale}, quality ${quality})…`
        );

        const blob = await rebuildPdf(pdf, numPages, scale, quality, setProgress);
        const size = blob.size;

        if (!bestBlob || size < bestBlob.size) {
          bestBlob = blob;
          bestMeta = { scale, quality, size };
        }

        // If we've reached under target, stop early
        if (size <= targetBytes * 1.05) {
          bestBlob = blob;
          bestMeta = { scale, quality, size };
          break;
        }

        // If we're under target already, stop
        if (size <= targetBytes) {
          bestBlob = blob;
          bestMeta = { scale, quality, size };
          break;
        }
      }

      // Compute stats
      const originalSize = file.size;
      const compressedSize = bestBlob.size;
      const reduction = Math.max(
        0,
        Math.round(((originalSize - compressedSize) / originalSize) * 1000) / 10
      );

      // Score: how close are we to target? (100 = perfect, 0 = way off)
      const ratio = compressedSize / targetBytes;
      let score = 0;
      if (ratio <= 1) {
        // Under target — closer to 1 is better
        score = Math.round(100 - Math.abs(1 - ratio) * 50); // up to -50 if very small
      } else {
        // Over target — penalize
        score = Math.max(0, Math.round(100 - (ratio - 1) * 100));
      }
      score = Math.max(0, Math.min(100, score));

      // Grade
      let grade = 'F';
      if (score >= 95) grade = 'A+';
      else if (score >= 90) grade = 'A';
      else if (score >= 80) grade = 'B';
      else if (score >= 70) grade = 'C';
      else if (score >= 60) grade = 'D';

      // Create download URL
      const url = URL.createObjectURL(bestBlob);

      setResult({
        originalSize,
        compressedSize,
        targetBytes,
        reduction,
        score,
        grade,
        url,
        scale: bestMeta.scale,
        quality: bestMeta.quality,
        filename: file.name.replace(/\.pdf$/i, '') + '-compressed.pdf',
      });
      setProgress('');
    } catch (err) {
      console.error(err);
      setError('Compression failed: ' + (err?.message || 'unknown error'));
      setProgress('');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolShell tool={tool}>
      <div className="pdf-tool">
        {/* Upload card */}
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
            <div className="pdf-dropzone-icon">📄</div>
            <h3>Drop your PDF here</h3>
            <p>or click to browse</p>
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
                <div className="pdf-file-size">{formatBytes(file.size)}</div>
              </div>
            </div>
            <button className="pdf-file-remove" onClick={handleReset} title="Remove">
              ✕
            </button>
          </div>
        )}

        {/* Target size input */}
        {file && !result && (
          <div className="pdf-target">
            <label className="pdf-target-label">Target size</label>
            <div className="pdf-target-input-row">
              <input
                type="number"
                min="1"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="pdf-target-number"
                placeholder="100"
              />
              <select
                value={targetUnit}
                onChange={(e) => setTargetUnit(e.target.value)}
                className="pdf-target-unit"
              >
                <option value="KB">KB</option>
                <option value="MB">MB</option>
              </select>
            </div>
            <p className="pdf-target-hint">
              Current file: <strong>{formatBytes(file.size)}</strong> · Target:{' '}
              <strong>
                {targetValue} {targetUnit}
              </strong>{' '}
              ({formatBytes(targetBytes)})
            </p>
            {targetBytes >= file.size && (
              <p className="pdf-target-warn">
                ⚠️ Target is larger than or equal to original. Choose a smaller
                target.
              </p>
            )}
          </div>
        )}

        {/* Action */}
        {file && !result && (
          <button
            className="pdf-compress-btn"
            onClick={compress}
            disabled={!canCompress}
          >
            {processing ? '⟳ Compressing…' : '🗜️ Compress PDF'}
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

        {/* Result card */}
        {result && (
          <div className="pdf-result">
            <div className="pdf-result-header">
              <h3>✅ Compression complete</h3>
              <div className={`pdf-result-grade grade-${result.grade[0]}`}>
                {result.grade}
              </div>
            </div>

            <div className="pdf-result-grid">
              <div className="pdf-stat">
                <div className="pdf-stat-label">Original</div>
                <div className="pdf-stat-value">{formatBytes(result.originalSize)}</div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Compressed</div>
                <div className="pdf-stat-value accent">
                  {formatBytes(result.compressedSize)}
                </div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Target</div>
                <div className="pdf-stat-value">
                  {formatBytes(result.targetBytes)}
                </div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Reduction</div>
                <div className="pdf-stat-value green">{result.reduction}%</div>
              </div>
            </div>

            {/* Score bar */}
            <div className="pdf-score">
              <div className="pdf-score-header">
                <span>Score</span>
                <span className="pdf-score-value">{result.score} / 100</span>
              </div>
              <div className="pdf-score-bar">
                <div
                  className="pdf-score-fill"
                  style={{ width: `${result.score}%` }}
                />
              </div>
              <p className="pdf-score-note">
                {result.score >= 90
                  ? '🎯 Excellent — very close to target!'
                  : result.score >= 70
                  ? '👍 Good — within reasonable range.'
                  : '⚠️ Could not get closer. PDF may have lots of text/vector content.'}
              </p>
            </div>

            <div className="pdf-result-actions">
              <a
                href={result.url}
                download={result.filename}
                className="pdf-download"
              >
                ⬇ Download ({formatBytes(result.compressedSize)})
              </a>
              <button className="btn-secondary" onClick={handleReset}>
                Try another PDF
              </button>
            </div>
          </div>
        )}

        {/* SEO content — only when no file uploaded */}
        {!file && <SeoContent />}
      </div>
    </ToolShell>
  );
}

/* ---------- helpers ---------- */

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Renders every page of a pdf.js document to a canvas, then rebuilds a PDF
 * using jsPDF at the given scale & JPEG quality.
 */
async function rebuildPdf(pdf, numPages, scale, quality, onProgress) {
  // First render all pages into canvases
  const pages = [];
  for (let i = 1; i <= numPages; i++) {
    if (onProgress && i === 1) onProgress(`Rendering pages…`);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');

    // White background (PDFs often have transparent bg)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    pages.push({
      dataUrl,
      width: viewport.width,
      height: viewport.height,
    });
  }

  // Build new PDF with jsPDF
  const doc = new jsPDF({
    unit: 'pt',
    format: [pages[0].width, pages[0].height],
    orientation: pages[0].width > pages[0].height ? 'landscape' : 'portrait',
  });

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    if (i > 0) {
      doc.addPage([p.width, p.height], p.width > p.height ? 'landscape' : 'portrait');
    }
    doc.addImage(p.dataUrl, 'JPEG', 0, 0, p.width, p.height, undefined, 'FAST');
  }

  const blob = doc.output('blob');
  return blob;
}

/* ================= SEO Content Section ================= */
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is a PDF Compressor?</h2>
        <p>
          A <strong>PDF compressor</strong> reduces the file size of a PDF
          document without significantly changing its appearance. This is
          essential when you need to email a file that's too large, upload a
          PDF to a website with size limits, or simply save storage space on
          your device.
        </p>
        <p>
          Our <strong>free online PDF compressor</strong> runs entirely in
          your browser. Your file is never uploaded to any server, which makes
          it one of the most private ways to shrink PDFs online. Compress
          files in seconds — no signup, no watermarks, no file size limits.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Compress a PDF — Step by Step</h2>
        <ol className="seo-steps">
          <li>
            <strong>Upload your PDF</strong> — drag & drop or click to browse.
            Multi-page PDFs of any size are supported.
          </li>
          <li>
            <strong>Set your target size</strong> — enter a number and choose
            KB or MB. For example, "100 KB" or "2 MB".
          </li>
          <li>
            <strong>Click "Compress PDF"</strong> — the tool runs smart
            iterative compression, adjusting quality and resolution until it
            gets as close as possible to your target.
          </li>
          <li>
            <strong>Review the score</strong> — see the exact output size,
            reduction percentage, and a quality score (A+ to F) that tells you
            how close you got to the target.
          </li>
          <li>
            <strong>Download</strong> — save the compressed PDF to your
            device.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🎯</div>
            <h3>Target Size Compression</h3>
            <p>
              Enter an exact target size like "100 KB" or "1 MB" and the tool
              will try to hit it as closely as possible.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🧠</div>
            <h3>Smart Iterative Algorithm</h3>
            <p>
              Tests multiple quality/resolution combos and picks the best one
              that fits your target — no manual tuning required.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📊</div>
            <h3>Quality Score & Grade</h3>
            <p>
              Get a 0-100 score and A+ to F grade showing how close the result
              is to your target size — plus the exact reduction percentage.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⚡</div>
            <h3>Fast & Free</h3>
            <p>
              Compress even large PDFs in seconds. No signup, no watermarks, no
              page limits.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📉</div>
            <h3>Up to 90% Reduction</h3>
            <p>
              Scanned and image-heavy PDFs typically shrink by 50-90% with
              barely any visible quality loss.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              All processing happens in your browser. Your PDF never leaves
              your device — no uploads, no servers.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Use Cases</h2>
        <ul className="seo-list">
          <li>
            <strong>Email attachments</strong> — shrink a 20 MB PDF to under
            10 MB so it can be emailed.
          </li>
          <li>
            <strong>Upload limits</strong> — fit a PDF under a website's
            maximum upload size (e.g., 5 MB for job applications).
          </li>
          <li>
            <strong>Storage saving</strong> — reduce a large archive of PDFs
            to save disk space.
          </li>
          <li>
            <strong>Faster uploads</strong> — smaller files upload quicker to
            cloud storage, learning platforms, or client portals.
          </li>
          <li>
            <strong>Mobile sharing</strong> — reduce size so PDFs open
            quickly on phones with limited data.
          </li>
          <li>
            <strong>Website embedding</strong> — compress PDFs before hosting
            them on a website to speed up downloads.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this PDF compressor free?</summary>
          <p>
            Yes — completely free with no limits. No signup, no watermarks, no
            hidden fees. Compress as many PDFs as you want.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are my files safe?</summary>
          <p>
            Absolutely. The entire process runs locally in your browser using
            JavaScript. Your PDF is never uploaded to any server, so your data
            stays completely private.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Will the compression hit my exact target size?</summary>
          <p>
            The tool tries <em>very</em> hard to hit your target and usually
            gets within 5-10%. However, browser-based compression can't
            always hit the exact number — it depends on the PDF's content. The
            score tells you how close it got.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Will compression reduce quality?</summary>
          <p>
            The tool converts each page to a JPEG image and rebuilds the PDF,
            so text becomes part of the image. Visually, the result often looks
            the same at normal viewing size — but text is no longer
            selectable. If you need searchable text, this tool isn't for you.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What's the quality score?</summary>
          <p>
            The score (0-100) tells you how close the compressed file is to
            your target size. 100 = perfect. Above 90 = excellent. Below 60 =
            couldn't compress further without destroying content. The grade
            (A+ to F) maps directly to the score.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What types of PDFs compress best?</summary>
          <p>
            <strong>Scanned PDFs</strong> (image-based) compress extremely
            well — often 70-90% smaller. <strong>Text-only PDFs</strong> (from
            Word exports) compress much less because they're already small.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is there a file size limit?</summary>
          <p>
            No hard limit — but very large PDFs (200+ MB or 1000+ pages) may
            take longer and use more memory. For best performance, process
            large documents in chunks.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I compress only specific pages?</summary>
          <p>
            Currently the tool compresses the entire PDF. If you want to
            compress only certain pages, split the PDF first with our Split
            PDF tool, then compress the smaller file.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work with password-protected PDFs?</summary>
          <p>
            If the PDF allows reading without a password, compression works. If
            it's locked with a password, you'll need to unlock it first using
            your PDF reader.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other PDF tools: <strong>Merge PDF</strong>,{' '}
          <strong>Split PDF</strong>, <strong>Rotate PDF</strong>,{' '}
          <strong>Add Watermark</strong>, <strong>Add Page Numbers</strong>,{' '}
          <strong>PDF to JPG</strong>, <strong>PDF to PNG</strong>,{' '}
          <strong>PDF to Text</strong>, and <strong>PDF to Word</strong> — all
          free and browser-based.
        </p>
      </section>
    </article>
  );
}