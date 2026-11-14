import { defineConfig } from 'vite';

// Relative base: the same build runs on GitHub Pages, any static host and inside the Tauri desktop app.
export default defineConfig({
  base: './',
  build: {
    // Transpile for older Safari / Samsung Internet / Chromium WebViews
    target: ['es2020', 'safari14', 'chrome87', 'firefox78', 'edge88'],
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
    rollupOptions: { output: { manualChunks: { three: ['three'] } } },
  },
  server: { port: 5173, strictPort: true },
});
