import { useRef, useState } from 'react';
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