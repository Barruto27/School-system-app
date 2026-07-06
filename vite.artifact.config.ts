import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Produces a single self-contained index.html (all JS/CSS/assets inlined)
// for publishing as a Claude Artifact — the app is 100% client-side
// (IndexedDB + localStorage, no backend), so one static HTML file is enough
// to run the real thing.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-artifact',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 100_000,
  },
})
