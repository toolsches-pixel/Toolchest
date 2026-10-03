import { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';

export default function ImageToPdf() {
  const tool = getToolById('image-to-pdf');

  const [images, setImages] = useState([]); // [{ id, file, url, name, size, width, height }]
  const [pageSize, setPageSize] = useState('fit'); // 'fit' | 'a4' | 'letter'
  const [orientation, setOrientation] = useState('auto'); // 'auto' | 'portrait' | 'landscape'
  const [margin, setMargin] = useState(0); // in points (0, 20, 40)
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfSize, setPdfSize] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFilesAdd = async (fileList) => {
    const files = Array.from(fileList || []);
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError('Please select image files (JPG, PNG, WEBP).');
      return;
    }

    setError('');
    setPdfUrl('');
    setPdfSize(0);

    const loaded = await Promise.all(
      imageFiles.map(
        (f) =>
          new Promise((resolve) => {
            const url = URL.createObjectURL(f);
            const img = new Image();
            img.onload = () =>
              resolve({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                file: f,
                url,
                name: f.name,
                size: f.size,
                width: img.naturalWidth,
                height: img.naturalHeight,
              });
            img.onerror = () =>
              resolve({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                file: f,
                url,
                name: f.name,
                size: f.size,
                width: 0,
                height: 0,
              });
            img.src = url;
          })
      )
    );

    setImages((prev) => [...prev, ...loaded]);
  };

  const handleFileInput = (e) => {
    handleFilesAdd(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragging');
    handleFilesAdd(e.dataTransfer.files);
  };

  const removeImage = (id) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((i) => i.id !== id);
    });
    setPdfUrl('');
    setPdfSize(0);
  };

  const moveImage = (index, direction) => {
    setImages((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setPdfUrl('');
    setPdfSize(0);
  };

  const clearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.url));
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setImages([]);
    setPdfUrl('');
    setPdfSize(0);
    setError('');
    setProgress('');
  };

  const buildPdf = async () => {
    if (images.length === 0 || processing) return;
    setProcessing(true);
    setError('');
    setProgress('Building PDF…');
    setPdfUrl('');
    setPdfSize(0);

    try {
      let doc = null;

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        setProgress(`Adding image ${i + 1} of ${images.length}…`);

        // Determine page size in pt
        let pageW, pageH;

        if (pageSize === 'fit') {
          // Page exactly fits image
          pageW = img.width;
          pageH = img.height;
        } else if (pageSize === 'a4') {
          // A4 = 595.28 x 841.89 pt
          if (orientation === 'landscape') {
            pageW = 841.89;
            pageH = 595.28;
          } else {
            pageW = 595.28;
            pageH = 841.89;
          }
        } else if (pageSize === 'letter') {
          // Letter = 612 x 792 pt
          if (orientation === 'landscape') {
            pageW = 792;
            pageH = 612;
          } else {
            pageW = 612;
            pageH = 792;
          }
        }

        // For A4/Letter with auto orientation, pick based on image
        if (pageSize !== 'fit' && orientation === 'auto') {
          if (img.width > img.height) {
            // Landscape
            const tmp = pageW;
            pageW = Math.max(pageW, pageH);
            pageH = Math.min(tmp, pageH);
          }
        }

        if (!doc) {
          doc = new jsPDF({
            unit: 'pt',
            format: [pageW, pageH],
            orientation: pageW > pageH ? 'landscape' : 'portrait',
          });
        } else {
          doc.addPage([pageW, pageH], pageW > pageH ? 'landscape' : 'portrait');
        }

        // Compute image draw rect
        const availableW = pageW - margin * 2;
        const availableH = pageH - margin * 2;
        const imgRatio = img.width / img.height;
        const boxRatio = availableW / availableH;

        let drawW, drawH;
        if (imgRatio > boxRatio) {
          drawW = availableW;
          drawH = availableW / imgRatio;
        } else {
          drawH = availableH;
          drawW = availableH * imgRatio;
        }

        const x = (pageW - drawW) / 2;
        const y = (pageH - drawH) / 2;

        // Detect format from mime
        const fmt = img.file.type.includes('png')
          ? 'PNG'
          : img.file.type.includes('webp')
          ? 'WEBP'
          : 'JPEG';

        doc.addImage(img.url, fmt, x, y, drawW, drawH, undefined, 'FAST');
      }

      setProgress('Saving PDF…');
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfSize(blob.size);
      setProgress('');
    } catch (err) {
      console.error(err);
      setError('Failed to build PDF: ' + (err?.message || 'unknown error'));
      setProgress('');
    } finally {
      setProcessing(false);
    }
  };

  const totalSize = images.reduce((s, i) => s + i.size, 0);

  return (
    <ToolShell tool={tool}>
      <div className="pdf-tool">
        {/* Upload */}
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
          onDrop={handleDrop}
        >
          <div className="pdf-dropzone-icon">🖼️</div>
          <h3>Drop images here</h3>
          <p>or click to browse · JPG, PNG, WEBP · multiple files allowed</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
        </div>

        {/* Image list */}
        {images.length > 0 && (
          <div className="pdf-target">
            <div className="i2p-list-header">
              <label className="pdf-target-label" style={{ margin: 0 }}>
                {images.length} {images.length === 1 ? 'image' : 'images'} ·{' '}
                {formatBytes(totalSize)}
              </label>
              <button className="i2p-clear" onClick={clearAll}>
                Clear all
              </button>
            </div>

            <div className="i2p-list">
              {images.map((img, idx) => (
                <div key={img.id} className="i2p-item">
                  <span className="i2p-index">{idx + 1}</span>
                  <img
                    src={img.url}
                    alt={img.name}
                    className="i2p-thumb"
                    loading="lazy"
                  />
                  <div className="i2p-meta">
                    <div className="i2p-name" title={img.name}>
                      {img.name}
                    </div>
                    <div className="i2p-sub">
                      {img.width} × {img.height} · {formatBytes(img.size)}
                    </div>
                  </div>
                  <div className="i2p-controls">
                    <button
                      className="i2p-icon-btn"
                      onClick={() => moveImage(idx, -1)}
                      disabled={idx === 0}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      className="i2p-icon-btn"
                      onClick={() => moveImage(idx, 1)}
                      disabled={idx === images.length - 1}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      className="i2p-icon-btn i2p-remove"
                      onClick={() => removeImage(img.id)}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Options */}
        {images.length > 0 && (
          <div className="pdf-target">
            <label className="pdf-target-label">Page size</label>
            <div className="jpg-scale-options" style={{ marginBottom: 'var(--sp-4)' }}>
              <button
                className={`category-pill ${pageSize === 'fit' ? 'active' : ''}`}
                onClick={() => setPageSize('fit')}
                title="Page will be exactly the size of each image"
              >
                Fit to image
              </button>
              <button
                className={`category-pill ${pageSize === 'a4' ? 'active' : ''}`}
                onClick={() => setPageSize('a4')}
              >
                A4
              </button>
              <button
                className={`category-pill ${pageSize === 'letter' ? 'active' : ''}`}
                onClick={() => setPageSize('letter')}
              >
                Letter
              </button>
            </div>

            {pageSize !== 'fit' && (
              <>
                <label className="pdf-target-label">Orientation</label>
                <div className="jpg-scale-options" style={{ marginBottom: 'var(--sp-4)' }}>
                  <button
                    className={`category-pill ${orientation === 'auto' ? 'active' : ''}`}
                    onClick={() => setOrientation('auto')}
                  >
                    Auto
                  </button>
                  <button
                    className={`category-pill ${orientation === 'portrait' ? 'active' : ''}`}
                    onClick={() => setOrientation('portrait')}
                  >
                    Portrait
                  </button>
                  <button
                    className={`category-pill ${orientation === 'landscape' ? 'active' : ''}`}
                    onClick={() => setOrientation('landscape')}
                  >
                    Landscape
                  </button>
                </div>
              </>
            )}

            <label className="pdf-target-label">Margin</label>
            <div className="jpg-scale-options">
              <button
                className={`category-pill ${margin === 0 ? 'active' : ''}`}
                onClick={() => setMargin(0)}
              >
                None
              </button>
              <button
                className={`category-pill ${margin === 20 ? 'active' : ''}`}
                onClick={() => setMargin(20)}
              >
                Small
              </button>
              <button
                className={`category-pill ${margin === 40 ? 'active' : ''}`}
                onClick={() => setMargin(40)}
              >
                Medium
              </button>
            </div>
          </div>
        )}

        {/* Action */}
        {images.length > 0 && !pdfUrl && (
          <button
            className="pdf-compress-btn"
            onClick={buildPdf}
            disabled={processing}
          >
            {processing ? '⟳ Building PDF…' : '📄 Create PDF'}
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
        {pdfUrl && (
          <div className="pdf-result">
            <div className="pdf-result-header">
              <h3>✅ PDF ready</h3>
            </div>

            <div className="pdf-result-grid">
              <div className="pdf-stat">
                <div className="pdf-stat-label">Images</div>
                <div className="pdf-stat-value">{images.length}</div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">PDF size</div>
                <div className="pdf-stat-value accent">
                  {formatBytes(pdfSize)}
                </div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Page size</div>
                <div className="pdf-stat-value">
                  {pageSize === 'fit'
                    ? 'Fit'
                    : pageSize === 'a4'
                    ? 'A4'
                    : 'Letter'}
                </div>
              </div>
              <div className="pdf-stat">
                <div className="pdf-stat-label">Input</div>
                <div className="pdf-stat-value">{formatBytes(totalSize)}</div>
              </div>
            </div>

            <div className="pdf-result-actions">
              <a
                href={pdfUrl}
                download="converted-images.pdf"
                className="pdf-download"
              >
                ⬇ Download PDF ({formatBytes(pdfSize)})
              </a>
              <button className="btn-secondary" onClick={clearAll}>
                Start over
              </button>
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