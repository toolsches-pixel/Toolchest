import { useEffect, useRef, useState, useCallback } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './WritingPad.css';

// ============================================================
// FONTS
// ============================================================
const FONTS = [
  { name: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Helvetica', value: 'Helvetica, sans-serif' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
  { name: 'Tahoma', value: 'Tahoma, sans-serif' },
  { name: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Times New Roman', value: "'Times New Roman', serif" },
  { name: 'Garamond', value: 'Garamond, serif' },
  { name: 'Palatino', value: "'Palatino Linotype', Palatino, serif" },
  { name: 'Courier New', value: "'Courier New', monospace" },
  { name: 'Consolas', value: 'Consolas, monospace' },
  { name: 'Impact', value: 'Impact, sans-serif' },
  { name: 'Comic Sans MS', value: "'Comic Sans MS', cursive" },
  { name: 'Brush Script MT', value: "'Brush Script MT', cursive" },
  { name: 'Lucida Console', value: "'Lucida Console', monospace" },
];

const GOOGLE_FONTS = [
  { name: 'Roboto', value: "'Roboto', sans-serif" },
  { name: 'Open Sans', value: "'Open Sans', sans-serif" },
  { name: 'Lato', value: "'Lato', sans-serif" },
  { name: 'Montserrat', value: "'Montserrat', sans-serif" },
  { name: 'Poppins', value: "'Poppins', sans-serif" },
  { name: 'Playfair Display', value: "'Playfair Display', serif" },
  { name: 'Merriweather', value: "'Merriweather', serif" },
  { name: 'Dancing Script', value: "'Dancing Script', cursive" },
  { name: 'Pacifico', value: "'Pacifico', cursive" },
  { name: 'Lobster', value: "'Lobster', cursive" },
  { name: 'Caveat', value: "'Caveat', cursive" },
  { name: 'Indie Flower', value: "'Indie Flower', cursive" },
];

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 56, 64, 72];

const TEXT_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6',
  '#6b7280', '#78350f', '#0f172a', '#7f1d1d', '#064e3b',
];

const HIGHLIGHT_COLORS = [
  '#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa',
  '#fecaca', '#ddd6fe', '#a5f3fc', '#e9d5ff', '#fde68a',
];

const BRUSH_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6',
  '#6b7280', '#78350f',
];

const BG_COLORS = [
  { id: 'white', value: '#ffffff', label: 'White' },
  { id: 'dark', value: '#1a1a1a', label: 'Dark' },
  { id: 'cream', value: '#fef9e7', label: 'Cream' },
  { id: 'blue', value: '#eff6ff', label: 'Blue' },
  { id: 'green', value: '#f0fdf4', label: 'Green' },
  { id: 'pink', value: '#fdf2f8', label: 'Pink' },
];

// ============================================================
// DRAW TOOLS — grouped for dropdown
// ============================================================
const FREEHAND_TOOLS = [
  { id: 'pen', label: 'Pen', icon: '✏️' },
  { id: 'marker', label: 'Marker', icon: '🖊️' },
  { id: 'highlighter', label: 'Highlighter', icon: '🖍️' },
  { id: 'eraser', label: 'Eraser', icon: '🧽' },
];

const SHAPE_TOOLS = [
  { id: 'rect', label: 'Rectangle', icon: '▭' },
  { id: 'circle', label: 'Circle', icon: '◯' },
  { id: 'triangle', label: 'Triangle', icon: '△' },
  { id: 'line', label: 'Line', icon: '╱' },
  { id: 'arrow', label: 'Arrow', icon: '➤' },
  { id: 'star', label: 'Star', icon: '★' },
  { id: 'heart', label: 'Heart', icon: '♥' },
  { id: 'pentagon', label: 'Pentagon', icon: '⬠' },
  { id: 'hexagon', label: 'Hexagon', icon: '⬡' },
  { id: 'diamond', label: 'Diamond', icon: '◆' },
];

const TEXT_TOOL = { id: 'text', label: 'Text', icon: 'T' };

