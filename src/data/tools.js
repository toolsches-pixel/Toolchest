import { lazy } from 'react';

export const tools = [
  {
    id: 'typing-countries',
    name: 'Typing Countries',
    description: 'Practice typing with country names. WPM, accuracy & voice feedback.',
    path: '/tools/typing-countries',
    icon: '⌨️',
    color: '#e2b714',
    category: 'Typing',
    tags: ['typing', 'wpm', 'countries', 'keyboard'],
    component: lazy(() => import('../pages/tools/TypingCountries')),
    fullBleed: true,
  },
  {
    id: 'typing-bihar',
    name: 'Typing Bihar Districts',
    description: 'Practice typing all 38 Bihar districts. Same features — WPM, accuracy, voice.',
    path: '/tools/typing-bihar',
    icon: '🗺️',
    color: '#ff9933',
    category: 'Typing',
    tags: ['typing', 'wpm', 'bihar', 'districts', 'india'],
    component: lazy(() => import('../pages/tools/TypingBihar')),
    fullBleed: true,
  },
  {
    id: 'pdf-editor',
    name: 'PDF Editor',
    description: 'Edit, merge, split and annotate PDF files right in the browser.',
    path: '/tools/pdf-editor',
    icon: '📄',
    color: '#ff6b6b',
    category: 'Documents',
    tags: ['pdf', 'merge', 'split', 'edit'],
    component: lazy(() => import('../pages/tools/PdfEditor')),
  },
  {
    id: 'image-resizer',
    name: 'Image Resizer',
    description: 'Resize images to exact dimensions without losing quality.',
    path: '/tools/image-resizer',
    icon: '🖼️',
    color: '#4ecdc4',
    category: 'Images',
    tags: ['image', 'resize', 'dimensions', 'crop'],
    component: lazy(() => import('../pages/tools/ImageResizer')),
  },
  {
    id: 'image-compressor',
    name: 'Image Compressor',
    description: 'Shrink image file size with smart lossy & lossless compression.',
    path: '/tools/image-compressor',
    icon: '🗜️',
    color: '#a78bfa',
    category: 'Images',
    tags: ['image', 'compress', 'optimize', 'size'],
    component: lazy(() => import('../pages/tools/ImageCompressor')),
  },
];

export const categories = ['All', ...new Set(tools.map((t) => t.category))];

export const getToolById = (id) => tools.find((t) => t.id === id);