// Build config: two pages — legacy viewer (index.html) and reboot slice.
// Dev (root index.html -> /src/main.js) vs deploy (public/index.html snapshot
// with /assets/index-*.js + Cloudflare beacon) split is documented in README.
import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
    // three.js trips the 500 kB default; warn only past 1 MB.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        reboot: resolve(root, 'reboot.html'),
      },
    },
  },
});
