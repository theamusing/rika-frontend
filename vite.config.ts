import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Use the base path provided by actions/configure-pages, falling back to '/'
  base: process.env.VITE_BASE_URL ?? '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // Using default 'esbuild' for minification instead of 'terser' to avoid extra dependencies
    minify: 'esbuild',
  }
});