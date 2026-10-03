import { useRef, useState } from 'react';
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
      </div>
    </ToolShell>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}