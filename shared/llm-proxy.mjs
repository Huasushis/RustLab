// AI 助教的转发代理（Cloudflare Pages Function 与本地开发服务器共用）。
//
//   /api/llm/<host>/<path>   →   https://<host>/<path>
//
// 解决部分模型服务商不允许浏览器跨域访问的问题，也支持任何自定义的 OpenAI 兼容地址
// （自建的 one-api / new-api / LiteLLM 网关、各种中转服务……）。为了不被滥用成通用代理：
//   - 只接受来自本站页面的请求（校验 Origin）
//   - 只转发模型接口的路径：…/chat/completions、…/messages、…/models
//   - 只转发到公网域名（拒绝 IP 地址、localhost 和内网主机名），只走 HTTPS
//   - 站长可以设置环境变量 LLM_PROXY_HOSTS（逗号分隔）改为严格的白名单模式
//   - API Key 由浏览器随请求发来，代理不记录、不保存

const ALLOWED_PATH = /\/(chat\/completions|messages|models)$/;
const FORWARD_HEADERS = [
  'content-type',
  'accept',
  'authorization',
  'x-api-key',
  'api-key',
  'anthropic-version',
  'anthropic-beta',
  'http-referer',
  'x-title',
];
const RESPONSE_HEADERS = ['content-type', 'cache-control', 'request-id', 'x-request-id'];

function error(status, message) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/** 是否是可以转发的公网主机名（可带端口） */
export function isPublicHost(host) {
  const m = /^([a-z0-9.-]+)(?::(\d{1,5}))?$/i.exec(host);
  if (!m) return false; // 含方括号的 IPv6 等一律拒绝
  const name = m[1].toLowerCase();
  if (/^[\d.]+$/.test(name)) return false; // IPv4 字面量
  if (!name.includes('.')) return false; // localhost、单段内网主机名
  if (/\.(local|localhost|internal|intranet|lan|home|corp|test|invalid)$/.test(name)) return false;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(name);
}

/**
 * @param {Request} request   浏览器发来的请求
 * @param {string[]} segments  /api/llm/ 之后的路径片段，第一个是目标主机
 * @param {{ LLM_PROXY_HOSTS?: string }} env
 */
export async function proxyLlm(request, segments, env = {}) {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return error(403, 'This proxy only serves pages on this site.');
  if (request.method !== 'POST' && request.method !== 'GET') return error(405, 'Method not allowed');

  const [host, ...rest] = segments;
  if (!host || !isPublicHost(host)) return error(403, `Refusing to proxy to "${host ?? ''}": not a public host name.`);
  if (env.LLM_PROXY_HOSTS) {
    const allowed = env.LLM_PROXY_HOSTS.split(',').map((h) => h.trim().toLowerCase());
    if (!allowed.includes(host.toLowerCase())) {
      return error(403, `"${host}" is not in this site's LLM_PROXY_HOSTS allowlist.`);
    }
  }
  const path = '/' + rest.map(encodeURIComponent).join('/');
  if (!ALLOWED_PATH.test(path)) {
    return error(403, 'Only model API paths (…/chat/completions, …/messages, …/models) can be proxied.');
  }

  const headers = new Headers();
  for (const h of FORWARD_HEADERS) {
    const v = request.headers.get(h);
    if (v) headers.set(h, v);
  }
  let res;
  try {
    res = await fetch(`https://${host}${path}${url.search}`, {
      method: request.method,
      headers,
      body: request.method === 'POST' ? await request.arrayBuffer() : undefined,
      redirect: 'manual',
    });
  } catch (err) {
    return error(502, `Upstream request failed: ${err instanceof Error ? err.message : err}`);
  }

  // 原样把（可能是流式的）响应体传回浏览器
  const out = new Headers();
  for (const h of RESPONSE_HEADERS) {
    const v = res.headers.get(h);
    if (v) out.set(h, v);
  }
  return new Response(res.body, { status: res.status, headers: out });
}
