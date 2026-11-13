import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // 相对路径：同一份构建产物可放在 Cloudflare Pages 根路径，也可放在 GitHub Pages 的子路径下
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      // monaco-editor 的 package exports 不暴露 CSS，这里直接指向 ESM 源目录以便按需导入
      'monaco-vs': fileURLToPath(new URL('./node_modules/monaco-editor/esm/vs', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 4000,
  },
});
