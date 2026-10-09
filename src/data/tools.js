import { lazy } from "react";

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
      {
        id: "typing-test",
        name: "Typing Test",
        description: "Monkeytype-style test. Time, words, quote modes.",
        path: "/tools/typing-test",
        icon: "⚡",
        component: lazy(() => import("../pages/tools/TypingTest")),
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
    tags: ["pdf", "merge", "split", "compress", "rotate", "lock", "watermark"],
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
        description: "Resize JPG, PNG, WEBP to exact sizes or social presets.",
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
        description: "Generate QR codes with custom logo and colors.",
        path: "/tools/image-to-qr",
        icon: "📱",
        component: lazy(() => import("../pages/tools/ImageToQr")),
      },
      {
        id: "image-watermark",
        name: "Image Watermark",
        description:
          "Add text or logo watermark to images. Custom position, opacity, color.",
        path: "/tools/image-watermark",
        icon: "💧",
        component: lazy(() => import("../pages/tools/ImageWatermark")),
      },
      {
        id: "image-converter",
        name: "Image Converter",
        description:
          "Convert JPG, PNG, WEBP, AVIF — quality control, live preview.",
        path: "/tools/image-converter",
        icon: "🔄",
        component: lazy(() => import("../pages/tools/ImageConverter")),
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
        id: "password-generator",
        name: "Password Generator",
        description:
          "Create strong, secure passwords with custom length, symbols, and your own word.",
        path: "/tools/password-generator",
        icon: "🔐",
        component: lazy(() => import("../pages/tools/PasswordGenerator")),
      },
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
        id: "dice-roller",
        name: "Dice Roller",
        description:
          "Roll virtual D4, D6, D8, D10, D12, D20, D100 dice. Multiple dice + modifiers.",
        path: "/tools/dice-roller",
        icon: "🎲",
        component: lazy(() => import("../pages/tools/DiceRoller")),
      },
      {
        id: "word-counter",
        name: "Word Counter",
        description:
          "Count words, characters, sentences, paragraphs with reading time & keyword density.",
        path: "/tools/word-counter",
        icon: "🔢",
        component: lazy(() => import("../pages/tools/WordCounter")),
      },
      {
        id: "json-formatter",
        name: "JSON Formatter",
        description:
          "Format, validate, minify, and explore JSON with tree view.",
        path: "/tools/json-formatter",
        icon: "📋",
        component: lazy(() => import("../pages/tools/JsonFormatter")),
      },
      {
        id: "color-picker",
        name: "Color Picker",
        description:
          "Pick colors, convert between HEX/RGB/HSL/HSV/CMYK, generate palettes & check contrast.",
        path: "/tools/color-picker",
        icon: "🎨",
        component: lazy(() => import("../pages/tools/ColorPicker")),
      },
      {
        id: "gradient-generator",
        name: "Gradient Generator",
        description:
          "Create CSS linear, radial, and conic gradients with live preview. Copy CSS or Tailwind.",
        path: "/tools/gradient-generator",
        icon: "🌈",
        component: lazy(() => import("../pages/tools/GradientGenerator")),
      },
      {
        id: "hash-generator",
        name: "Hash Generator",
        description:
          "Generate MD5, SHA-1, SHA-256, SHA-384, SHA-512 hashes from text or files.",
        path: "/tools/hash-generator",
        icon: "🔐",
        component: lazy(() => import("../pages/tools/HashGenerator")),
      },
      {
        id: "age-calculator",
        name: "Age Calculator",
        description:
          "Calculate exact age in years, months, days — plus zodiac, next birthday countdown & life stats.",
        path: "/tools/age-calculator",
        icon: "🎂",
        component: lazy(() => import("../pages/tools/AgeCalculator")),
      },
      {
        id: "bmi-calculator",
        name: "BMI Calculator",
        description:
          "Calculate your BMI, healthy weight range, BMR, TDEE and body fat estimate.",
        path: "/tools/bmi-calculator",
        icon: "⚖️",
        component: lazy(() => import("../pages/tools/BmiCalculator")),
      },
      {
        id: "unit-converter",
        name: "Unit Converter",
        description:
          "Convert 150+ units across 14 categories — length, weight, temperature, area, volume, and more.",
        path: "/tools/unit-converter",
        icon: "🔀",
        component: lazy(() => import("../pages/tools/UnitConverter")),
      },
      {
        id: "name-to-emoji",
        name: "Name to Stylish Text",
        description:
          "Turn your name into 100+ stylish fonts and emoji decorations. Copy to WhatsApp, Instagram.",
        path: "/tools/name-to-emoji",
        icon: "✨",
        component: lazy(() => import("../pages/tools/NameToEmoji")),
      },
      {
        id: "timer",
        name: "Timer",
        description:
          "Stopwatch, Countdown, Pomodoro & Interval timer with sound alerts.",
        path: "/tools/timer",
        icon: "⏱",
        component: lazy(() => import("../pages/tools/Timer")),
      },
      {
        id: "ocr-tool",
        name: "Image to Text (OCR)",
        description:
          "Extract text from images. Supports English and Hindi. 100% browser-based.",
        path: "/tools/ocr-tool",
        icon: "🔍",
        component: lazy(() => import("../pages/tools/OcrTool")),
      },
    ],
  },
  {
    id: "fun",
    name: "Fun & Games",
    description:
      "Fun mini-games and utilities — Snake, Dice, Coin Flip, and more.",
    icon: "🎮",
    color: "#a855f7",
    category: "Games",
    tags: ["game", "fun", "snake", "arcade", "play"],
    tools: [
      {
        id: "snake-game",
        name: "Snake Game",
        description:
          "Play the classic Snake game. Arrow keys or WASD to control.",
        path: "/tools/snake-game",
        icon: "🐍",
        component: lazy(() => import("../pages/tools/SnakeGame")),
      },
      {
        id: "pong",
        name: "Pong",
        description:
          "Classic Pong — 1P vs CPU or 2P on same keyboard. Arrow keys + W/S.",
        path: "/tools/pong",
        icon: "🏓",
        component: lazy(() => import("../pages/tools/Pong")),
      },
      {
        id: "decision-wheel",
        name: "Decision Wheel",
        description:
          "Spin the wheel to pick a random winner. Custom options, presets, confetti.",
        path: "/tools/decision-wheel",
        icon: "🎡",
        component: lazy(() => import("../pages/tools/DecisionWheel")),
      },
      {
        id: "tic-tac-toe",
        name: "Tic Tac Toe",
        description:
          "Classic Tic Tac Toe vs computer or friend. Arrow keys or tap.",
        path: "/tools/tic-tac-toe",
        icon: "⭕",
        component: lazy(() => import("../pages/tools/TicTacToe")),
      },
    ],
  },
  {
    id: "study",
    name: "Study Tools",
    description:
      "Tools for students and teachers — result maker, calculators, and more.",
    icon: "🎓",
    color: "#8b5cf6",
    category: "Education",
    tags: ["student", "school", "education", "result", "marks"],
    tools: [
      {
        id: "result-maker",
        name: "Result Maker",
        description:
          "Create student report cards with auto-calculated grades and PDF download.",
        path: "/tools/result-maker",
        icon: "📊",
        component: lazy(() => import("../pages/tools/ResultMaker")),
      },
      // Future: gpa-calculator, percentage-calculator, etc.
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
  })),
);

// Unique categories for home filter pills
export const categories = ["All", ...new Set(groups.map((g) => g.category))];

// Lookup helpers
export const getToolById = (id) => tools.find((t) => t.id === id);
export const getGroupById = (id) => groups.find((g) => g.id === id);
