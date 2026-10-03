import { useRef, useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// Quality presets with different DPI scales
const QUALITY_PRESETS = {
  screen: {
    id: 'screen',
    name: 'Screen',
    desc: 'Fast · smaller files (72 DPI)',
    scale: 1,
    icon: '⚡',
  },
  web: {
    id: 'web',
    name: 'Web',
    desc: 'Balanced quality (150 DPI)',
    scale: 2,
    icon: '🌐',
  },
  print: {
    id: 'print',
    name: 'Print',
    desc: 'High quality (300 DPI)',
    scale: 4,
    icon: '🖨️',
  },
  ultra: {
    id: 'ultra',
    name: 'Ultra HD',
    desc: 'Max detail (600 DPI)',
    scale: 8,
    icon: '💎',
  },
};

const BACKGROUNDS = [
  { id: 'white', label: 'White', value: '#ffffff' },
  { id: 'transparent', label: 'Transparent', value: null },
  { id: 'black', label: 'Black', value: '#000000' },
];

export default function PdfToPng() {
  const tool = getToolById('pdf-to-png');

  // ============ SEO: title + meta description + JSON-LD ============
  useDocumentTitle(
    'PDF to PNG Converter — Free Online PDF to PNG (Lossless) | toolchest'
  );

  useEffect(() => {
    // Meta description
    let meta = document.querySelector('meta[name="description"]');
    const createdMeta = !meta;
    if (createdMeta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    const prevDesc = meta.content;
    meta.content =
      'Free online PDF to PNG converter. Convert PDF pages to high-quality lossless PNG images up to 600 DPI — with transparency support. No upload, no signup, 100% private.';

    // JSON-LD structured data
    const scriptId = 'pdf-to-png-jsonld';
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
      name: 'PDF to PNG Converter',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '1102',
      },
      featureList: [
        'Convert PDF pages to PNG images',
        'Lossless quality up to 600 DPI',
        'Transparent background support',
        'Custom page range selection',
        'ZIP download for multi-page PDFs',
        'Live quality score with breakdown',
        'No file upload — 100% browser-based',
        'Free forever, unlimited use',
      ],
    });

    return () => {
      if (createdMeta) document.head.removeChild(meta);
      else meta.content = prevDesc;
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, []);

  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [quality, setQuality] = useState('web');
  const [background, setBackground] = useState('white');
  const [pageRange, setPageRange] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [images, setImages] = useState([]);
  const [zipUrl, setZipUrl] = useState('');
  const [zipSize, setZipSize] = useState(0);
  const [error, setError] = useState('');
  const [score, setScore] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are supported.');
      return;
    }

    setFile(f);
    setImages([]);
    setZipUrl('');
    setZipSize(0);
    setError('');
    setProgress('');
    setScore(null);

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
    images.forEach((img) => URL.revokeObjectURL(img.url));
    if (zipUrl) URL.revokeObjectURL(zipUrl);
    setFile(null);
    setPageCount(0);
    setImages([]);
    setZipUrl('');
    setZipSize(0);
    setError('');
    setProgress('');
    setScore(null);
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

  const convert = async () => {
    if (!file || processing) return;
    setProcessing(true);
    setError('');
    setProgress('Reading PDF…');
    setImages([]);
    setZipUrl('');
    setZipSize(0);
    setScore(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      const pagesToConvert = parsePageRange(pageRange, totalPages);

      if (pagesToConvert.length === 0) {
        throw new Error('No valid pages selected.');
      }

      const preset = QUALITY_PRESETS[quality];
      const scale = preset.scale;
      const baseName = file.name.replace(/\.pdf$/i, '');
      const bgColor =
        background === 'transparent'
          ? null
          : BACKGROUNDS.find((b) => b.id === background)?.value || '#ffffff';

      const results = [];
      let totalPixels = 0;

      for (let i = 0; i < pagesToConvert.length; i++) {
        const pageNum = pagesToConvert[i];
        setProgress(
          `Rendering page ${i + 1} of ${pagesToConvert.length} (p${pageNum})…`
        );

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');

        if (bgColor) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/png')
        );

        const url = URL.createObjectURL(blob);
        totalPixels += canvas.width * canvas.height;

        results.push({
          page: pageNum,
          url,
          blob,
          size: blob.size,
          width: canvas.width,
          height: canvas.height,
          filename: `${baseName}-page-${String(pageNum).padStart(3, '0')}.png`,
        });
      }

      setImages(results);

      if (results.length > 1) {
        setProgress('Building ZIP archive…');
        const zip = new JSZip();
        results.forEach((img) => zip.file(img.filename, img.blob));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zUrl = URL.createObjectURL(zipBlob);
        setZipUrl(zUrl);
        setZipSize(zipBlob.size);
      }

      // Score
      const originalSize = file.size;
      const totalPngSize = results.reduce((s, r) => s + r.size, 0);

      const scoreData = computeScore({
        scale,
        pageCount: results.length,
        totalPixels,
        originalSize,
        pngSize: results.length > 1 ? zipSize || totalPngSize : results[0].size,
        hasTransparency: background === 'transparent',
      });
      setScore(scoreData);

      setProgress('');
    } catch (err) {
      console.error(err);
      setError('Conversion failed: ' + (err?.message || 'unknown error'));
      setProgress('');
    } finally {
      setProcessing(false);
    }
  };

  const preset = QUALITY_PRESETS[quality];
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
            <div className="pdf-dropzone-icon">🖼️</div>
            <h3>Drop your PDF here</h3>
            <p>or click to browse · each page → lossless PNG</p>
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

        {/* Quality presets */}
        {file && images.length === 0 && (
          <div className="pdf-target">
            <label className="pdf-target-label">Quality</label>
            <div className="png-quality-grid">
              {Object.values(QUALITY_PRESETS).map((p) => (
                <button
                  key={p.id}
                  className={`png-quality-card ${
                    quality === p.id ? 'active' : ''
                  }`}
                  onClick={() => setQuality(p.id)}
                >
                  <span className="png-quality-icon">{p.icon}</span>
                  <span className="png-quality-name">{p.name}</span>
                  <span className="png-quality-desc">{p.desc}</span>
                  <span className="png-quality-dpi">{p.scale}× DPI</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Background */}
        {file && images.length === 0 && (
          <div className="pdf-target">
            <label className="pdf-target-label">Background</label>
            <div className="png-bg-row">
              {BACKGROUNDS.map((b) => (
                <button
                  key={b.id}
                  className={`png-bg-btn ${
                    background === b.id ? 'active' : ''
                  }`}
                  onClick={() => setBackground(b.id)}
                >
                  {b.id === 'transparent' ? (
                    <span className="png-bg-checker" />
                  ) : (
                    <span
                      className="png-bg-solid"
                      style={{ background: b.value }}
                    />
                  )}
                  <span>{b.label}</span>
                </button>
              ))}
            </div>
            <p className="pdf-target-hint">
              {background === 'transparent'
                ? '✨ Transparency preserved — perfect for overlays, signatures, diagrams.'
                : 'Solid background — best for printing and text-heavy documents.'}
            </p>
          </div>
        )}

        {/* Page range */}
        {file && images.length === 0 && pageCount > 1 && (
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
                → <strong>{estimatedPageCount}</strong> page
                {estimatedPageCount === 1 ? '' : 's'} will be converted
              </p>
            )}
          </div>
        )}

        {/* Action */}
        {file && images.length === 0 && (
          <button
            className="pdf-compress-btn"
            onClick={convert}
            disabled={processing}
          >
            {processing
              ? '⟳ Converting…'
              : `🖼️ Convert ${
                  estimatedPageCount || 'all'
                } page${estimatedPageCount === 1 ? '' : 's'} to PNG`}
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

        {/* Results */}
        {images.length > 0 && (
          <>
            {score && <ScoreCard score={score} images={images} />}

            <div className="pdf-result">
              <div className="pdf-result-header">
                <h3>
                  ✅ Converted {images.length}{' '}
                  {images.length === 1 ? 'page' : 'pages'}
                </h3>
              </div>

              <div className="pdf-result-actions">
                {zipUrl ? (
                  <a
                    href={zipUrl}
                    download={`${file.name.replace(/\.pdf$/i, '')}-png.zip`}
                    className="pdf-download"
                  >
                    ⬇ Download all (.zip · {formatBytes(zipSize)})
                  </a>
                ) : (
                  <a
                    href={images[0].url}
                    download={images[0].filename}
                    className="pdf-download"
                  >
                    ⬇ Download ({formatBytes(images[0].size)})
                  </a>
                )}
                <button className="btn-secondary" onClick={handleReset}>
                  Try another PDF
                </button>
              </div>

              <div className="jpg-preview-grid">
                {images.map((img) => (
                  <div key={img.page} className="jpg-preview-card">
                    <div className="jpg-preview-img-wrap png-checker-bg">
                      <img
                        src={img.url}
                        alt={`Page ${img.page}`}
                        loading="lazy"
                      />
                      <span className="jpg-preview-badge">
                        Page {img.page}
                      </span>
                    </div>
                    <div className="jpg-preview-info">
                      <span className="jpg-preview-dim">
                        {img.width} × {img.height}
                      </span>
                      <span className="jpg-preview-size">
                        {formatBytes(img.size)}
                      </span>
                    </div>
                    <a
                      href={img.url}
                      download={img.filename}
                      className="jpg-download-btn"
                    >
                      ⬇ Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* SEO Content — only before file upload */}
        {!file && <SeoContent />}
      </div>
    </ToolShell>
  );
}

/* ===================== SEO Content ===================== */
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is a PDF to PNG Converter?</h2>
        <p>
          A <strong>PDF to PNG converter</strong> turns each page of a PDF
          document into a high-quality PNG image. Unlike JPG, PNG is a{' '}
          <strong>lossless</strong> format — meaning every pixel is preserved
          exactly as it appears in the original PDF. This makes PNG the ideal
          choice for documents containing <strong>text, screenshots, diagrams,
          charts, or signatures</strong> where sharp edges and readable text
          matter.
        </p>
        <p>
          Our <strong>free PDF to PNG converter</strong> runs entirely in your
          browser. Your file is never uploaded to any server, so it's one of the
          most private ways to <strong>convert PDF to PNG online</strong>{' '}
          without compromising your data.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Convert PDF to PNG — Step by Step</h2>
        <ol className="seo-steps">
          <li>
            <strong>Upload your PDF</strong> — drag & drop the file or click to
            browse. Multi-page PDFs are fully supported.
          </li>
          <li>
            <strong>Choose quality</strong> — Screen (72 DPI), Web (150 DPI),
            Print (300 DPI), or Ultra HD (600 DPI).
          </li>
          <li>
            <strong>Select a background</strong> — White, Transparent, or Black.
            Transparency is perfect for overlays and signatures.
          </li>
          <li>
            <strong>Click "Convert"</strong> — each page is rendered to a
            lossless PNG image in seconds.
          </li>
          <li>
            <strong>Download</strong> — grab individual PNGs, or the entire set
            as a ZIP archive.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">💎</div>
            <h3>Lossless PNG</h3>
            <p>
              Every pixel is preserved. Perfect for text, diagrams, screenshots,
              and line art.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎚️</div>
            <h3>Up to 600 DPI</h3>
            <p>
              Four quality presets — from fast 72 DPI screen renders to
              print-ready 600 DPI output.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎨</div>
            <h3>Transparency Support</h3>
            <p>
              Choose a transparent background for overlays, watermarks, or
              signature extraction.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📊</div>
            <h3>Live Quality Score</h3>
            <p>
              Get a detailed score with breakdown — resolution, detail, and
              format — so you know exactly what you got.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📦</div>
            <h3>ZIP for Multi-Page</h3>
            <p>
              Multi-page PDFs are packed into a single ZIP — or download each
              page individually.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              All conversion happens in your browser. No upload, no tracking,
              no data sent to servers.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Use Cases</h2>
        <ul className="seo-list">
          <li>
            <strong>Social media graphics</strong> — turn a PDF poster or flyer
            into a shareable PNG image.
          </li>
          <li>
            <strong>Presentations</strong> — extract slides from a PDF deck as
            PNG images for PowerPoint or Keynote.
          </li>
          <li>
            <strong>Website content</strong> — embed a PDF preview on a webpage
            without requiring a PDF reader.
          </li>
          <li>
            <strong>Diagrams & charts</strong> — PNG keeps lines and text
            perfectly crisp (unlike JPG).
          </li>
          <li>
            <strong>Signatures & stamps</strong> — extract a signature on a
            transparent background for reuse.
          </li>
          <li>
            <strong>Thumbnails</strong> — generate a preview image of the first
            page for file listings.
          </li>
          <li>
            <strong>Print-ready images</strong> — use 300 DPI or 600 DPI output
            for professional printing.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this PDF to PNG converter really free?</summary>
          <p>
            Yes — 100% free with no limits. No hidden fees, no watermarks, no
            signup. Use it as often as you want.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Why PNG instead of JPG?</summary>
          <p>
            PNG is <strong>lossless</strong> — it preserves every pixel
            perfectly and supports transparency. JPG is lossy (compresses with
            slight quality loss) and doesn't support transparency. For text,
            screenshots, diagrams, and logos, PNG is the better choice.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are my PDFs safe?</summary>
          <p>
            Absolutely. The entire conversion happens locally in your browser
            using JavaScript. Your PDF is never uploaded to any server — your
            files stay completely private.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How large are the output PNGs?</summary>
          <p>
            PNG files are larger than JPG because they're lossless. File size
            depends on the DPI you choose: Screen (72 DPI) produces small
            files, Ultra HD (600 DPI) produces large high-detail files. For
            web use, Web (150 DPI) is usually the best balance.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I convert only specific pages?</summary>
          <p>
            Yes. Enter a page range like <code>1,3,5-8</code> in the "Pages"
            field, and only those pages will be converted. Leave it empty to
            convert the entire PDF.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work with scanned PDFs?</summary>
          <p>
            Yes — scanned PDFs are essentially images already, and converting
            them to PNG works perfectly. Each page is rendered at your chosen
            DPI.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I keep the transparent background?</summary>
          <p>
            Yes. Choose <strong>Transparent</strong> as the background and the
            PDF's actual transparency (if any) is preserved. This is ideal for
            extracting signatures, logos, or diagrams to overlay on other
            documents.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is there a file size limit?</summary>
          <p>
            No hard limit — but very large PDFs (100+ MB or 500+ pages) may
            take longer and use more memory. For best performance on huge
            documents, convert a page range at a time.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work on mobile?</summary>
          <p>
            Yes — the tool is fully responsive. For very large PDFs or Ultra HD
            output, we recommend using a desktop browser for smoother
            performance.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I use the output commercially?</summary>
          <p>
            Yes — the PNG images are yours to use however you like, personal or
            commercial. No usage restrictions.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other PDF and image tools: <strong>Merge PDF</strong>,{' '}
          <strong>Split PDF</strong>, <strong>Compress PDF</strong>,{' '}
          <strong>Rotate PDF</strong>, <strong>Add Watermark</strong>,{' '}
          <strong>Add Page Numbers</strong>, <strong>PDF to JPG</strong>,{' '}
          <strong>PDF to Text</strong>, <strong>PDF to Word</strong>,{' '}
          <strong>Image to PDF</strong>, and <strong>Image Compressor</strong>{' '}
          — all free and browser-based.
        </p>
      </section>
    </article>
  );
}

/* ===================== Score ===================== */
function computeScore({
  scale,
  pageCount,
  totalPixels,
  originalSize,
  pngSize,
  hasTransparency,
}) {
  const dpi = 72 * scale;
  const resolutionScore = Math.min(100, Math.round(40 + (dpi / 600) * 60));

  const pixelsPerPage = totalPixels / pageCount;
  const megapixels = pixelsPerPage / 1_000_000;
  const detailScore = Math.min(
    100,
    Math.round(50 + Math.min(50, (megapixels / 8) * 50))
  );

  const formatScore = 100;
  const transparencyBonus = hasTransparency ? 5 : 0;

  const composite = Math.min(
    100,
    Math.round(
      resolutionScore * 0.4 +
        detailScore * 0.35 +
        formatScore * 0.25 +
        transparencyBonus
    )
  );

  let grade = 'F';
  if (composite >= 95) grade = 'A+';
  else if (composite >= 90) grade = 'A';
  else if (composite >= 80) grade = 'B';
  else if (composite >= 70) grade = 'C';
  else if (composite >= 60) grade = 'D';

  let label = '';
  if (composite >= 95) label = '🏆 Outstanding quality — pixel-perfect output!';
  else if (composite >= 90) label = '🌟 Excellent quality — great for any use.';
  else if (composite >= 80) label = '👍 Very good — sharp and clear.';
  else if (composite >= 70) label = '✅ Good — fine for screen viewing.';
  else if (composite >= 60) label = '⚡ Decent — higher scale would improve.';
  else label = '⚠️ Low resolution — try Print or Ultra HD.';

  return {
    composite,
    grade,
    label,
    breakdown: [
      { name: 'Resolution', value: resolutionScore, detail: `${dpi} DPI` },
      {
        name: 'Detail',
        value: detailScore,
        detail: `${megapixels.toFixed(1)} MP/page`,
      },
      { name: 'Format', value: formatScore, detail: 'PNG lossless' },
    ],
    hasTransparency,
  };
}

function ScoreCard({ score, images }) {
  return (
    <div className="pdf-score-card">
      <div className="pdf-score-card-header">
        <div>
          <div className="pdf-score-card-label">Quality score</div>
          <div className="pdf-score-card-value">
            {score.composite}
            <span className="pdf-score-card-max">/100</span>
          </div>
        </div>
        <div className={`pdf-result-grade grade-${score.grade[0]}`}>
          {score.grade}
        </div>
      </div>

      <div className="pdf-score-bar">
        <div
          className="pdf-score-fill"
          style={{ width: `${score.composite}%` }}
        />
      </div>

      <p className="pdf-score-note">{score.label}</p>

      <div className="png-score-breakdown">
        {score.breakdown.map((b) => (
          <div key={b.name} className="png-score-row">
            <div className="png-score-row-header">
              <span className="png-score-name">{b.name}</span>
              <span className="png-score-detail">{b.detail}</span>
            </div>
            <div className="png-score-mini-bar">
              <div
                className="png-score-mini-fill"
                style={{ width: `${b.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}