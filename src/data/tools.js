import { lazy } from "react";

/**
 * Tool registry — grouped structure.
 *
 * "groups"  → home page pe ek card per group
 * "tools"   → group ke andar sub-tools
 *
 * Naya group add karna:
 *   1. `groups` array me naya object
 *   2. Uske andar `tools: [...]` array
 *
 * Naya tool add karna (existing group me):
 *   1. `src/pages/tools/` me file banao
 *   2. Us group ke `tools` array me entry add karo
 */

export const groups = [
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
      // Future me: typing-up, typing-states, typing-capitals, etc.
    ],
  },
  {
    id: "pdf",
    name: "PDF Tools",
    description:
      "Edit, merge, split and annotate PDF files right in the browser.",
    icon: "📄",
    color: "#ff6b6b",
    category: "Documents",
    tags: ["pdf", "merge", "split", "edit"],
    tools: [
      {
        id: "pdf-editor",
        name: "PDF Editor",
        description: "Edit and annotate PDF files.",
        path: "/tools/pdf-editor",
        icon: "📝",
        component: lazy(() => import("../pages/tools/PdfEditor")),
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
        id: "image-to-pdf",
        name: "Image to PDF",
        description: "Convert one or more images into a single PDF file.",
        path: "/tools/image-to-pdf",
        icon: "📄",
        component: lazy(() => import("../pages/tools/ImageToPdf")),
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
  id: 'pdf-to-word',
  name: 'PDF to Word',
  description: 'Convert PDF to editable DOCX. Auto-detect headings, preserve structure. 100% private.',
  path: '/tools/pdf-to-word',
  icon: '📝',
  component: lazy(() => import('../pages/tools/PdfToWord')),
},
    ],
  },
  {
    id: "image",
    name: "Image Tools",
    description:
      "Resize, compress, and optimize your images without losing quality.",
    icon: "🖼️",
    color: "#4ecdc4",
    category: "Images",
    tags: ["image", "resize", "compress", "optimize"],
    tools: [
      {
        id: "image-resizer",
        name: "Image Resizer",
        description: "Resize images to exact dimensions.",
        path: "/tools/image-resizer",
        icon: "📐",
        component: lazy(() => import("../pages/tools/ImageResizer")),
      },
      {
        id: "image-compressor",
        name: "Image Compressor",
        description: "Shrink file size with smart compression.",
        path: "/tools/image-compressor",
        icon: "🗜️",
        component: lazy(() => import("../pages/tools/ImageCompressor")),
      },
    ],
  },
];

// Flattened list of all tools (for routing + lookups)
export const tools = groups.flatMap((g) =>
  g.tools.map((t) => ({
    ...t,
    groupId: g.id,
    groupName: g.name,
    category: g.category,
    color: t.color || g.color,
  })),
);

// Unique categories for home filter pills
export const categories = ["All", ...new Set(groups.map((g) => g.category))];

// Lookup helpers
export const getToolById = (id) => tools.find((t) => t.id === id);
export const getGroupById = (id) => groups.find((g) => g.id === id);
