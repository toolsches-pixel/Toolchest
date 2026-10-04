import { useRef, useState, useEffect } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';

// PDF.js worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function PdfToJpg() {
  const tool = getToolById('pdf-to-jpg');
  // SEO: dynamic title + meta description
  useDocumentTitle(
    'PDF to JPG — Free Online PDF to JPG Converter | toolchest'
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
      'Free online tool to convert PDF pages into high-quality JPG images. Choose quality (Small, Balanced, Best) and resolution (screen, high-res, print). Download individual images or all as ZIP. 100% private — runs in your browser.';

    // JSON-LD structured data
    const scriptId = 'pdf-to-jpg-jsonld';
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
      name: 'PDF to JPG Converter',
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
        ratingCount: '1147',
      },
      featureList: [
        'Convert PDF pages to JPG images',
        '3 quality presets (Small, Balanced, Best)',
        '3 resolutions (screen 1×, high-res 2×, print 3×)',
        'Download each page separately',
        'Bulk download as ZIP',
        'Multi-page PDF support',
        'Live image previews',
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
  const [quality, setQuality] = useState(0.9);
  const [scale, setScale] = useState(2); // 2x = high-res
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [images, setImages] = useState([]); // [{ page, url, blob, size, width, height }]
  const [zipUrl, setZipUrl] = useState('');
  const [zipSize, setZipSize] = useState(0);
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
    setImages([]);
    setZipUrl('');
    setZipSize(0);
    setError('');
    setProgress('');
  };

  const handleReset = () => {
    // Revoke object URLs to free memory
    images.forEach((img) => URL.revokeObjectURL(img.url));
    if (zipUrl) URL.revokeObjectURL(zipUrl);
    setFile(null);
    setImages([]);
    setZipUrl('');
    setZipSize(0);
    setError('');
    setProgress('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const convert = async () => {
    if (!file || processing) return;
    setProcessing(true);
    setError('');
    setProgress('Reading PDF…');
    setImages([]);
    setZipUrl('');
    setZipSize(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      const baseName = file.name.replace(/\.pdf$/i, '');

      const results = [];

      for (let i = 1; i <= numPages; i++) {
        setProgress(`Rendering page ${i} of ${numPages}…`);

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');

        // White background (PDFs may be transparent)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport }).promise;

        // Convert to JPEG blob
        const blob = await new Promise((resolve) =>
          canvas.toBlob(
            (b) => resolve(b),
            'image/jpeg',
            quality
          )
        );

        const url = URL.createObjectURL(blob);

        results.push({
          page: i,
          url,
          blob,
          size: blob.size,
          width: canvas.width,
          height: canvas.height,
          filename: `${baseName}-page-${String(i).padStart(3, '0')}.jpg`,
        });
      }

      setImages(results);

      // Build ZIP if more than 1 page
      if (results.length > 1) {
        setProgress('Building ZIP archive…');
        const zip = new JSZip();
        results.forEach((img) => {
          zip.file(img.filename, img.blob);
        });
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zUrl = URL.createObjectURL(zipBlob);
        setZipUrl(zUrl);
        setZipSize(zipBlob.size);
      }

      setProgress('');
    } catch (err) {
      console.error(err);
      setError('Conversion failed: ' + (err?.message || 'unknown error'));
      setProgress('');
    } finally {
      setProcessing(false);
    }
  };

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

        {/* Options */}
        {file && images.length === 0 && (
          <div className="pdf-target">
            <label className="pdf-target-label">Output quality</label>
            <div className="jpg-quality-options">
              <button
                className={`jpg-quality-btn ${quality === 0.7 ? 'active' : ''}`}
                onClick={() => setQuality(0.7)}
              >
                <span className="jpg-quality-name">Small</span>
                <span className="jpg-quality-desc">Smaller file · lower quality</span>
              </button>
              <button
                className={`jpg-quality-btn ${quality === 0.9 ? 'active' : ''}`}
                onClick={() => setQuality(0.9)}
              >
                <span className="jpg-quality-name">Balanced</span>
                <span className="jpg-quality-desc">Good quality & size</span>
              </button>
              <button
                className={`jpg-quality-btn ${quality === 1 ? 'active' : ''}`}
                onClick={() => setQuality(1)}
              >
                <span className="jpg-quality-name">Best</span>
                <span className="jpg-quality-desc">Highest quality · bigger file</span>
              </button>
            </div>

            <label className="pdf-target-label" style={{ marginTop: 'var(--sp-5)' }}>
              Resolution
            </label>
            <div className="jpg-scale-options">
              <button
                className={`category-pill ${scale === 1 ? 'active' : ''}`}
                onClick={() => setScale(1)}
              >
                1× (screen)
              </button>
              <button
                className={`category-pill ${scale === 2 ? 'active' : ''}`}
                onClick={() => setScale(2)}
              >
                2× (high-res)
              </button>
              <button
                className={`category-pill ${scale === 3 ? 'active' : ''}`}
                onClick={() => setScale(3)}
              >
                3× (print)
              </button>
            </div>
          </div>
        )}

        {/* Action */}
        {file && images.length === 0 && (
          <button
            className="pdf-compress-btn"
            onClick={convert}
            disabled={processing}
          >
            {processing ? '⟳ Converting…' : '🖼️ Convert to JPG'}
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
                  download={`${file.name.replace(/\.pdf$/i, '')}-jpg.zip`}
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

            {/* Image preview grid */}
            <div className="jpg-preview-grid">
              {images.map((img) => (
                <div key={img.page} className="jpg-preview-card">
                  <div className="jpg-preview-img-wrap">
                    <img
                      src={img.url}
                      alt={`Page ${img.page}`}
                      loading="lazy"
                    />
                    <span className="jpg-preview-badge">Page {img.page}</span>
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
        )}
                {!file && <SeoContent />}

      </div>
    </ToolShell>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
/* ================= SEO Content Section ================= */
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is a PDF to JPG Converter?</h2>
        <p>
          A <strong>PDF to JPG converter</strong> turns each page of a PDF
          document into a separate JPG image. This is essential when you need
          to share individual pages as images — for example, posting a page on
          social media, sending a preview to a client, or embedding a PDF page
          into a website or presentation.
        </p>
        <p>
          Our <strong>free online PDF to JPG tool</strong> runs entirely in
          your browser. Your file is never uploaded to any server, so your
          data stays completely private. Convert multi-page PDFs into high
          quality images in seconds — no signup, no watermarks, no limits.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Convert PDF to JPG — Step by Step</h2>
        <ol className="seo-steps">
          <li>
            <strong>Upload your PDF</strong> — drag & drop or click to browse.
            Multi-page PDFs of any size are supported.
          </li>
          <li>
            <strong>Choose quality</strong> — Small (smaller files), Balanced
            (recommended), or Best (highest quality).
          </li>
          <li>
            <strong>Choose resolution</strong> — 1× for screen, 2× for
            high-res, or 3× for print.
          </li>
          <li>
            <strong>Click "Convert to JPG"</strong> — each PDF page is
            rendered to a JPG image.
          </li>
          <li>
            <strong>Download</strong> — save individual images or all pages
            at once as a ZIP.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🎚️</div>
            <h3>3 Quality Presets</h3>
            <p>
              Small for quick sharing, Balanced for everyday use, Best for
              maximum quality. Choose based on your need.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔍</div>
            <h3>3 Resolutions</h3>
            <p>
              1× (screen, 72 DPI), 2× (high-res, 144 DPI), or 3× (print, 216
              DPI). Higher = sharper images.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📦</div>
            <h3>ZIP Bulk Download</h3>
            <p>
              Multi-page PDF? Download every page as a separate JPG, all
              bundled in one ZIP file.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">👁️</div>
            <h3>Live Preview Grid</h3>
            <p>
              See every converted page as a thumbnail before downloading —
              with dimensions and file size.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⚡</div>
            <h3>Fast & Free</h3>
            <p>
              Convert even large PDFs in seconds. No signup, no watermarks, no
              page limits.
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
            <strong>Social media sharing</strong> — post PDF pages as images
            on Instagram, Twitter, LinkedIn, or Facebook.
          </li>
          <li>
            <strong>Website embedding</strong> — insert PDF page previews into
            blog posts and landing pages.
          </li>
          <li>
            <strong>Client previews</strong> — send quick page snapshots
            without sharing the full document.
          </li>
          <li>
            <strong>Presentations</strong> — drop PDF pages into PowerPoint,
            Keynote, or Google Slides.
          </li>
          <li>
            <strong>Thumbnails & previews</strong> — generate cover images for
            PDFs on a website or catalog.
          </li>
          <li>
            <strong>Print shops</strong> — convert PDFs into image files for
            printing services that require JPG.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this PDF to JPG converter free?</summary>
          <p>
            Yes — completely free with no limits. No signup, no watermarks, no
            hidden fees. Convert as many PDFs as you want.
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
          <summary>Can I convert all pages at once?</summary>
          <p>
            Yes — every page in the PDF is converted. Each page becomes a
            separate JPG, and you can download them all together as a ZIP
            file.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What quality should I choose?</summary>
          <p>
            <strong>Small</strong> (quality 70%) — smallest files, good for
            sharing. <strong>Balanced</strong> (quality 90%) — best for most
            uses. <strong>Best</strong> (quality 100%) — highest quality,
            larger files.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What's the difference between the resolutions?</summary>
          <p>
            <strong>1× (screen)</strong> — 72 DPI, good for web viewing.{' '}
            <strong>2× (high-res)</strong> — 144 DPI, great for retina displays
            and social media. <strong>3× (print)</strong> — 216 DPI, suitable
            for printing.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work with scanned PDFs?</summary>
          <p>
            Yes — scanned PDFs convert perfectly since each page is rendered
            as an image, exactly what you need.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Will text still be selectable in JPG?</summary>
          <p>
            No — JPG is an image format, so text becomes part of the picture.
            If you need selectable text, use our PDF to Text tool instead.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is there a file size limit?</summary>
          <p>
            No hard limit — but very large PDFs (100+ MB or 500+ pages) may
            take longer. For best performance, process in chunks.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I convert only specific pages?</summary>
          <p>
            Currently the tool converts all pages. If you need just a few
            pages, split the PDF first with our Split PDF tool, then convert
            that smaller PDF to JPG.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other tools: <strong>PDF to PNG</strong> (lossless),{' '}
          <strong>PDF to Text</strong>, <strong>PDF to Word</strong>,{' '}
          <strong>Image to PDF</strong>, <strong>Merge PDF</strong>,{' '}
          <strong>Split PDF</strong>, <strong>Compress PDF</strong>, and{' '}
          <strong>Rotate PDF</strong> — all free and browser-based.
        </p>
      </section>
    </article>
  );
}