const ALL_DRAW_TOOLS = [...FREEHAND_TOOLS, ...SHAPE_TOOLS, TEXT_TOOL];

// ============================================================
// TEMPLATES (draw mode)
// ============================================================
const SHAPE_TEMPLATES = {
  rect: null,
  circle: null,
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function WritingPad() {
  const tool = getToolById('writing-pad');

  useDocumentTitle('Full Writing Pad — Free Online Notepad & Drawing Pad | toolchest');

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
      'Free online writing pad with rich text editor and drawing canvas. 30+ fonts, shapes, keyboard shortcuts. Auto-save, export TXT/HTML/PNG. No signup.';

    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href =
      'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Montserrat:wght@400;700&family=Poppins:wght@400;700&family=Playfair+Display:wght@400;700&family=Merriweather:wght@400;700&family=Dancing+Script:wght@400;700&family=Pacifico&family=Lobster&family=Caveat:wght@400;700&family=Indie+Flower&display=swap';
    document.head.appendChild(fontLink);

    const scriptId = 'writing-pad-jsonld';
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
      name: 'Full Writing Pad',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    });

    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
      try { document.head.removeChild(fontLink); } catch (e) {}
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, []);

  const [mode, setMode] = useState('text');

  // ============================================================
  // TEXT MODE
  // ============================================================
  const [textContent, setTextContent] = useState('');
  const [fontFamily, setFontFamily] = useState("'JetBrains Mono', monospace");
  const [fontSize, setFontSize] = useState(16);
  const [textColor, setTextColor] = useState('#1a1a1a');
  const [highlightColor, setHighlightColor] = useState('#fef08a');
  const [textBg, setTextBg] = useState('white');
  const [textStats, setTextStats] = useState({ words: 0, chars: 0, lines: 1 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [activeFormats, setActiveFormats] = useState({});
  const [textTemplates, setTextTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);

  const editorRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('toolchest-writing-pad-text');
      if (saved && editorRef.current) {
        editorRef.current.innerHTML = saved;
        setTextContent(saved);
      }
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (!editorRef.current) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('toolchest-writing-pad-text', textContent);
      } catch (e) {}
    }, 500);
    return () => clearTimeout(timer);
  }, [textContent]);

  useEffect(() => {
    const plainText = (editorRef.current?.innerText) || textContent.replace(/<[^>]*>/g, '');
    const words = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
    const chars = plainText.length;
    const lines = plainText.split('\n').length;
    setTextStats({ words, chars, lines });
  }, [textContent]);

  const updateActiveFormats = useCallback(() => {
    const formats = {};
    ['bold', 'italic', 'underline', 'strikeThrough',
     'justifyLeft', 'justifyCenter', 'justifyRight',
     'insertUnorderedList', 'insertOrderedList'].forEach((cmd) => {
      try {
        formats[cmd] = document.queryCommandState(cmd);
      } catch (e) {}
    });
    setActiveFormats(formats);
  }, []);

  useEffect(() => {
    const handler = () => updateActiveFormats();
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, [updateActiveFormats]);

  // Commands
  const execCommand = (cmd, value = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    if (editorRef.current) setTextContent(editorRef.current.innerHTML);
    updateActiveFormats();
  };

  const applyFontFamily = (family) => {
    setFontFamily(family);
    execCommand('fontName', family);
  };

  const applyFontSize = (size) => {
    setFontSize(size);
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = `${size}px`;
      try {
        range.surroundContents(span);
      } catch (e) {
        const fragment = range.extractContents();
        span.appendChild(fragment);
        range.insertNode(span);
      }
      if (editorRef.current) setTextContent(editorRef.current.innerHTML);
    }
  };

  const applyTextColor = (color) => {
    setTextColor(color);
    execCommand('foreColor', color);
    setShowColorPicker(false);
  };

  const applyHighlight = (color) => {
    setHighlightColor(color);
    execCommand('hiliteColor', color);
    setShowHighlightPicker(false);
  };

  const clearFormatting = () => execCommand('removeFormat');
  const insertHorizontalLine = () => execCommand('insertHorizontalRule');
  const insertDateTime = () => {
    const now = new Date();
    const str = now.toLocaleString();
    execCommand('insertText', str);
  };

  const changeCase = (type) => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    let text = range.toString();
    if (!text) return;

    if (type === 'upper') text = text.toUpperCase();
    else if (type === 'lower') text = text.toLowerCase();
    else if (type === 'title') {
      text = text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    } else if (type === 'sentence') {
      text = text.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (c) => c.toUpperCase());
    }

    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    if (editorRef.current) setTextContent(editorRef.current.innerHTML);
  };

  const handleEditorInput = () => {
    if (editorRef.current) setTextContent(editorRef.current.innerHTML);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const handleEditorKeyDown = (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && (e.key === 'z' || e.key === 'y' ||
        ['b', 'i', 'u'].includes(e.key.toLowerCase()))) {
      setTimeout(() => {
        if (editorRef.current) setTextContent(editorRef.current.innerHTML);
        updateActiveFormats();
      }, 10);
    }
  };

  const handleClearText = () => {
    if (!window.confirm('Clear all text? This cannot be undone.')) return;
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      setTextContent('');
    }
  };

  // Templates
  const TEXT_TEMPLATE_PRESETS = [
    {
      name: '📝 Diary Entry',
      html: '<h2>Date: ' + new Date().toLocaleDateString() + '</h2><p><strong>Dear Diary,</strong></p><p>Today I...</p><p></p><p>Feeling: </p>',
    },
    {
      name: '✅ To-Do List',
      html: '<h2>To-Do List</h2><ul><li>Task 1</li><li>Task 2</li><li>Task 3</li></ul><p><strong>Priority:</strong></p>',
    },
    {
      name: '📋 Meeting Notes',
      html: '<h2>Meeting Notes</h2><p><strong>Date:</strong> </p><p><strong>Attendees:</strong> </p><h3>Agenda</h3><ul><li></li></ul><h3>Action Items</h3><ul><li></li></ul>',
    },
    {
      name: '📚 Study Notes',
      html: '<h2>Subject: </h2><p><strong>Chapter:</strong> </p><h3>Key Points</h3><ul><li></li></ul><h3>Summary</h3><p></p>',
    },
    {
      name: '✍️ Essay Structure',
      html: '<h1>Essay Title</h1><h2>Introduction</h2><p></p><h2>Body Paragraph 1</h2><p></p><h2>Body Paragraph 2</h2><p></p><h2>Conclusion</h2><p></p>',
    },
  ];

  const applyTemplate = (html) => {
    if (!editorRef.current) return;
    const hasContent = editorRef.current.innerText.trim().length > 0;
    if (hasContent && !window.confirm('Replace current content with template?')) return;
    editorRef.current.innerHTML = html;
    setTextContent(html);
    setShowTemplates(false);
  };

  // Exports
  const downloadTxt = () => {
    const plainText = editorRef.current?.innerText || '';
    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `writing-pad-${Date.now()}.txt`);
  };

  const downloadHtml = () => {
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Writing Pad</title>
<style>body{font-family:${fontFamily};font-size:${fontSize}px;padding:40px;max-width:800px;margin:0 auto;line-height:1.6;}</style>
</head><body>${textContent}</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, `writing-pad-${Date.now()}.html`);
  };

  const printText = () => {
    const win = window.open('', '', 'width=800,height=600');
    win.document.write(`<!DOCTYPE html><html><head><title>Writing Pad</title>
<style>body{font-family:${fontFamily};font-size:${fontSize}px;padding:40px;line-height:1.6;color:${textColor};}
@media print{body{padding:0;}}</style></head><body>${textContent}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 250);
  };

  // ============================================================
  // DRAW MODE
  // ============================================================
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawTool, setDrawTool] = useState('pen');
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [fillShape, setFillShape] = useState(false);
  const [canvasBg, setCanvasBg] = useState('white');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const snapshotRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      let savedData = null;
      try {
        if (canvas.width > 0) savedData = canvas.toDataURL();
      } catch (e) {}

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (savedData) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = savedData;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'draw') return;
    if (!canvasRef.current) return;
    const timer = setTimeout(() => saveHistory(), 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const data = canvas.toDataURL();
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(data);
        if (newHistory.length > 30) newHistory.shift();
        return newHistory;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 29));
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyIndex]);

  const restoreHistory = (index) => {
    const canvas = canvasRef.current;
    if (!canvas || !history[index]) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      ctx.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
    };
    img.src = history[index];
    setHistoryIndex(index);
  };

  const handleUndo = () => { if (historyIndex > 0) restoreHistory(historyIndex - 1); };
  const handleRedo = () => { if (historyIndex < history.length - 1) restoreHistory(historyIndex + 1); };

  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const applyBrushStyle = (ctx) => {
    if (drawTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = brushSize * 3;
      ctx.globalAlpha = 1;
    } else if (drawTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
      ctx.fillStyle = brushColor;
      ctx.lineWidth = brushSize * 4;
      ctx.globalAlpha = 0.3;
    } else if (drawTool === 'marker') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
      ctx.fillStyle = brushColor;
      ctx.lineWidth = brushSize * 1.5;
      ctx.globalAlpha = brushOpacity * 0.9;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
      ctx.fillStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.globalAlpha = brushOpacity;
    }
  };

  const isShapeTool = SHAPE_TOOLS.some((t) => t.id === drawTool);

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (drawTool === 'text') {
      const text = window.prompt('Enter text:');
      if (text) {
        const ctx = canvas.getContext('2d');
        const point = getCanvasPoint(e);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = brushColor;
        ctx.font = `bold ${brushSize * 5}px 'JetBrains Mono', sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(text, point.x, point.y);
        saveHistory();
      }
      return;
    }

    setIsDrawing(true);
    const point = getCanvasPoint(e);
    lastPosRef.current = point;
    startPosRef.current = point;

    if (isShapeTool) {
      try { snapshotRef.current = canvas.toDataURL(); } catch (err) {}
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const point = getCanvasPoint(e);

    if (isShapeTool) {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      if (snapshotRef.current) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, w, h);
          ctx.save();
          applyBrushStyle(ctx);
          drawShape(ctx, startPosRef.current, point);
          ctx.restore();
        };
        img.src = snapshotRef.current;
      }
      lastPosRef.current = point;
      return;
    }

    ctx.save();
    applyBrushStyle(ctx);
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.restore();
    lastPosRef.current = point;
  };

  const drawShape = (ctx, start, end) => {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    const cx = start.x + (end.x - start.x) / 2;
    const cy = start.y + (end.y - start.y) / 2;

    ctx.beginPath();

    if (drawTool === 'rect') {
      ctx.rect(x, y, w, h);
    } else if (drawTool === 'circle') {
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    } else if (drawTool === 'line') {
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
    } else if (drawTool === 'arrow') {
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headLen = Math.max(12, brushSize * 3);
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLen * Math.cos(angle - Math.PI / 6),
        end.y - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLen * Math.cos(angle + Math.PI / 6),
        end.y - headLen * Math.sin(angle + Math.PI / 6)
      );
    } else if (drawTool === 'triangle') {
      ctx.moveTo(start.x + w / 2, start.y);
      ctx.lineTo(start.x + w, start.y + h);
      ctx.lineTo(start.x, start.y + h);
      ctx.closePath();
    } else if (drawTool === 'star') {
      const outerR = Math.min(w, h) / 2;
      const innerR = outerR * 0.4;
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (drawTool === 'heart') {
      const size = Math.min(w, h) / 2;
      ctx.moveTo(cx, cy + size * 0.7);
      ctx.bezierCurveTo(cx + size * 1.3, cy - size * 0.3, cx + size * 0.5, cy - size * 1.2, cx, cy - size * 0.4);
      ctx.bezierCurveTo(cx - size * 0.5, cy - size * 1.2, cx - size * 1.3, cy - size * 0.3, cx, cy + size * 0.7);
      ctx.closePath();
    } else if (drawTool === 'pentagon') {
      const r = Math.min(w, h) / 2;
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (drawTool === 'hexagon') {
      const r = Math.min(w, h) / 2;
      for (let i = 0; i < 6; i++) {
        const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (drawTool === 'diamond') {
      ctx.moveTo(cx, start.y);
      ctx.lineTo(end.x, cy);
      ctx.lineTo(cx, end.y);
      ctx.lineTo(start.x, cy);
      ctx.closePath();
    }

    if (fillShape && drawTool !== 'line' && drawTool !== 'arrow') {
      ctx.fill();
    }
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;

    if (isShapeTool && e) {
      const canvas = canvasRef.current;
      if (canvas && snapshotRef.current) {
        const ctx = canvas.getContext('2d');
        const point = getCanvasPoint(e);
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          ctx.save();
          applyBrushStyle(ctx);
          drawShape(ctx, startPosRef.current, point);
          ctx.restore();
          saveHistory();
        };
        img.src = snapshotRef.current;
      }
    } else {
      saveHistory();
    }

    setIsDrawing(false);
    snapshotRef.current = null;
  };

  const clearCanvas = () => {
    if (!window.confirm('Clear the canvas? This cannot be undone.')) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    saveHistory();
  };

  const downloadCanvasPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');

    const bg = BG_COLORS.find((b) => b.id === canvasBg)?.value || '#ffffff';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(canvas, 0, 0);

    exportCanvas.toBlob((blob) => {
      downloadBlob(blob, `drawing-${Date.now()}.png`);
    }, 'image/png');
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentTool = ALL_DRAW_TOOLS.find((t) => t.id === drawTool);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <ToolShell tool={tool}>
      <div className="wp-root">
        <div className="wp-tabs">
          <button
            className={`wp-tab ${mode === 'text' ? 'active' : ''}`}
            onClick={() => setMode('text')}
          >
            <span>📝</span> Text
          </button>
          <button
            className={`wp-tab ${mode === 'draw' ? 'active' : ''}`}
            onClick={() => setMode('draw')}
          >
            <span>🎨</span> Draw
          </button>
        </div>

        {/* ================================ */}
        {/* TEXT MODE */}
        {/* ================================ */}
        {mode === 'text' && (
          <>
            <div className="wp-toolbar">
              {/* Undo/Redo */}
              <div className="wp-tool-group">
                <button className="wp-tool-btn" onClick={() => execCommand('undo')} title="Undo">↶</button>
                <button className="wp-tool-btn" onClick={() => execCommand('redo')} title="Redo">↷</button>
              </div>

              {/* Formats */}
              <div className="wp-tool-group">
                <button className={`wp-tool-btn ${activeFormats.bold ? 'active' : ''}`} onClick={() => execCommand('bold')} title="Bold"><strong>B</strong></button>
                <button className={`wp-tool-btn ${activeFormats.italic ? 'active' : ''}`} onClick={() => execCommand('italic')} title="Italic"><em>I</em></button>
                <button className={`wp-tool-btn ${activeFormats.underline ? 'active' : ''}`} onClick={() => execCommand('underline')} title="Underline"><u>U</u></button>
                <button className={`wp-tool-btn ${activeFormats.strikeThrough ? 'active' : ''}`} onClick={() => execCommand('strikeThrough')} title="Strike"><s>S</s></button>
              </div>

              {/* Headings */}
              <div className="wp-tool-group">
                <button className="wp-tool-btn" onClick={() => execCommand('formatBlock', 'H1')}>H1</button>
                <button className="wp-tool-btn" onClick={() => execCommand('formatBlock', 'H2')}>H2</button>
                <button className="wp-tool-btn" onClick={() => execCommand('formatBlock', 'H3')}>H3</button>
                <button className="wp-tool-btn" onClick={() => execCommand('formatBlock', 'P')}>¶</button>
                <button className="wp-tool-btn" onClick={() => execCommand('formatBlock', 'BLOCKQUOTE')}>❝</button>
              </div>

              {/* Lists */}
              <div className="wp-tool-group">
                <button className={`wp-tool-btn ${activeFormats.insertUnorderedList ? 'active' : ''}`} onClick={() => execCommand('insertUnorderedList')}>•</button>
                <button className={`wp-tool-btn ${activeFormats.insertOrderedList ? 'active' : ''}`} onClick={() => execCommand('insertOrderedList')}>1.</button>
              </div>

              {/* Align */}
              <div className="wp-tool-group">
                <button className={`wp-tool-btn ${activeFormats.justifyLeft ? 'active' : ''}`} onClick={() => execCommand('justifyLeft')}>⬅</button>
                <button className={`wp-tool-btn ${activeFormats.justifyCenter ? 'active' : ''}`} onClick={() => execCommand('justifyCenter')}>↔</button>
                <button className={`wp-tool-btn ${activeFormats.justifyRight ? 'active' : ''}`} onClick={() => execCommand('justifyRight')}>➡</button>
              </div>

              {/* Font family */}
              <div className="wp-tool-group">
                <select
                  value={fontFamily}
                  onChange={(e) => applyFontFamily(e.target.value)}
                  className="wp-select"
                >
                  <optgroup label="System">
                    {FONTS.map((f) => (<option key={f.value} value={f.value}>{f.name}</option>))}
                  </optgroup>
                  <optgroup label="Google">
                    {GOOGLE_FONTS.map((f) => (<option key={f.value} value={f.value}>{f.name}</option>))}
                  </optgroup>
                </select>
              </div>

              {/* Size */}
              <div className="wp-tool-group">
                <select value={fontSize} onChange={(e) => applyFontSize(parseInt(e.target.value))} className="wp-select wp-select-sm">
                  {FONT_SIZES.map((s) => (<option key={s} value={s}>{s}px</option>))}
                </select>
              </div>

              {/* Text color */}
              <div className="wp-tool-group wp-tool-relative">
                <button
                  className="wp-tool-btn wp-tool-color"
                  onClick={() => { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false); }}
                  style={{ borderBottom: `3px solid ${textColor}` }}
                >
                  A
                </button>
                {showColorPicker && (
                  <div className="wp-color-popup">
                    {TEXT_COLORS.map((c) => (
                      <button key={c} className="wp-color-swatch" style={{ background: c }} onClick={() => applyTextColor(c)} />
                    ))}
                  </div>
                )}
              </div>

              {/* Highlight */}
              <div className="wp-tool-group wp-tool-relative">
                <button
                  className="wp-tool-btn wp-tool-highlight"
                  onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); }}
                  style={{ background: highlightColor }}
                >
                  ✎
                </button>
                {showHighlightPicker && (
                  <div className="wp-color-popup">
                    {HIGHLIGHT_COLORS.map((c) => (
                      <button key={c} className="wp-color-swatch" style={{ background: c }} onClick={() => applyHighlight(c)} />
                    ))}
                    <button className="wp-color-swatch wp-color-none" onClick={() => applyHighlight('transparent')}>✕</button>
                  </div>
                )}
              </div>

              {/* Case */}
              <div className="wp-tool-group">
                <button className="wp-tool-btn" onClick={() => changeCase('upper')} title="UPPER">AA</button>
                <button className="wp-tool-btn" onClick={() => changeCase('lower')} title="lower">aa</button>
                <button className="wp-tool-btn" onClick={() => changeCase('title')} title="Title">Aa</button>
              </div>

              {/* Insert */}
              <div className="wp-tool-group">
                <button className="wp-tool-btn" onClick={insertHorizontalLine} title="Horizontal line">—</button>
                <button className="wp-tool-btn" onClick={insertDateTime} title="Date/Time">🕐</button>
                <button className="wp-tool-btn" onClick={clearFormatting} title="Clear format">🧹</button>
              </div>

              {/* Templates dropdown */}
              <div className="wp-tool-group wp-tool-relative">
                <button
                  className="wp-tool-btn"
                  onClick={() => setShowTemplates(!showTemplates)}
                  title="Insert template"
                >
                  📋
                </button>
                {showTemplates && (
                  <div className="wp-templates-popup">
                    <div className="wp-templates-title">Templates</div>
                    {TEXT_TEMPLATE_PRESETS.map((t, i) => (
                      <button
                        key={i}
                        className="wp-template-item"
                        onClick={() => applyTemplate(t.html)}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="wp-editor-wrap" style={{ background: BG_COLORS.find((b) => b.id === textBg)?.value }}>
              <div
                ref={editorRef}
                className="wp-editor"
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onPaste={handlePaste}
                onKeyDown={handleEditorKeyDown}
                onMouseUp={updateActiveFormats}
                onKeyUp={updateActiveFormats}
                style={{ fontFamily, fontSize: `${fontSize}px`, color: textColor }}
                data-placeholder="Start writing here… or click 📋 for a template"
              />
            </div>

            <div className="wp-bottombar">
              <div className="wp-stats">
                <span>📝 {textStats.words} words</span>
                <span>•</span>
                <span>{textStats.chars} characters</span>
                <span>•</span>
                <span>{textStats.lines} lines</span>
              </div>
              <div className="wp-actions">
                <div className="wp-bg-picker">
                  {BG_COLORS.map((b) => (
                    <button
                      key={b.id}
                      className={`wp-bg-swatch ${textBg === b.id ? 'active' : ''}`}
                      style={{ background: b.value }}
                      onClick={() => setTextBg(b.id)}
                      title={b.label}
                    />
                  ))}
                </div>
                <button className="wp-action-btn" onClick={downloadTxt}>📄 TXT</button>
                <button className="wp-action-btn" onClick={downloadHtml}>🌐 HTML</button>
                <button className="wp-action-btn" onClick={printText}>🖨️ Print</button>
                <button className="wp-action-btn wp-action-danger" onClick={handleClearText}>🗑 Clear</button>
              </div>
            </div>
          </>
        )}

        {/* ================================ */}
        {/* DRAW MODE */}
        {/* ================================ */}
        {mode === 'draw' && (
          <>
            <div className="wp-toolbar wp-toolbar-draw">
              {/* Freehand tools */}
              <div className="wp-tool-group">
                {FREEHAND_TOOLS.map((t) => (
                  <button
                    key={t.id}
                    className={`wp-tool-btn wp-brush-btn ${drawTool === t.id ? 'active' : ''}`}
                    onClick={() => setDrawTool(t.id)}
                    title={t.label}
                  >
                    {t.icon}
                  </button>
                ))}
              </div>

              {/* Shape dropdown */}
              <div className="wp-tool-group">
                <select
                  value={isShapeTool ? drawTool : ''}
                  onChange={(e) => { if (e.target.value) setDrawTool(e.target.value); }}
                  className="wp-select wp-select-shape"
                  title="Shapes"
                >
                  <option value="">🔷 Shapes</option>
                  {SHAPE_TOOLS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Text tool */}
              <div className="wp-tool-group">
                <button
                  className={`wp-tool-btn wp-brush-btn ${drawTool === 'text' ? 'active' : ''}`}
                  onClick={() => setDrawTool('text')}
                  title="Text tool"
                >
                  T
                </button>
              </div>

              {/* Fill toggle */}
              {isShapeTool && (
                <div className="wp-tool-group">
                  <button
                    className={`wp-tool-btn ${fillShape ? 'active' : ''}`}
                    onClick={() => setFillShape(!fillShape)}
                    title="Fill shape"
                  >
                    ⬛
                  </button>
                </div>
              )}

              {/* Colors */}
              <div className="wp-tool-group wp-brush-colors">
                {BRUSH_COLORS.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    className={`wp-color-swatch ${brushColor === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setBrushColor(c)}
                  />
                ))}
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="wp-color-input"
                />
              </div>

              {/* Size */}
              <div className="wp-tool-group wp-brush-size">
                <label className="wp-slider-label">Size</label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="wp-slider"
                />
                <span className="wp-slider-value">{brushSize}</span>
              </div>

              {/* Opacity */}
              <div className="wp-tool-group wp-brush-size">
                <label className="wp-slider-label">Opacity</label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={brushOpacity}
                  onChange={(e) => setBrushOpacity(parseFloat(e.target.value))}
                  className="wp-slider"
                />
                <span className="wp-slider-value">{Math.round(brushOpacity * 100)}%</span>
              </div>

              {/* Undo/Redo */}
              <div className="wp-tool-group">
                <button className="wp-tool-btn" onClick={handleUndo} disabled={historyIndex <= 0}>↶</button>
                <button className="wp-tool-btn" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>↷</button>
              </div>
            </div>

            <div className="wp-canvas-wrap" style={{ background: BG_COLORS.find((b) => b.id === canvasBg)?.value }}>
              <canvas
                ref={canvasRef}
                className="wp-canvas"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>

            <div className="wp-bottombar">
              <div className="wp-stats">
                <span>🎨 {currentTool?.icon} {currentTool?.label}</span>
                <span>•</span>
                <span>{history.length} states</span>
              </div>
              <div className="wp-actions">
                <div className="wp-bg-picker">
                  {BG_COLORS.map((b) => (
                    <button
                      key={b.id}
                      className={`wp-bg-swatch ${canvasBg === b.id ? 'active' : ''}`}
                      style={{ background: b.value }}
                      onClick={() => setCanvasBg(b.id)}
                    />
                  ))}
                </div>
                <button className="wp-action-btn" onClick={downloadCanvasPng}>🖼️ PNG</button>
                <button className="wp-action-btn wp-action-danger" onClick={clearCanvas}>🗑 Clear</button>
              </div>
            </div>
          </>
        )}

        <SeoContent />
      </div>
    </ToolShell>
  );
}

function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>Full Writing Pad — Text + Drawing</h2>
        <p>
          A <strong>full writing pad</strong> combines a rich text editor and
          a drawing canvas in one free browser tool. Type formatted notes,
          sketch diagrams, or doodle — no install, no signup.
        </p>
      </section>
      <section className="seo-section">
        <h2>Features</h2>
        <ul className="seo-list">
          <li><strong>30+ fonts</strong> — system + Google Fonts</li>
          <li><strong>Text templates</strong> — diary, to-do, meeting notes, study notes</li>
          <li><strong>Keyboard shortcuts</strong> — Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Z, Ctrl+Y</li>
          <li><strong>10 shapes</strong> — rectangle, circle, triangle, star, heart, pentagon, hexagon, diamond, arrow, line</li>
          <li><strong>4 brushes</strong> — pen, marker, highlighter, eraser</li>
          <li><strong>Text tool</strong> — click to add text on canvas</li>
          <li><strong>Auto-save</strong> — text saved in browser</li>
          <li><strong>Export</strong> — TXT, HTML, PNG, print</li>
        </ul>
      </section>
      <section className="seo-section">
        <h2>Common Uses</h2>
        <ul className="seo-list">
          <li>Students — notes, diagrams, study templates</li>
          <li>Writers — drafts, journals, essays</li>
          <li>Designers — wireframes and sketches</li>
          <li>Teachers — lesson plans with visuals</li>
        </ul>
      </section>
      <section className="seo-section">
        <h2>FAQ</h2>
        <details className="seo-faq" open>
          <summary>Is it free?</summary>
          <p>Yes — completely free, no signup, no ads.</p>
        </details>
        <details className="seo-faq">
          <summary>Does it work offline?</summary>
          <p>Once loaded, yes — everything runs in your browser.</p>
        </details>
        <details className="seo-faq">
          <summary>Is my data saved?</summary>
          <p>Text auto-saves in browser. Drawings can be exported as PNG.</p>
        </details>
      </section>
    </article>
  );
}