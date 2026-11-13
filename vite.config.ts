import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 开发服务器上也提供与 Cloudflare Pages 函数相同的 /api/rust 转发：
//   npm run dev        转发到官方 Playground
//   npm run dev:local  转发到本机运行器（runner/server.mjs，使用本机 rustc），适合 Codespaces / 离线
const rustTarget = process.env.RUSTLAB_RUNNER ?? 'https://play.rust-lang.org';

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
  server: {
    proxy: {
      '/api/rust': {
        target: rustTarget,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/rust/, ''),
        // 开发服务器本身就是可信的中间人：去掉浏览器的 Origin，免得本机运行器拒绝 Codespaces 之类的域名
        configure: (proxy) => proxy.on('proxyReq', (req) => req.removeHeader('origin')),
      },
    },
  },
  build: {
    // Monaco（VS Code 的编辑器内核）本身就有 3MB 多，单独成块，便于浏览器长期缓存
    chunkSizeWarningLimit: 4000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'monaco', test: /node_modules[\\/]monaco-editor/ },
            { name: 'vendor', test: /node_modules[\\/](react|react-dom|scheduler|marked|dompurify)[\\/]/ },
          ],
        },
      },
    },
  },
});
