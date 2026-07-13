import { drawHead } from './art/head';

// Render the cat face once to an offscreen 64-grid canvas and return a data
// URL. `renderAvatar` is uncached (and exported) so tests can exercise both
// the available and unavailable branches without cache interference.
export function renderAvatar(): string | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const SRC = 64;
  canvas.width = SRC;
  canvas.height = SRC;
  const g = canvas.getContext('2d');
  if (!g) return null;
  g.imageSmoothingEnabled = false;
  // Face-forward head, sized up so it reads as an avatar (matches the
  // drawFace in art-resting.html: scale 1.32, centered low on the grid).
  drawHead(g, { cx: 32, cy: 34, scale: 1.32, eye: 'open', mouth: 'w', droop: 0 });
  try {
    return canvas.toDataURL();
  } catch {
    return null; // toDataURL unimplemented (jsdom without the canvas package)
  }
}

// Module-level cache: the palette is theme-independent, so one image serves
// every assistant message in both themes. Only a successful URL is cached, so
// an early call in a context-less environment doesn't poison later calls.
let cache: string | null = null;
export function avatarDataUrl(): string | null {
  if (cache) return cache;
  cache = renderAvatar();
  return cache;
}
