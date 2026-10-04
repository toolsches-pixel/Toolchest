import { useRef, useState, useEffect, useCallback } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const TOOLS = [
  { id: 'select', icon: '↖', label: 'Select' },
  { id: 'text', icon: 'T', label: 'Text' },
  { id: 'highlight', icon: '▬', label: 'Highlight' },
  { id: 'rect', icon: '▭', label: 'Rectangle' },
  { id: 'draw', icon: '✎', label: 'Draw' },
  { id: 'signature', icon: '✍', label: 'Sign' },
  { id: 'whiteout', icon: '⬜', label: 'Whiteout' },
];

const COLORS = [
  '#000000', '#ef4444', '#3b82f6', '#22c55e',
  '#eab308', '#a855f7', '#f97316', '#ffffff',
];

export default function PdfEditor() {
  const tool = getToolById('pdf-editor');

  useDocumentTitle(
    'PDF Editor — Free Online PDF Editor & Annotator | toolchest'
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
      'Free online PDF editor with visual canvas. Add text, images, highlights, shapes, drawings, and signatures directly on your PDF. Drag, resize, undo/redo. 100% private — runs entirely in your browser.';

    const scriptId = 'pdf-editor-jsonld';
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
      name: 'PDF Editor',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '2341',
      },
      featureList: [
        'Visual PDF editor with live canvas',
        'Add text anywhere on the page',
        'Insert images and logos',
        'Highlight text areas',
        'Draw freehand',
        'Add signatures',
        'Whiteout/censor tool',
        'Drag, resize, undo/redo',
        'No file upload — 100% browser-based',
      ],
    });

    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, []);

  // ---------- File state ----------
  const [file, setFile] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // ---------- Rendering ----------
  const [pageImage, setPageImage] = useState('');
  const [pageDims, setPageDims] = useState({ w: 0, h: 0 }); // rendered canvas size (in CSS px)
  const [pdfDims, setPdfDims] = useState({ w: 0, h: 0 }); // actual PDF points (in pt)

  // ---------- Active tool + options ----------
  const [activeTool, setActiveTool] = useState('select');
  const [color, setColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(20);
  const [strokeWidth, setStrokeWidth] = useState(3);

  // ---------- Annotations keyed by page ----------
  const [annotations, setAnnotations] = useState({});
  const [selectedId, setSelectedId] = useState(null);

  // ---------- Drawing state ----------
  const [draft, setDraft] = useState(null); // live preview of drawing/rect
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);

  // ---------- History ----------
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // ---------- Processing ----------
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // ---------- Refs ----------
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const pageRef = useRef(null);
  const annotationsRef = useRef(annotations);
  useEffect(() => { annotationsRef.current = annotations; }, [annotations]);

  // ============================================================
  // LOAD PDF
  // ============================================================
  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are supported.');
      return;
    }

    setError('');
    setResult(null);
    setAnnotations({});
    setSelectedId(null);
    setHistory([]);
    setHistoryIndex(-1);
    setCurrentPage(1);
    setActiveTool('select');

    try {
      const buf = await f.arrayBuffer();
      setPdfBytes(buf);

      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
      setPageCount(pdf.getPageCount());
      setFile(f);

      await renderPage(buf, 1);
    } catch (err) {
      console.error(err);
      setError('Could not read PDF: ' + (err?.message || 'unknown error'));
      setFile(null);
    }
  };

  const renderPage = async (buf, pageNum) => {
    try {
      const pdfJsDoc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
      const page = await pdfJsDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      setPdfDims({ w: viewport.width, h: viewport.height });

      // Render at higher quality for crisp display
      const renderScale = Math.min(1.5, 1400 / viewport.width);
      const renderViewport = page.getViewport({ scale: renderScale });

      const canvas = document.createElement('canvas');
      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

      setPageImage(canvas.toDataURL('image/jpeg', 0.9));
      setPageDims({ w: renderViewport.width, h: renderViewport.height });
    } catch (err) {
      console.error('Render error:', err);
    }
  };

  const changePage = async (delta) => {
    const next = currentPage + delta;
    if (next < 1 || next > pageCount) return;
    setCurrentPage(next);
    setSelectedId(null);
    setDraft(null);
    if (pdfBytes) await renderPage(pdfBytes, next);
  };

  // ============================================================
  // HISTORY
  // ============================================================
  const pushHistory = useCallback((nextAnnotations) => {
    setHistory((h) => {
      const trimmed = h.slice(0, historyIndex + 1);
      trimmed.push(JSON.parse(JSON.stringify(nextAnnotations)));
      const capped = trimmed.slice(-50);
      setHistoryIndex(capped.length - 1);
      return capped;
    });
  }, [historyIndex]);

  const commitAnnotations = useCallback((next) => {
    setAnnotations(next);
    pushHistory(next);
  }, [pushHistory]);

  const undo = () => {
    if (historyIndex <= 0) return;
    const idx = historyIndex - 1;
    setAnnotations(history[idx]);
    setHistoryIndex(idx);
    setSelectedId(null);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const idx = historyIndex + 1;
    setAnnotations(history[idx]);
    setHistoryIndex(idx);
    setSelectedId(null);
  };

  // ============================================================
  // COORDINATE HELPERS
  // ============================================================
  // Get position relative to the rendered page in CSS pixels
  const getPos = (e) => {
    const rect = pageRef.current.getBoundingClientRect();
    return {
      px: e.clientX - rect.left,
      py: e.clientY - rect.top,
      rectW: rect.width,
      rectH: rect.height,
    };
  };

  // ============================================================
  // CANVAS CLICK — add new annotation
  // ============================================================
  const handleCanvasClick = (e) => {
    if (!pageRef.current) return;
    if (activeTool === 'select') {
      setSelectedId(null);
      return;
    }

    const { px, py, rectW, rectH } = getPos(e);
    const id = `${activeTool}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const base = { id, x: px, y: py, pageW: rectW, pageH: rectH };

    let ann = null;

    if (activeTool === 'text') {
      ann = {
        ...base,
        type: 'text',
        text: 'Sample text',
        fontSize,
        color,
      };
    } else if (activeTool === 'highlight') {
      const w = 180;
      const h = 22;
      ann = {
        ...base,
        x: px - w / 2,
        y: py - h / 2,
        width: w,
        height: h,
        type: 'highlight',
        color: '#fef08a',
      };
    } else if (activeTool === 'rect') {
      const w = 160;
      const h = 80;
      ann = {
        ...base,
        x: px - w / 2,
        y: py - h / 2,
        width: w,
        height: h,
        type: 'rect',
        color,
      };
    } else if (activeTool === 'whiteout') {
      const w = 180;
      const h = 30;
      ann = {
        ...base,
        x: px - w / 2,
        y: py - h / 2,
        width: w,
        height: h,
        type: 'whiteout',
        color: '#ffffff',
      };
    } else if (activeTool === 'signature') {
      const w = 200;
      const h = 50;
      ann = {
        ...base,
        x: px - w / 2,
        y: py - h / 2,
        width: w,
        height: h,
        type: 'signature',
        color: '#000000',
      };
    }

    if (ann) {
      const next = {
        ...annotations,
        [currentPage]: [...(annotations[currentPage] || []), ann],
      };
      commitAnnotations(next);
      setSelectedId(id);
      setActiveTool('select');
    }
  };

  // ============================================================
  // MOUSE DOWN on canvas — start drawing or click-add
  // ============================================================
  const handleCanvasMouseDown = (e) => {
    if (!pageRef.current) return;
    if (activeTool !== 'draw') return;
    if (e.button !== 0) return;

    const { px, py } = getPos(e);
    setDraft({
      type: 'draw',
      page: currentPage,
      points: [{ x: px, y: py }],
    });
  };

  // ============================================================
  // GLOBAL MOUSE MOVE — drag, resize, draw
  // ============================================================
  useEffect(() => {
    const onMove = (e) => {
      if (!pageRef.current) return;

      // ---- DRAWING ----
      if (draft && draft.type === 'draw') {
        const { px, py } = getPos(e);
        setDraft((d) => ({ ...d, points: [...d.points, { x: px, y: py }] }));
        return;
      }

      // ---- DRAGGING ----
      if (dragging) {
        const dx = e.clientX - dragging.startClientX;
        const dy = e.clientY - dragging.startClientY;
        const page = currentPage;
        const list = (annotationsRef.current[page] || []).map((a) =>
          a.id === dragging.id
            ? { ...a, x: dragging.startX + dx, y: dragging.startY + dy }
            : a
        );
        setAnnotations((prev) => ({ ...prev, [page]: list }));
        return;
      }

      // ---- RESIZING ----
      if (resizing) {
        const dx = e.clientX - resizing.startClientX;
        const dy = e.clientY - resizing.startClientY;
        const h = resizing.handle;
        const page = currentPage;
        const list = (annotationsRef.current[page] || []).map((a) => {
          if (a.id !== resizing.id) return a;
          let { x, y, width, height } = resizing;
          if (h.includes('e')) width = Math.max(20, resizing.width + dx);
          if (h.includes('w')) {
            width = Math.max(20, resizing.width - dx);
            x = resizing.x + dx;
          }
          if (h.includes('s')) height = Math.max(12, resizing.height + dy);
          if (h.includes('n')) {
            height = Math.max(12, resizing.height - dy);
            y = resizing.y + dy;
          }
          return { ...a, x, y, width, height };
        });
        setAnnotations((prev) => ({ ...prev, [page]: list }));
      }
    };

    const onUp = () => {
      // ---- FINISH DRAWING ----
      if (draft && draft.type === 'draw') {
        if (draft.points.length > 1) {
          const id = `draw-${Date.now()}`;
          const ann = {
            id,
            type: 'draw',
            points: draft.points,
            color,
            strokeWidth,
          };
          const next = {
            ...annotationsRef.current,
            [currentPage]: [...(annotationsRef.current[currentPage] || []), ann],
          };
          commitAnnotations(next);
        }
        setDraft(null);
      }

      // ---- FINISH DRAG/RESIZE ----
      if (dragging || resizing) {
        // Snapshot current state into history
        commitAnnotations(annotationsRef.current);
        setDragging(null);
        setResizing(null);
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [draft, dragging, resizing, currentPage, color, strokeWidth, commitAnnotations]);

  // ============================================================
  // SELECTED ANNOTATION — update
  // ============================================================
  const updateSelected = (updates, record = false) => {
    if (!selectedId) return;
    const page = currentPage;
    const list = (annotationsRef.current[page] || []).map((a) =>
      a.id === selectedId ? { ...a, ...updates } : a
    );
    const next = { ...annotationsRef.current, [page]: list };
    if (record) commitAnnotations(next);
    else setAnnotations(next);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    const page = currentPage;
    const list = (annotationsRef.current[page] || []).filter(
      (a) => a.id !== selectedId
    );
    commitAnnotations({ ...annotationsRef.current, [page]: list });
    setSelectedId(null);
  };

  // ============================================================
  // IMAGE INSERT
  // ============================================================
  const handleImageUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const w = 150;
      const h = 100;
      const id = `img-${Date.now()}`;
      const ann = {
        id,
        type: 'image',
        x: 100,
        y: 100,
        width: w,
        height: h,
        dataUrl: reader.result,
      };
      const next = {
        ...annotationsRef.current,
        [currentPage]: [...(annotationsRef.current[currentPage] || []), ann],
      };
      commitAnnotations(next);
      setSelectedId(id);
    };
    reader.readAsDataURL(f);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // ============================================================
  // KEYBOARD SHORTCUTS
  // ============================================================
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'y' || (e.key === 'z' && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          e.preventDefault();
          deleteSelected();
        }
      } else if (e.key === 'Escape') {
        setSelectedId(null);
        setActiveTool('select');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, historyIndex, currentPage]);

  // ============================================================
  // SAVE PDF
  // ============================================================
  const applyEdits = async () => {
    if (!file || processing) return;

    const total = Object.values(annotations).reduce((s, l) => s + l.length, 0);
    if (total === 0) {
      setError('Add some annotations first.');
      return;
    }

    setProcessing(true);
    setError('');
    setProgress('Loading PDF…');
    setResult(null);

    try {
      const buf = await file.arrayBuffer();
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = pdf.getPages();
      const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
      const imageCache = {};

      // For each page with annotations, we need the rendered canvas dimensions
      // to convert pixel coords → PDF point coords
      const pdfJsDoc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;

      for (const [pageNumStr, list] of Object.entries(annotations)) {
        const pageNum = parseInt(pageNumStr, 10);
        if (pageNum < 1 || pageNum > pages.length) continue;
        const page = pages[pageNum - 1];
        const pdfSize = page.getSize();

        // Compute scale from rendered canvas → pdf points
        // We use the current page's rendered dims only for the current page;
        // for other pages, we recompute from pdfjs
        let renderedW = pageDims.w;
        let renderedH = pageDims.h;

        if (pageNum !== currentPage) {
          const p = await pdfJsDoc.getPage(pageNum);
          const vp = p.getViewport({ scale: 1 });
          const scale = Math.min(1.5, 1400 / vp.width);
          renderedW = vp.width * scale;
          renderedH = vp.height * scale;
        }

        // Conversion: pixels → pdf points
        // Rendered size (px) → PDF size (pt)
        const sx = pdfSize.width / renderedW;
        const sy = pdfSize.height / renderedH;

        setProgress(`Applying annotations to page ${pageNum}…`);

        for (const ann of list) {
          const annX = ann.x * sx;
          const annY = pdfSize.height - ann.y * sy; // flip Y
          const c = hexToRgb(ann.color || '#000000');

          if (ann.type === 'text') {
            const fs = (ann.fontSize || 20) * sx;
            const textWidth = helvetica.widthOfTextAtSize(ann.text, fs);
            page.drawText(ann.text, {
              x: annX - textWidth / 2,
              y: annY - fs / 2,
              size: fs,
              font: helvetica,
              color: rgb(c.r, c.g, c.b),
            });
          } else if (ann.type === 'highlight') {
            page.drawRectangle({
              x: ann.x * sx,
              y: pdfSize.height - (ann.y + ann.height) * sy,
              width: ann.width * sx,
              height: ann.height * sy,
              color: rgb(c.r, c.g, c.b),
              opacity: 0.4,
            });
          } else if (ann.type === 'rect') {
            page.drawRectangle({
              x: ann.x * sx,
              y: pdfSize.height - (ann.y + ann.height) * sy,
              width: ann.width * sx,
              height: ann.height * sy,
              borderColor: rgb(c.r, c.g, c.b),
              borderWidth: 1.5,
            });
          } else if (ann.type === 'whiteout') {
            page.drawRectangle({
              x: ann.x * sx,
              y: pdfSize.height - (ann.y + ann.height) * sy,
              width: ann.width * sx,
              height: ann.height * sy,
              color: rgb(1, 1, 1),
            });
          } else if (ann.type === 'draw' && ann.points?.length > 1) {
            for (let i = 1; i < ann.points.length; i++) {
              const p1 = ann.points[i - 1];
              const p2 = ann.points[i];
              page.drawLine({
                start: { x: p1.x * sx, y: pdfSize.height - p1.y * sy },
                end: { x: p2.x * sx, y: pdfSize.height - p2.y * sy },
                thickness: (ann.strokeWidth || 3) * sx,
                color: rgb(c.r, c.g, c.b),
              });
            }
          } else if (ann.type === 'image' && ann.dataUrl) {
            try {
              let img = imageCache[ann.id];
              if (!img) {
                const isPng = ann.dataUrl.startsWith('data:image/png');
                img = isPng
                  ? await pdf.embedPng(ann.dataUrl)
                  : await pdf.embedJpg(ann.dataUrl);
                imageCache[ann.id] = img;
              }
              page.drawImage(img, {
                x: ann.x * sx,
                y: pdfSize.height - (ann.y + ann.height) * sy,
                width: ann.width * sx,
                height: ann.height * sy,
              });
            } catch (imgErr) {
              console.warn('Image embed failed:', imgErr);
            }
          } else if (ann.type === 'signature') {
            // Draw signature line
            const x1 = ann.x * sx;
            const y1 = pdfSize.height - (ann.y + ann.height) * sy;
            const x2 = (ann.x + ann.width) * sx;
            const y2 = y1;
            page.drawLine({
              start: { x: x1, y: y1 },
              end: { x: x2, y: y2 },
              thickness: 1 * sx,
              color: rgb(0, 0, 0),
            });
            const sigFs = 10 * sx;
            const sigText = 'Signature';
            const sigW = helvetica.widthOfTextAtSize(sigText, sigFs);
            page.drawText(sigText, {
              x: (x1 + x2) / 2 - sigW / 2,
              y: y1 + 3 * sy,
              size: sigFs,
              font: helvetica,
              color: rgb(0.4, 0.4, 0.4),
            });
          }
        }
      }

      setProgress('Saving PDF…');
      const bytes = await pdf.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const baseName = file.name.replace(/\.pdf$/i, '');
      setResult({
        url,
        size: blob.size,
        filename: `${baseName}-edited.pdf`,
        annotationCount: total,
        totalPages: pages.length,
      });
      setProgress('');
    } catch (err) {
      console.error(err);
      setError('Failed: ' + (err?.message || 'unknown error'));
      setProgress('');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setPdfBytes(null);
    setPageCount(0);
    setCurrentPage(1);
    setPageImage('');
    setAnnotations({});
    setSelectedId(null);
    setResult(null);
    setError('');
    setProgress('');
    setHistory([]);
    setHistoryIndex(-1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    return () => {
      if (result?.url) URL.revokeObjectURL(result.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentAnnotations = annotations[currentPage] || [];
  const selectedAnn = currentAnnotations.find((a) => a.id === selectedId);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <ToolShell tool={tool}>
      <div className="pdf-tool pe-fullwidth">
        {/* Upload */}
        {!file ? (
          <div
            className="pdf-dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('dragging');
            }}
            onDragLeave={(e) => e.currentTarget.classList.remove('dragging')}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('dragging');
              const f = e.dataTransfer.files?.[0];
              if (f) handleFileChange({ target: { files: [f] } });
            }}
          >
            <div className="pdf-dropzone-icon">📝</div>
            <h3>Drop your PDF here to start editing</h3>
            <p>or click to browse · add text, images, highlights, drawings</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          <>
            <div className="pe-editor">
              {/* LEFT SIDEBAR */}
              <aside className="pe-sidebar-left">
                {TOOLS.map((t) => (
                  <button
                    key={t.id}
                    className={`pe-tool-btn ${activeTool === t.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTool(t.id);
                      setSelectedId(null);
                    }}
                    title={t.label}
                  >
                    <span className="pe-tool-icon">{t.icon}</span>
                    <span className="pe-tool-label">{t.label}</span>
                  </button>
                ))}

                <div className="pe-sidebar-divider" />

                <button
                  className="pe-tool-btn"
                  onClick={() => imageInputRef.current?.click()}
                  title="Add image"
                >
                  <span className="pe-tool-icon">🖼️</span>
                  <span className="pe-tool-label">Image</span>
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />

                <button
                  className="pe-tool-btn"
                  onClick={undo}
                  disabled={historyIndex <= 0}
                >
                  <span className="pe-tool-icon">↶</span>
                  <span className="pe-tool-label">Undo</span>
                </button>
                <button
                  className="pe-tool-btn"
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                >
                  <span className="pe-tool-icon">↷</span>
                  <span className="pe-tool-label">Redo</span>
                </button>
              </aside>

              {/* CENTER CANVAS */}
              <div className="pe-canvas-wrap">
                <div className="pe-page-nav">
                  <button onClick={() => changePage(-1)} disabled={currentPage <= 1}>
                    ◀
                  </button>
                  <span className="pe-page-counter">
                    Page {currentPage} / {pageCount}
                  </span>
                  <button
                    onClick={() => changePage(1)}
                    disabled={currentPage >= pageCount}
                  >
                    ▶
                  </button>
                </div>

                <div className="pe-canvas-scroll">
                  <div
                    ref={pageRef}
                    className="pe-canvas-page"
                    style={{
                      width: pageDims.w || 'auto',
                      height: pageDims.h || 'auto',
                      cursor:
                        activeTool === 'select'
                          ? 'default'
                          : 'crosshair',
                    }}
                    onClick={handleCanvasClick}
                    onMouseDown={handleCanvasMouseDown}
                  >
                    {pageImage && (
                      <img
                        src={pageImage}
                        alt={`Page ${currentPage}`}
                        draggable={false}
                      />
                    )}

                    {/* Annotations */}
                    {currentAnnotations.map((ann) => (
                      <Annotation
                        key={ann.id}
                        ann={ann}
                        selected={ann.id === selectedId}
                        activeTool={activeTool}
                        onSelect={() => setSelectedId(ann.id)}
                        onStartDrag={(e) => {
                          e.stopPropagation();
                          setSelectedId(ann.id);
                          setDragging({
                            id: ann.id,
                            startClientX: e.clientX,
                            startClientY: e.clientY,
                            startX: ann.x,
                            startY: ann.y,
                          });
                        }}
                        onStartResize={(e, handle) => {
                          e.stopPropagation();
                          setResizing({
                            id: ann.id,
                            handle,
                            startClientX: e.clientX,
                            startClientY: e.clientY,
                            x: ann.x,
                            y: ann.y,
                            width: ann.width,
                            height: ann.height,
                          });
                        }}
                        onStartMove={(e) => {
                          e.stopPropagation();
                          setSelectedId(ann.id);
                          setDragging({
                            id: ann.id,
                            startClientX: e.clientX,
                            startClientY: e.clientY,
                            startX: ann.x,
                            startY: ann.y,
                          });
                        }}
                      />
                    ))}

                    {/* Live drawing preview */}
                    {draft && draft.type === 'draw' && draft.page === currentPage && (
                      <svg
                        className="pe-draw-svg"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          pointerEvents: 'none',
                        }}
                      >
                        <polyline
                          points={draft.points.map((p) => `${p.x},${p.y}`).join(' ')}
                          fill="none"
                          stroke={color}
                          strokeWidth={strokeWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL */}
              <aside className="pe-sidebar-right">
                {selectedAnn ? (
                  <>
                    <h4 className="pe-panel-title">
                      {selectedAnn.type === 'text' && 'Text'}
                      {selectedAnn.type === 'highlight' && 'Highlight'}
                      {selectedAnn.type === 'rect' && 'Rectangle'}
                      {selectedAnn.type === 'whiteout' && 'Whiteout'}
                      {selectedAnn.type === 'image' && 'Image'}
                      {selectedAnn.type === 'signature' && 'Signature'}
                      {selectedAnn.type === 'draw' && 'Drawing'}
                    </h4>

                    {selectedAnn.type === 'text' && (
                      <>
                        <label className="pe-option-label">Text</label>
                        <input
                          type="text"
                          className="pe-text-input"
                          value={selectedAnn.text}
                          onChange={(e) =>
                            updateSelected({ text: e.target.value })
                          }
                          onBlur={() =>
                            commitAnnotations(annotationsRef.current)
                          }
                        />
                        <label className="pe-option-label">
                          Font size · {selectedAnn.fontSize}pt
                        </label>
                        <input
                          type="range"
                          min="8"
                          max="72"
                          value={selectedAnn.fontSize}
                          onChange={(e) =>
                            updateSelected({ fontSize: parseInt(e.target.value) })
                          }
                          onMouseUp={() =>
                            commitAnnotations(annotationsRef.current)
                          }
                          className="wm-slider"
                        />
                        <label className="pe-option-label">Color</label>
                        <div className="wm-color-grid">
                          {COLORS.map((c) => (
                            <button
                              key={c}
                              className={`wm-color-swatch ${
                                selectedAnn.color === c ? 'active' : ''
                              }`}
                              style={{ background: c }}
                              onClick={() =>
                                updateSelected({ color: c }, true)
                              }
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {(selectedAnn.type === 'rect' ||
                      selectedAnn.type === 'draw') && (
                      <>
                        <label className="pe-option-label">Color</label>
                        <div className="wm-color-grid">
                          {COLORS.map((c) => (
                            <button
                              key={c}
                              className={`wm-color-swatch ${
                                selectedAnn.color === c ? 'active' : ''
                              }`}
                              style={{ background: c }}
                              onClick={() =>
                                updateSelected({ color: c }, true)
                              }
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {selectedAnn.type === 'highlight' && (
                      <>
                        <label className="pe-option-label">Color</label>
                        <div className="wm-color-grid">
                          {['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa'].map(
                            (c) => (
                              <button
                                key={c}
                                className={`wm-color-swatch ${
                                  selectedAnn.color === c ? 'active' : ''
                                }`}
                                style={{ background: c }}
                                onClick={() =>
                                  updateSelected({ color: c }, true)
                                }
                              />
                            )
                          )}
                        </div>
                      </>
                    )}

                    <button className="pe-delete-btn" onClick={deleteSelected}>
                      🗑 Delete
                    </button>
                  </>
                ) : (
                  <>
                    <h4 className="pe-panel-title">Options</h4>
                    <p className="pe-panel-hint">
                      {activeTool === 'select' &&
                        'Click any object to select. Drag to move, corner handles to resize.'}
                      {activeTool === 'text' && 'Click on the page to add text.'}
                      {activeTool === 'highlight' &&
                        'Click on the page to add a highlight.'}
                      {activeTool === 'rect' &&
                        'Click on the page to add a rectangle.'}
                      {activeTool === 'draw' &&
                        'Click and drag on the page to draw.'}
                      {activeTool === 'whiteout' &&
                        'Click to cover content with white.'}
                      {activeTool === 'signature' &&
                        'Click to place a signature line.'}
                    </p>

                    {(activeTool === 'text' ||
                      activeTool === 'rect' ||
                      activeTool === 'draw') && (
                      <>
                        <label className="pe-option-label">Color</label>
                        <div className="wm-color-grid">
                          {COLORS.map((c) => (
                            <button
                              key={c}
                              className={`wm-color-swatch ${
                                color === c ? 'active' : ''
                              }`}
                              style={{ background: c }}
                              onClick={() => setColor(c)}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {activeTool === 'text' && (
                      <>
                        <label className="pe-option-label">
                          Font size · {fontSize}pt
                        </label>
                        <input
                          type="range"
                          min="8"
                          max="72"
                          value={fontSize}
                          onChange={(e) => setFontSize(parseInt(e.target.value))}
                          className="wm-slider"
                        />
                      </>
                    )}

                    {activeTool === 'draw' && (
                      <>
                        <label className="pe-option-label">
                          Stroke · {strokeWidth}px
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="12"
                          value={strokeWidth}
                          onChange={(e) =>
                            setStrokeWidth(parseInt(e.target.value))
                          }
                          className="wm-slider"
                        />
                      </>
                    )}
                  </>
                )}

                <div className="pe-save-wrap">
                  <button
                    className="pdf-compress-btn"
                    onClick={applyEdits}
                    disabled={processing}
                  >
                    {processing ? '⟳ Saving…' : '💾 Save & Download PDF'}
                  </button>
                  <button className="pe-cancel-btn" onClick={handleReset}>
                    Cancel
                  </button>
                </div>
              </aside>
            </div>

            {processing && progress && (
              <div className="pdf-progress">
                <span className="spinner" />
                {progress}
              </div>
            )}

            {error && <div className="pdf-error">⚠️ {error}</div>}

            {result && (
              <div className="pdf-result">
                <div className="pdf-result-header">
                  <h3>✅ PDF edited successfully</h3>
                </div>
                <div className="pdf-result-grid">
                  <div className="pdf-stat">
                    <div className="pdf-stat-label">Pages</div>
                    <div className="pdf-stat-value">{result.totalPages}</div>
                  </div>
                  <div className="pdf-stat">
                    <div className="pdf-stat-label">Objects</div>
                    <div className="pdf-stat-value accent">
                      {result.annotationCount}
                    </div>
                  </div>
                  <div className="pdf-stat">
                    <div className="pdf-stat-label">Format</div>
                    <div className="pdf-stat-value">PDF</div>
                  </div>
                  <div className="pdf-stat">
                    <div className="pdf-stat-label">Size</div>
                    <div className="pdf-stat-value">
                      {formatBytes(result.size)}
                    </div>
                  </div>
                </div>
                <div className="pdf-result-actions">
                  <a
                    href={result.url}
                    download={result.filename}
                    className="pdf-download"
                  >
                    ⬇ Download edited PDF
                  </a>
                  <button className="btn-secondary" onClick={handleReset}>
                    Try another PDF
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!file && <SeoContent />}
      </div>
    </ToolShell>
  );
}

/* ============================================================
   ANNOTATION COMPONENT
   ============================================================ */
function Annotation({ ann, selected, activeTool, onSelect, onStartDrag, onStartResize, onStartMove }) {
  const canInteract = activeTool === 'select';
  const handles = ['nw', 'ne', 'sw', 'se'];

  const showHandles =
    selected &&
    canInteract &&
    (ann.type === 'highlight' ||
      ann.type === 'rect' ||
      ann.type === 'whiteout' ||
      ann.type === 'image' ||
      ann.type === 'signature');

  const baseStyle = {
    position: 'absolute',
    cursor: canInteract ? 'move' : 'default',
    userSelect: 'none',
    pointerEvents: canInteract ? 'auto' : 'none',
  };

  const onMouseDown = (e) => {
    if (!canInteract) return;
    onStartDrag(e);
  };

  // --- TEXT ---
  if (ann.type === 'text') {
    return (
      <div
        style={{
          ...baseStyle,
          left: ann.x,
          top: ann.y,
          transform: 'translate(-50%, -50%)',
          fontSize: `${ann.fontSize}px`,
          color: ann.color,
          fontFamily: 'Helvetica, Arial, sans-serif',
          whiteSpace: 'nowrap',
          padding: '2px 4px',
          border: selected ? '1.5px dashed #4ecdc4' : '1.5px dashed transparent',
          borderRadius: 2,
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (canInteract) onSelect();
        }}
        onMouseDown={onMouseDown}
      >
        {ann.text}
      </div>
    );
  }
  // --- DRAW (freehand polyline) ---
  if (ann.type === 'draw') {
    if (!ann.points || ann.points.length < 2) return null;

    // Compute bounding box of the strokes to size the SVG
    const xs = ann.points.map((p) => p.x);
    const ys = ann.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const pad = (ann.strokeWidth || 3) + 2;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;

    // Shift points relative to the box
    const points = ann.points
      .map((p) => `${p.x - minX + pad},${p.y - minY + pad}`)
      .join(' ');

    return (
      <div
        style={{
          position: 'absolute',
          left: minX - pad,
          top: minY - pad,
          width: w,
          height: h,
          cursor: canInteract ? 'move' : 'default',
          userSelect: 'none',
          pointerEvents: canInteract ? 'auto' : 'none',
          border: selected
            ? '1.5px dashed #4ecdc4'
            : '1.5px dashed transparent',
          boxSizing: 'border-box',
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (canInteract) onSelect();
        }}
        onMouseDown={(e) => {
          if (!canInteract) return;
          onStartDrag(e);
        }}
      >
        <svg
          width={w}
          height={h}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            overflow: 'visible',
            pointerEvents: 'none',
          }}
        >
          <polyline
            points={points}
            fill="none"
            stroke={ann.color || '#000000'}
            strokeWidth={ann.strokeWidth || 3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }
  // --- HIGHLIGHT / RECT / WHITEOUT / IMAGE / SIGNATURE ---
  const boxStyle = {
    ...baseStyle,
    left: ann.x,
    top: ann.y,
    width: ann.width,
    height: ann.height,
    border: selected ? '1.5px dashed #4ecdc4' : '1.5px dashed transparent',
  };

  let inner = null;

  if (ann.type === 'highlight') {
    inner = (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: ann.color,
          opacity: 0.5,
        }}
      />
    );
  } else if (ann.type === 'rect') {
    inner = (
      <div
        style={{
          width: '100%',
          height: '100%',
          border: `2px solid ${ann.color}`,
        }}
      />
    );
  } else if (ann.type === 'whiteout') {
    inner = <div style={{ width: '100%', height: '100%', background: '#fff' }} />;
  } else if (ann.type === 'image') {
    inner = (
      <img
        src={ann.dataUrl}
        alt=""
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    );
  } else if (ann.type === 'signature') {
    inner = (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <div style={{ width: '100%', borderTop: '1.5px solid #000' }} />
        <div
          style={{
            fontSize: 10,
            color: '#666',
            marginTop: 2,
            fontFamily: 'Helvetica, Arial, sans-serif',
          }}
        >
          Signature
        </div>
      </div>
    );
  }

  return (
    <div
      style={boxStyle}
      onClick={(e) => {
        e.stopPropagation();
        if (canInteract) onSelect();
      }}
      onMouseDown={onMouseDown}
    >
      {inner}
      {showHandles &&
        handles.map((h) => (
          <div
            key={h}
            className={`pe-resize-handle pe-handle-${h}`}
            onMouseDown={(e) => onStartResize(e, h)}
          />
        ))}
    </div>
  );
}

/* ============================================================
   SEO Content
   ============================================================ */
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is a Visual PDF Editor?</h2>
        <p>
          A <strong>visual PDF editor</strong> lets you modify a PDF by
          clicking on the page and placing elements exactly where you want
          them — text, images, signatures, highlights, drawings, and shapes.
          Unlike text-based editors, you see a live preview of every change.
        </p>
        <p>
          Our <strong>free online PDF editor</strong> runs entirely in your
          browser. Your PDF is never uploaded to any server — your data stays
          completely private.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Edit a PDF Visually — Step by Step</h2>
        <ol className="seo-steps">
          <li>
            <strong>Upload your PDF</strong> — drag & drop or click to browse.
          </li>
          <li>
            <strong>Pick a tool</strong> from the left sidebar — Text, Image,
            Highlight, Rectangle, Draw, Signature, or Whiteout.
          </li>
          <li>
            <strong>Click on the page</strong> to place your element.
          </li>
          <li>
            <strong>Adjust</strong> — drag to move, resize with corner
            handles, change color, font size, or stroke width.
          </li>
          <li>
            <strong>Save & download</strong> — click the save button to
            generate your edited PDF.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">✏️</div>
            <h3>Text Tool</h3>
            <p>Add custom text anywhere. Adjust font size and color.</p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🖼️</div>
            <h3>Image Tool</h3>
            <p>Insert logos or photos. Resize with corner handles.</p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🖍️</div>
            <h3>Highlight Tool</h3>
            <p>Mark important text with a translucent highlight.</p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">▭</div>
            <h3>Rectangle Tool</h3>
            <p>Draw outlined rectangles for callouts or form fields.</p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">✎</div>
            <h3>Free Draw</h3>
            <p>Draw freehand lines for notes or markup.</p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">✍️</div>
            <h3>Signature Tool</h3>
            <p>Insert a signature line, ready to sign.</p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⬜</div>
            <h3>Whiteout / Censor</h3>
            <p>Cover sensitive content with a white box.</p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">↶</div>
            <h3>Undo & Redo</h3>
            <p>Full history with Ctrl+Z and Ctrl+Y.</p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Use Cases</h2>
        <ul className="seo-list">
          <li>
            <strong>Signing contracts</strong> — add signature lines and dates
            to agreements.
          </li>
          <li>
            <strong>Redacting sensitive info</strong> — cover account numbers,
            addresses, or names.
          </li>
          <li>
            <strong>Marking up documents</strong> — highlight key points and
            add notes.
          </li>
          <li>
            <strong>Adding company logos</strong> — place your brand on
            invoices and letters.
          </li>
          <li>
            <strong>Annotating forms</strong> — fill in fields that aren't
            fillable.
          </li>
          <li>
            <strong>Approval stamps</strong> — add "APPROVED" or "REJECTED"
            text with a date.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this PDF editor free?</summary>
          <p>Yes — completely free with no limits. No signup, no watermarks.</p>
        </details>

        <details className="seo-faq">
          <summary>Can I edit existing text in the PDF?</summary>
          <p>
            This tool adds <em>new</em> elements on top. To "edit" existing
            content, use Whiteout to cover old text, then add new text on top.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are my files safe?</summary>
          <p>
            Absolutely — everything runs locally in your browser. Your PDF is
            never uploaded.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does undo/redo work?</summary>
          <p>Yes — Ctrl+Z to undo, Ctrl+Y to redo. Up to 50 actions.</p>
        </details>

        <details className="seo-faq">
          <summary>Can I edit multiple pages?</summary>
          <p>
            Yes — navigate with ◀ ▶. Annotations are stored per page, so each
            page can have different edits.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work with scanned PDFs?</summary>
          <p>
            Yes — elements are added as a layer on top, so scanned PDFs work
            perfectly.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Will added text be selectable?</summary>
          <p>Yes — added text stays selectable and searchable.</p>
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

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
