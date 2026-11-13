import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { Readable } from 'node:stream';
import { defineConfig, type Plugin } from 'vite';
import { proxyLlm } from './shared/llm-proxy.mjs';

/** 开发服务器上提供与 Cloudflare Pages 相同的 /api/llm 代理 */
function llmProxy(): Plugin {
  return {
    name: 'rustlab-llm-proxy',
    configureServer(server) {
      server.middlewares.use('/api/llm/', async (req, res) => {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const origin = `http://${req.headers.host}`;
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
        // 开发服务器自己就是同源的，不需要校验来源（Codespaces 等环境的域名各不相同）
        headers.delete('origin');
        const request = new Request(origin + '/api/llm' + (req.url ?? ''), {
          method: req.method,
          headers,
          body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
        });
        const segments = (req.url ?? '').split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
        const out = await proxyLlm(request, segments, { LLM_PROXY_HOSTS: process.env.LLM_PROXY_HOSTS });
        res.statusCode = out.status;
        out.headers.forEach((v, k) => res.setHeader(k, v));
        if (out.body) Readable.fromWeb(out.body as never).pipe(res);
        else res.end();
      });
    },
  };
}

// 开发服务器上也提供与 Cloudflare Pages 函数相同的 /api/rust 转发：
//   npm run dev        转发到官方 Playground
//   npm run dev:local  转发到本机运行器（runner/server.mjs，使用本机 rustc），适合 Codespaces / 离线
const rustTarget = process.env.RUSTLAB_RUNNER ?? 'https://play.rust-lang.org';

export default defineConfig({
  // 相对路径：同一份构建产物可放在 Cloudflare Pages 根路径，也可放在 GitHub Pages 的子路径下
  base: './',
  plugins: [react(), llmProxy()],
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
