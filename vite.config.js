import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    target: 'es2019',
    chunkSizeWarningLimit: 1000,
  },
  server: { host: true },
});
