import { lazy } from "react";

/**
 * Tool registry — grouped structure.
 *
 * 3 groups:
 *   - typing  → Typing Practice
 *   - pdf     → PDF Tools
 *   - others  → Others Tools (image, QR, etc.)
 */

export const groups = [
  // ============================================================
  // 1. TYPING
  // ============================================================
  {
    id: "typing",
    name: "Typing Practice",
    description:
      "Improve your typing speed and accuracy with different word lists. WPM, voice feedback & multiple themes.",
    icon: "⌨️",
    color: "#e2b714",
    category: "Productivity",
    tags: ["typing", "practice", "wpm", "keyboard"],
    tools: [
      {
        id: "typing-countries",
        name: "Countries",
        description:
          "Practice typing all world countries. WPM, accuracy & voice feedback.",
        path: "/tools/typing-countries",
        icon: "🌍",
        component: lazy(() => import("../pages/tools/TypingCountries")),
        fullBleed: true,
      },
      {
        id: "typing-bihar",
        name: "Bihar Districts",
        description: "Practice typing all 38 districts of Bihar.",
        path: "/tools/typing-bihar",
        icon: "🗺️",
        component: lazy(() => import("../pages/tools/TypingBihar")),
        fullBleed: true,
      },
    ],
  },

  // ============================================================
  // 2. PDF TOOLS
  // ============================================================
  {
    id: "pdf",
    name: "PDF Tools",
    description:
      "Merge, split, compress, rotate, convert, watermark, lock PDFs — all in your browser.",
    icon: "📄",
    color: "#ff6b6b",
    category: "Documents",
    tags: [
      "pdf",
      "merge",
      "split",
      "compress",
      "rotate",
      "lock",
      "watermark",
    ],
    tools: [
      {
        id: "merge-pdf",
        name: "Merge PDF",
        description:
          "Combine multiple PDFs into one. Choose orientation & layout.",
        path: "/tools/merge-pdf",
        icon: "🔗",
        component: lazy(() => import("../pages/tools/MergePdf")),
      },
      {
        id: "split-pdf",
        name: "Split PDF",
        description:
          "Extract, remove, or split pages into multiple PDFs. ZIP download for multi-output.",
        path: "/tools/split-pdf",
        icon: "✂️",
        component: lazy(() => import("../pages/tools/SplitPdf")),
      },
      {
        id: "pdf-compressor",
        name: "PDF Compressor",
        description: "Compress PDF to a target size in KB or MB.",
        path: "/tools/pdf-compressor",
        icon: "🗜️",
        component: lazy(() => import("../pages/tools/PdfCompressor")),
      },
      {
        id: "pdf-to-jpg",
        name: "PDF to JPG",
        description: "Convert each PDF page into a high-quality JPG image.",
        path: "/tools/pdf-to-jpg",
        icon: "🖼️",
        component: lazy(() => import("../pages/tools/PdfToJpg")),
      },
      {
        id: "pdf-to-png",
        name: "PDF to PNG",
        description:
          "Convert PDF pages to lossless PNG images. Up to 600 DPI, transparency support.",
        path: "/tools/pdf-to-png",
        icon: "🎨",
        component: lazy(() => import("../pages/tools/PdfToPng")),
      },
      {
        id: "pdf-to-text",
        name: "PDF to Text",
        description:
          "Extract text from PDF files instantly. Preserve formatting, page ranges, download as .txt.",
        path: "/tools/pdf-to-text",
        icon: "📝",
        component: lazy(() => import("../pages/tools/PdfToText")),
      },
      {
        id: "pdf-to-word",
        name: "PDF to Word",
        description:
          "Convert PDF to editable DOCX. Auto-detect headings, preserve structure. 100% private.",
        path: "/tools/pdf-to-word",
        icon: "📝",
        component: lazy(() => import("../pages/tools/PdfToWord")),
      },
      {
        id: "rotate-pdf",
        name: "Rotate PDF",
        description:
          "Rotate PDF pages 90°, 180° or 270° — all pages or specific ones.",
        path: "/tools/rotate-pdf",
        icon: "🔄",
        component: lazy(() => import("../pages/tools/RotatePdf")),
      },
      {
        id: "watermark-pdf",
        name: "Add Watermark",
        description:
          "Add text or image watermark. Position, rotate, tile, opacity control.",
        path: "/tools/watermark-pdf",
        icon: "💧",
        component: lazy(() => import("../pages/tools/WatermarkPdf")),
      },
      {
        id: "page-numbers-pdf",
        name: "Add Page Numbers",
        description:
          "Add page numbers to any PDF. 6 formats, 6 positions, custom start.",
        path: "/tools/page-numbers-pdf",
        icon: "🔢",
        component: lazy(() => import("../pages/tools/PageNumbersPdf")),
      },
      {
        id: "lock-pdf",
        name: "Lock PDF",
        description:
          "Add password protection with AES-256 encryption. Set permissions for printing, copying, editing.",
        path: "/tools/lock-pdf",
        icon: "🔒",
        component: lazy(() => import("../pages/tools/LockPdf")),
      },
      {
        id: "pdf-editor",
        name: "PDF Editor",
        description: "Edit and annotate PDF files.",
        path: "/tools/pdf-editor",
        icon: "📝",
        component: lazy(() => import("../pages/tools/PdfEditor")),
      },
    ],
  },

  // ============================================================
  // 3. OTHERS TOOLS
  // ============================================================
  {
    id: "Image",
    name: "Image Tools",
    description:
      "Resize, compress, convert images, generate QR codes, and more.",
    icon: "🖼️",
    color: "#4ecdc4",
    category: "Images",
    tags: ["image", "resize", "compress", "convert", "qr", "misc"],
    tools: [
      {
        id: "image-resizer",
        name: "Image Resizer",
        description:
          "Resize JPG, PNG, WEBP to exact sizes or social presets.",
        path: "/tools/image-resizer",
        icon: "📐",
        component: lazy(() => import("../pages/tools/ImageResizer")),
      },
      
      {
        id: "image-to-pdf",
        name: "Image to PDF",
        description: "Convert one or more images into a single PDF file.",
        path: "/tools/image-to-pdf",
        icon: "📄",
        component: lazy(() => import("../pages/tools/ImageToPdf")),
      },
      {
        id: "image-to-qr",
        name: "QR Code Generator",
        description:
          "Generate QR codes with custom logo and colors.",
        path: "/tools/image-to-qr",
        icon: "📱",
        component: lazy(() => import("../pages/tools/ImageToQr")),
      },
     
    ],
    
  },
  {
  id: "developer",
  name: "Developer Tools",
  description:
    "Number converters, encoders, generators and utilities for developers.",
  icon: "🔧",
  color: "#a78bfa",
  category: "Developer",
  tags: ["developer", "code", "convert", "encode", "generate"],
  tools: [
    {
      id: "number-base-converter",
      name: "Number Base Converter",
      description:
        "Convert between binary, decimal, octal, hex, and 30+ other bases — live.",
      path: "/tools/number-base-converter",
      icon: "🔢",
      component: lazy(() => import("../pages/tools/NumberBaseConverter")),
    },
    {
      id: 'dice-roller',
      name: 'Dice Roller',
      description:
        'Roll virtual D4, D6, D8, D10, D12, D20, D100 dice. Multiple dice + modifiers.',
      path: '/tools/dice-roller',
      icon: '🎲',
      component: lazy(() => import('../pages/tools/DiceRoller')),
    },
     {
      id: 'word-counter',
      name: 'Word Counter',
      description: 'Count words, characters, sentences, paragraphs with reading time & keyword density.',
      path: '/tools/word-counter',
      icon: '🔢',
      component: lazy(() => import('../pages/tools/WordCounter')),
    },
  ],
},
];

// ============================================================
// Flattened list of all tools (for routing + lookups)
// ============================================================
export const tools = groups.flatMap((g) =>
  g.tools.map((t) => ({
    ...t,
    groupId: g.id,
    groupName: g.name,
    category: g.category,
    color: t.color || g.color,
  }))
);

// Unique categories for home filter pills
export const categories = [
  "All",
  ...new Set(groups.map((g) => g.category)),
];

// Lookup helpers
export const getToolById = (id) => tools.find((t) => t.id === id);
export const getGroupById = (id) => groups.find((g) => g.id === id);