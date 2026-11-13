#!/usr/bin/env node
// RustLab 本地运行器：用你机器上的 rustc 编译运行代码，接口与 play.rust-lang.org 的 /execute 兼容。
// 零依赖，只需要 Node 18+ 和 Rust 工具链。
//
//   node runner/server.mjs [--port 7878] [--host 127.0.0.1] [--allow-origin https://你的站点.pages.dev]
//
// 安全说明：这个服务会执行收到的任意代码。默认只监听 127.0.0.1，并且只接受来自 localhost 页面
// 以及 --allow-origin 明确列出的站点的请求，其它网页无法借你的浏览器调用它。
import { createServer } from 'node:http';
import { compileAndRun, formatCode, rustcVersion } from './exec.mjs';

function parseArgs(argv) {
  const opts = {
    port: Number(process.env.PORT) || 7878,
    host: process.env.HOST || '127.0.0.1',
    origins: (process.env.ALLOW_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port') opts.port = Number(argv[++i]);
    else if (a === '--host') opts.host = argv[++i];
    else if (a === '--allow-origin') opts.origins.push(argv[++i]);
    else if (a === '-h' || a === '--help') {
      console.log('用法: node runner/server.mjs [--port 7878] [--host 127.0.0.1] [--allow-origin <origin>]...');
      process.exit(0);
    } else {
      console.error(`未知参数: ${a}`);
      process.exit(1);
    }
  }
  opts.origins = opts.origins.map((o) => o.replace(/\/+$/, ''));
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const MAX_BODY = 256 * 1024;
const MAX_CONCURRENT = 2;

function originAllowed(origin) {
  if (!origin) return true; // 非浏览器客户端（curl 等）不带 Origin
  if (opts.origins.includes('*')) return true;
  return LOCAL_ORIGIN.test(origin) || opts.origins.includes(origin);
}

function corsHeaders(origin) {
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    // Chrome 的 Private Network Access：公网页面访问 localhost 需要这个响应头
    'Access-Control-Allow-Private-Network': 'true',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

function send(res, status, body, origin) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('请求体过大'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// 简单的并发闸门：同时最多编译 MAX_CONCURRENT 个任务
let active = 0;
const waiting = [];
async function withSlot(fn) {
  if (active >= MAX_CONCURRENT) await new Promise((r) => waiting.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  const url = new URL(req.url ?? '/', 'http://localhost');
  try {
    if (!originAllowed(origin)) {
      send(res, 403, { error: `来源 ${origin} 不在允许列表中，请用 --allow-origin ${origin} 重新启动运行器` });
      return;
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders(origin));
      res.end();
      return;
    }
    if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/')) {
      send(res, 200, { ok: true, service: 'rustlab-runner', rustc: await rustcVersion() }, origin);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/execute') {
      // 要求 JSON：浏览器的跨站"简单请求"发不出这个 Content-Type，必须先过预检
      if (!/^application\/json/i.test(req.headers['content-type'] ?? '')) {
        send(res, 415, { error: 'Content-Type 必须是 application/json' }, origin);
        return;
      }
      const body = JSON.parse(await readBody(req));
      if (typeof body.code !== 'string') {
        send(res, 400, { error: '缺少 code 字段' }, origin);
        return;
      }
      const edition = ['2015', '2018', '2021', '2024'].includes(body.edition) ? body.edition : '2024';
      const result = await withSlot(() => compileAndRun({ code: body.code, tests: body.tests === true, edition }));
      send(res, 200, result, origin);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/format') {
      if (!/^application\/json/i.test(req.headers['content-type'] ?? '')) {
        send(res, 415, { error: 'Content-Type 必须是 application/json' }, origin);
        return;
      }
      const body = JSON.parse(await readBody(req));
      if (typeof body.code !== 'string') {
        send(res, 400, { error: '缺少 code 字段' }, origin);
        return;
      }
      const edition = ['2015', '2018', '2021', '2024'].includes(body.edition) ? body.edition : '2024';
      send(res, 200, await formatCode(body.code, edition), origin);
      return;
    }
    send(res, 404, { error: 'not found' }, origin);
  } catch (err) {
    send(res, 400, { error: err instanceof Error ? err.message : String(err) }, origin);
  }
});

server.listen(opts.port, opts.host, async () => {
  const version = await rustcVersion();
  console.log(`RustLab 本地运行器已启动: http://${opts.host}:${opts.port}`);
  console.log(version ? `使用 ${version}` : '⚠ 没有找到 rustc，请先安装 Rust 工具链: https://rustup.rs');
  console.log(`允许的页面来源: localhost${opts.origins.length ? `, ${opts.origins.join(', ')}` : ''}`);
  if (opts.origins.includes('*')) console.log('⚠ 已允许任意来源：任何网页都能让本机执行代码，只应在隔离的容器里这样用');
  console.log('在 RustLab 的「设置 → 运行环境」里选择"自定义运行器"并填入上面的地址即可。');
});
