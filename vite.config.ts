
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 如果你的仓库 URL 是 https://<USERNAME>.github.io/<REPO-NAME>/
  // base 应该设置为 '/<REPO-NAME>/'。如果使用自定义域名，请改为 '/'。
  base: './', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
  }
});
