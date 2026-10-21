import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works on any static host or sub-path (Vercel, Netlify, GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react()],
  // The logo PNGs are ~4 kB; inline them so the single-file artifact build carries them too.
  build: { assetsInlineLimit: 8192 },
});
