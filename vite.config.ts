import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // If your repository URL is https://<USERNAME>.github.io/<REPO-NAME>/
  // base should be set to '/<REPO-NAME>/'. Using './' is generally safe for relative paths.
  base: './', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // Using default 'esbuild' for minification instead of 'terser' to avoid extra dependencies
    minify: 'esbuild',
  }
});