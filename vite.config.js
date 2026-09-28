// vite.config.js — workstream A (repo hygiene + working build).
//
// Dev vs deploy setup:
// - DEV: `vite` / `vite preview` serve the ROOT index.html, which loads
//   `/src/main.js` as a native ESM module (fast HMR, no bundle step).
// - DEPLOY: `vite build` emits a hashed bundle into `dist/` (see outDir
//   below). The checked-in `public/index.html` is a previously deployed
//   snapshot that references `/assets/index-*.js` plus the Cloudflare
//   beacon script — it is NOT the dev entry. Do not point vite at it;
//   keep root at its default (project root) so dev uses root index.html
//   and build picks up the same entry.
import { defineConfig } from 'vite';

export default defineConfig({
  // root defaults to the project root ('.') — intentional, see header.
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Raised above the 500 kB default: three.js (~600 kB+ min) always
    // trips the default warning, so warn only on genuinely large chunks.
    chunkSizeWarningLimit: 1000,
  },
});
